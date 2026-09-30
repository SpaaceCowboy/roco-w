import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";

/** Keep an asynchronous replacement attached to the original image, not its old offset. */
export function trackImageUploadTarget(editor: Editor) {
  let position: number | null = editor.state.selection.from;
  const original = editor.state.doc.nodeAt(position);
  const track = ({ transaction }: { transaction: Transaction }) => {
    if (position === null) return;
    const mapped = transaction.mapping.mapResult(position, 1);
    position = mapped.deleted ? null : mapped.pos;
  };
  editor.on("transaction", track);
  return {
    resolve: () => position !== null && original?.type.name === "image" && !editor.isDestroyed && editor.state.doc.nodeAt(position)?.eq(original)
      ? position : null,
    dispose: () => { editor.off("transaction", track); },
  };
}
