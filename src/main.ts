import type { Extension } from '@codemirror/state';
import { Events, MarkdownRenderChild, MarkdownView, Notice, Plugin } from 'obsidian';
import { secretMaskField } from './editor.ts';
import { ReadingMask } from './reading.ts';

class MaskedReading extends MarkdownRenderChild {
  private mask: ReadingMask | null = null;

  constructor(element: HTMLElement, private readonly changes: Events, private readonly enabled: boolean) {
    super(element);
  }

  onload(): void {
    const mask = new ReadingMask(this.containerEl);
    this.mask = mask;
    mask.update(this.enabled);
    this.registerEvent(this.changes.on('change', enabled => {
      if (typeof enabled === 'boolean') mask.update(enabled);
    }));
  }

  onunload(): void {
    this.mask?.restore();
    this.mask = null;
  }
}

export default class SecretMask extends Plugin {
  settings = { enabled: true };
  private readonly extensions: Extension[] = [];
  private readonly changes = new Events();
  private status: HTMLElement | null = null;

  async onload(): Promise<void> {
    const stored: unknown = await this.loadData();
    if (stored && typeof stored === 'object' && 'enabled' in stored && typeof stored.enabled === 'boolean') {
      this.settings.enabled = stored.enabled;
    }
    if (this.settings.enabled) this.extensions.push(secretMaskField);
    this.registerEditorExtension(this.extensions);
    this.registerMarkdownPostProcessor((element, context) => {
      context.addChild(new MaskedReading(element, this.changes, this.settings.enabled));
    });
    this.addCommand({
      id: 'toggle-masking',
      name: 'Toggle masking',
      callback: () => this.toggle(),
    });
    this.addRibbonIcon('shield', 'Toggle secret masking', () => this.toggle());
    this.status = this.addStatusBarItem();
    this.updateStatus();
    this.app.workspace.onLayoutReady(() => {
      // Registration can run before layout readiness, when Obsidian skips
      // updating existing editors. Reconfigure restored notes once ready.
      this.app.workspace.updateOptions();
      this.app.workspace.iterateAllLeaves(leaf => {
        if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
      });
    });
  }

  onunload(): void {
    // Render children belong to the preview lifecycle and can outlive the plugin.
    // Restore them immediately without retaining the plugin in their callbacks.
    this.changes.trigger('change', false);
  }

  private async toggle(): Promise<void> {
    this.settings.enabled = !this.settings.enabled;
    this.extensions.length = 0;
    if (this.settings.enabled) this.extensions.push(secretMaskField);
    this.app.workspace.updateOptions();
    this.changes.trigger('change', this.settings.enabled);
    this.updateStatus();
    new Notice(this.settings.enabled ? 'Secret masking on' : 'Secret masking off. Detected secrets are visible.');
    await this.saveData(this.settings);
  }

  private updateStatus(): void {
    this.status?.setText(this.settings.enabled ? 'Secret masking: on' : 'Secret masking: off');
  }
}
