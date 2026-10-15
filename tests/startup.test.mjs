import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import test from 'node:test';

async function loadPlugin() {
  const mock = `
    export class Events {
      on() { return {}; }
      trigger() {}
    }
    export class MarkdownRenderChild {}
    export class MarkdownView {
      refreshes = 0;
      previewMode = { rerender: () => this.refreshes++ };
    }
    export class Notice {}
    export class Plugin {
      commands = [];
      constructor(workspace, stored) {
        this.stored = stored;
        this.app = {
          workspace,
          vault: new Proxy({}, { get() { throw new Error('Vault access is forbidden'); } })
        };
      }
      async loadData() { return this.stored; }
      async saveData(value) { this.stored = structuredClone(value); }
      registerEditorExtension(value) {
        this.app.workspace.editorExtensions.push(value);
        this.app.workspace.updateOptions();
      }
      registerMarkdownPostProcessor() {}
      addCommand(value) { this.commands.push(value); }
      addRibbonIcon() {}
      addStatusBarItem() { return { setText() {} }; }
    }
  `;
  const bundle = await build({
    stdin: {
      contents: `
        export { default } from './src/main.ts';
        export { EditorState, Compartment } from '@codemirror/state';
        export { EditorView } from '@codemirror/view';
        export { MarkdownView } from 'obsidian';
      `,
      resolveDir: process.cwd(),
    },
    bundle: true, write: false, platform: 'node', format: 'esm',
    plugins: [{ name: 'obsidian-runtime', setup(builder) {
      builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: mock }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
}

test('startup masks editors restored before layout readiness, new editors, and later edits', async () => {
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
  const editors = [];
  try {
    const { default: SecretMask, EditorState, EditorView, Compartment, MarkdownView } = await loadPlugin();
    const extensions = new Compartment();
    const ready = [];
    const preview = new MarkdownView();
    // Obsidian queues startup callbacks and skips updateOptions before the
    // workspace is ready. Restored editors can already exist at registration.
    const workspace = {
      layoutReady: false,
      editorExtensions: [],
      updateOptions() {
        if (!this.layoutReady) return;
        for (const editor of editors) editor.dispatch({ effects: extensions.reconfigure([...this.editorExtensions]) });
      },
      onLayoutReady(callback) { ready.push(callback); },
      iterateAllLeaves(callback) { callback({ view: preview }); },
    };
    const source = 'api_key=synthetic-existing-note';
    const openEditor = () => {
      const editor = new EditorView({
        state: EditorState.create({ doc: source, extensions: extensions.of([...workspace.editorExtensions]) }),
        parent: dom.window.document.querySelector('main'),
      });
      editors.push(editor);
      return editor;
    };
    const restored = openEditor();
    const split = openEditor();
    const plugin = new SecretMask(workspace, null);
    await plugin.onload();
    const created = openEditor();
    assert.equal(created.contentDOM.textContent, 'api_key=****');
    workspace.layoutReady = true;
    for (const callback of ready) callback();
    for (const editor of [restored, split]) {
      assert.equal(editor.contentDOM.textContent, 'api_key=****', 'restored editors must receive the extension when layout becomes ready');
      assert.equal(editor.state.doc.toString(), source);
      editor.dispatch({ changes: { from: 0, to: source.length, insert: 'token=synthetic-edited-note' } });
      assert.equal(editor.contentDOM.textContent, 'token=****');
      assert.equal(editor.state.doc.toString(), 'token=synthetic-edited-note');
    }
    assert.equal(preview.refreshes, 1);
    await plugin.commands[0].callback();
    assert.equal(restored.contentDOM.textContent, 'token=synthetic-edited-note');
    await plugin.commands[0].callback();
    assert.equal(restored.contentDOM.textContent, 'token=****');
    plugin.onunload();
  } finally {
    for (const editor of editors) editor.destroy();
    for (const [name, value] of Object.entries(originals)) globalThis[name] = value;
    dom.window.close();
  }
});
