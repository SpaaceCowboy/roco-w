import assert from "node:assert/strict";
import test from "node:test";
import type { Editor } from "@tiptap/core";
import { Schema } from "@tiptap/pm/model";
import { EditorState, NodeSelection, type Transaction } from "@tiptap/pm/state";
import { trackImageUploadTarget } from "./image-upload-target";

test("image upload tracks edits and never replaces a neighboring image after deletion", () => {
  const schema = new Schema({ nodes: {
    doc: { content: "block*" }, text: { group: "inline" },
    paragraph: { group: "block", content: "text*" },
    image: { group: "block", atom: true, attrs: { mediaId: {} } },
  } });
  const doc = schema.node("doc", null, [schema.node("image", { mediaId: "A" }), schema.node("image", { mediaId: "B" })]);
  let state = EditorState.create({ doc, selection: NodeSelection.create(doc, 0) });
  let listener: ((event: { transaction: Transaction }) => void) | undefined;
  const editor = {
    get state() { return state; }, isDestroyed: false,
    on: (_event: string, callback: typeof listener) => { listener = callback; },
    off: () => { listener = undefined; },
  } as unknown as Editor;
  const apply = (transaction: Transaction) => {
    state = state.apply(transaction);
    listener?.({ transaction });
  };
  const target = trackImageUploadTarget(editor);
  assert.equal(target.resolve(), 0);
  apply(state.tr.insert(0, schema.node("paragraph", null, schema.text("before"))));
  assert.equal(target.resolve(), 8);
  apply(state.tr.delete(8, 9));
  assert.equal(state.doc.nodeAt(8)?.attrs.mediaId, "B");
  assert.equal(target.resolve(), null);
  target.dispose();
  assert.equal(listener, undefined);

  state = EditorState.create({ doc, selection: NodeSelection.create(doc, 0) });
  const editedTarget = trackImageUploadTarget(editor);
  apply(state.tr.setNodeMarkup(0, undefined, { mediaId: "C" }));
  assert.equal(editedTarget.resolve(), null);
  editedTarget.dispose();
});
