import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import test from 'node:test';

test('plugin toggles and unload restores existing previews without touching vault contents', async () => {
  // The npm Obsidian package contains API types only. Supply the lifecycle API
  // here and bundle the real plugin so this test exercises its integration.
  const mock = `
    export class Events {
      callbacks = new Map();
      on(name, callback) {
        const entries = this.callbacks.get(name) ?? new Set();
        entries.add(callback); this.callbacks.set(name, entries);
        return { off: () => entries.delete(callback) };
      }
      trigger(name, ...data) { for (const fn of this.callbacks.get(name) ?? []) fn(...data); }
    }
    export class MarkdownRenderChild {
      constructor(element) { this.containerEl = element; }
      registerEvent(ref) { this.ref = ref; }
    }
    export class MarkdownView {}
    export class Notice {}
    export class Plugin {
      commands = [];
      saved = null;
      app = {
        workspace: {
          updateOptions() {}, onLayoutReady(fn) { fn(); }, iterateAllLeaves() {}
        },
        vault: new Proxy({}, { get() { throw new Error('Vault access is forbidden'); } })
      };
      async loadData() { return null; }
      async saveData(value) { this.saved = structuredClone(value); }
      registerEditorExtension(value) { this.extensionsForTest = value; }
      registerMarkdownPostProcessor(value) { this.processorForTest = value; }
      addCommand(value) { this.commands.push(value); }
      addRibbonIcon() {}
      addStatusBarItem() { return { setText() {} }; }
    }
  `;
  const bundle = await build({
    entryPoints: ['src/main.ts'], bundle: true, write: false, platform: 'node', format: 'esm',
    plugins: [{ name: 'obsidian-runtime', setup(builder) {
      builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: mock }));
    } }],
  });
  const { default: SecretMask } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
  const dom = new JSDOM('<p>api_key=synthetic-value</p>');
  dom.window.Node.prototype.instanceOf = function (type) { return this instanceof this.ownerDocument.defaultView[type.name]; };
  const previousText = globalThis.Text;
  globalThis.Text = dom.window.Text;
  try {
    const plugin = new SecretMask();
    await plugin.onload();
    assert.equal(plugin.extensionsForTest.length, 1);
    const element = dom.window.document.querySelector('p');
    let child;
    plugin.processorForTest(element, { addChild(component) { child = component; child.onload(); } });
    assert.equal(element.textContent, 'api_key=****');
    await plugin.commands[0].callback();
    assert.deepEqual(plugin.saved, { enabled: false });
    assert.equal(plugin.extensionsForTest.length, 0);
    assert.equal(element.textContent, 'api_key=synthetic-value');
    await plugin.commands[0].callback();
    assert.equal(element.textContent, 'api_key=****');
    plugin.onunload();
    assert.equal(element.textContent, 'api_key=synthetic-value');
    child.onunload();
    child.ref.off();
  } finally {
    globalThis.Text = previousText;
    dom.window.close();
  }
});
