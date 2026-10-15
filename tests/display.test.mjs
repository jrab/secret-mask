import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { JSDOM } from 'jsdom';
import { secretMaskField } from '../src/editor.ts';
import { ReadingMask } from '../src/reading.ts';
import { syntheticTokens } from './fixtures.mjs';

test('editor decorations mask full tokens and multiline keys without changing the note', () => {
  const secret = 'sk-' + 'x'.repeat(32);
  const source = `before ${secret}\n-----BEGIN PRIVATE KEY-----\nSYNTHETIC\n-----END PRIVATE KEY-----\nafter`;
  const state = EditorState.create({ doc: source, extensions: [secretMaskField] });
  const decorations = state.field(secretMaskField);
  const ranges = [];
  decorations.between(0, state.doc.length, (from, to) => ranges.push(source.slice(from, to)));
  assert.equal(ranges.length, 2);
  assert.equal(ranges[0], secret);
  assert.match(ranges[1], /SYNTHETIC/);
  assert.equal(state.doc.toString(), source);
  const changed = state.update({ changes: { from: 0, insert: 'api_key=synthetic\n' } }).state;
  assert.equal(changed.field(secretMaskField).size, 3);
  assert.equal(changed.doc.toString(), 'api_key=synthetic\n' + source);
});

test('reading view handles inline splits, code, attributes, toggling, and restoration', () => {
  const dom = new JSDOM('<main><p>jev_key=<strong>sje</strong>jej</p><pre></pre><a>Link</a></main>');
  const doc = dom.window.document;
  // Obsidian supplies this cross-window narrowing helper on Node.
  dom.window.Node.prototype.instanceOf = function (type) { return this instanceof this.ownerDocument.defaultView[type.name]; };
  const previousText = globalThis.Text;
  globalThis.Text = dom.window.Text;
  try {
    const element = doc.querySelector('main');
    const token = 'ghp_' + 'x'.repeat(36);
    element.querySelector('pre').textContent = [token, ...syntheticTokens].join('\n');
    element.querySelector('a').setAttribute('href', `https://example.invalid/?api_key=${token}`);
    element.querySelector('a').setAttribute('title', token);
    const before = element.innerHTML;
    const mask = new ReadingMask(element);
    mask.update(true);
    assert.equal(element.querySelector('p').textContent, 'jev_key=****');
    assert.equal(element.querySelector('pre').textContent, '****\n****\n****');
    assert.equal(element.querySelector('a').getAttribute('href'), '');
    assert.equal(element.querySelector('a').getAttribute('title'), '****');
    assert.ok(!element.outerHTML.includes(token));
    mask.update(false);
    assert.equal(element.innerHTML, before);
    mask.update(true);
    mask.restore();
    assert.equal(element.innerHTML, before);
  } finally {
    globalThis.Text = previousText;
    dom.window.close();
  }
});

test('editor DOM shows only stars while cursor movement and edits preserve the source', () => {
  const dom = new JSDOM('<main></main>', { pretendToBeVisual: true });
  const originals = Object.fromEntries(['window', 'document', 'MutationObserver'].map(name => [name, globalThis[name]]));
  for (const name of Object.keys(originals)) globalThis[name] = dom.window[name];
  dom.window.createSpan = info => {
    const span = dom.window.document.createElement('span');
    span.textContent = info.text;
    span.className = info.cls;
    for (const [name, value] of Object.entries(info.attr)) span.setAttribute(name, value);
    return span;
  };
  let view;
  try {
    const source = 'api_key=sk-' + 'x'.repeat(32);
    view = new EditorView({
      state: EditorState.create({ doc: source, extensions: [secretMaskField] }),
      parent: dom.window.document.querySelector('main'),
    });
    assert.equal(view.contentDOM.textContent, 'api_key=****');
    assert.ok(!view.dom.outerHTML.includes('x'.repeat(32)));
    view.dispatch({ selection: { anchor: 8, head: source.length } });
    assert.equal(view.contentDOM.textContent, 'api_key=****');
    assert.equal(view.state.doc.toString(), source);
    for (const [pasted, masked] of [
      ['jev_key=sjejej', 'jev_key=****'],
      ...syntheticTokens.map(token => [token, '****']),
    ]) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: pasted } });
      assert.equal(view.contentDOM.textContent, masked);
      assert.ok(!view.dom.outerHTML.includes(pasted));
      assert.equal(view.state.doc.toString(), pasted);
    }
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'ordinary note' } });
    assert.equal(view.contentDOM.textContent, 'ordinary note');
  } finally {
    view?.destroy();
    for (const [name, value] of Object.entries(originals)) globalThis[name] = value;
    dom.window.close();
  }
});
