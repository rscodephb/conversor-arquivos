import { describe, expect, it } from "vitest";
import { mergeIncomingFiles } from "@/lib/merge-incoming-files";

function inputFile(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name);
}

describe("mergeIncomingFiles", () => {
  it("keeps several odt files in one batch", () => {
    const actualFiles = mergeIncomingFiles({
      currentFiles: [],
      incomingFiles: [inputFile("a.odt"), inputFile("b.odt")],
    });
    const actualNames = actualFiles.map((file) => file.name);
    expect(actualNames).toEqual(["a.odt", "b.odt"]);
  });
  it("appends more images to an existing raster batch", () => {
    const actualFiles = mergeIncomingFiles({
      currentFiles: [inputFile("a.png")],
      incomingFiles: [inputFile("b.jpg")],
    });
    const actualNames = actualFiles.map((file) => file.name);
    expect(actualNames).toEqual(["a.png", "b.jpg"]);
  });
  it("replaces a document when a different kind arrives", () => {
    const actualFiles = mergeIncomingFiles({
      currentFiles: [inputFile("a.odt")],
      incomingFiles: [inputFile("b.docx")],
    });
    const actualNames = actualFiles.map((file) => file.name);
    expect(actualNames).toEqual(["b.docx"]);
  });
  it("keeps only the last file when the drop mixes kinds", () => {
    const actualFiles = mergeIncomingFiles({
      currentFiles: [],
      incomingFiles: [inputFile("a.odt"), inputFile("b.pdf")],
    });
    const actualNames = actualFiles.map((file) => file.name);
    expect(actualNames).toEqual(["b.pdf"]);
  });
});
