import { StateField, type EditorState } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import { findSecrets } from './detector.ts';

class SecretWidget extends WidgetType {
  eq(): boolean { return true; }

  toDOM(view: EditorView): HTMLElement {
    const info = { text: '****', cls: 'secret-mask-value', attr: { 'aria-label': 'Masked secret' } };
    return view.dom.ownerDocument.defaultView?.createSpan(info) ?? createSpan(info);
  }

  ignoreEvent(): boolean { return true; }
}

function decorate(state: EditorState): DecorationSet {
  return Decoration.set(findSecrets(state.doc.toString()).map(range =>
    Decoration.replace({ widget: new SecretWidget() }).range(range.from, range.to),
  ));
}

// A StateField can replace multiline private-key blocks. ViewPlugin decorations
// cannot replace line breaks. No transaction ever changes the document.
export const secretMaskField = StateField.define<DecorationSet>({
  create: decorate,
  update: (decorations, transaction) => transaction.docChanged ? decorate(transaction.state) : decorations,
  provide: field => EditorView.decorations.from(field),
});
