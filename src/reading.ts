import { findSecrets, maskSlice, maskText } from './detector.ts';

interface TextSnapshot { node: Text; text: string; offset: number }
interface AttributeSnapshot { element: Element; name: string; value: string }

/** Owns only rendered DOM. The caller restores it when the render child unloads. */
export class ReadingMask {
  private texts: TextSnapshot[] = [];
  private attributes: AttributeSnapshot[] = [];
  private source = '';

  constructor(element: HTMLElement) {
    const walker = element.ownerDocument.createTreeWalker(element, 4 /* SHOW_TEXT */);
    let previousBlock: Element | null = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      // nodeType works across popout windows and narrows via the DOM helper.
      if (!node.instanceOf(Text) || node.parentElement?.closest('script, style, textarea')) continue;
      const block = node.parentElement?.closest('p, pre, li, td, th, h1, h2, h3, h4, h5, h6, blockquote') ?? null;
      if (block !== previousBlock) this.source += '\n';
      previousBlock = block;
      this.texts.push({ node, text: node.data, offset: this.source.length });
      this.source += node.data;
    }
    const elements = [element, ...element.querySelectorAll('[href], [src], [title], [aria-label], [alt]')];
    for (const item of elements) {
      for (const name of ['href', 'src', 'title', 'aria-label', 'alt']) {
        const value = item.getAttribute(name);
        if (value !== null && findSecrets(value).length > 0) this.attributes.push({ element: item, name, value });
      }
    }
  }

  update(enabled: boolean): void {
    const ranges = enabled ? findSecrets(this.source) : [];
    for (const { node, text, offset } of this.texts) node.data = maskSlice(text, offset, ranges);
    for (const { element, name, value } of this.attributes) {
      // Suppress navigation/resource attributes rather than leave a secret in a tooltip.
      element.setAttribute(name, enabled ? (name === 'href' || name === 'src' ? '' : maskText(value)) : value);
    }
  }

  restore(): void { this.update(false); }
}
