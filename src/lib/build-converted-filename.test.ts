import { describe, expect, it } from "vitest";
import { buildConvertedFilename } from "@/lib/build-converted-filename";

describe("buildConvertedFilename", () => {
  it("uses the fallback stem when the stem is blank", () => {
    const actualName = buildConvertedFilename({
      stem: "   ",
      fallback: "relatorio.docx",
      extension: "pdf",
    });
    const expectedName = "relatorio.pdf";
    expect(actualName).toBe(expectedName);
  });
  it("strips a duplicated extension from the stem", () => {
    const actualName = buildConvertedFilename({
      stem: "contrato.pdf",
      fallback: "contrato.docx",
      extension: "pdf",
    });
    const expectedName = "contrato.pdf";
    expect(actualName).toBe(expectedName);
  });
  it("replaces invalid filename characters", () => {
    const actualName = buildConvertedFilename({
      stem: 'a<b>:"c',
      fallback: "arquivo.txt",
      extension: "txt",
    });
    const expectedName = "a b c.txt";
    expect(actualName).toBe(expectedName);
  });
  it("falls back to convertido when sanitizing leaves nothing", () => {
    const actualName = buildConvertedFilename({
      stem: "...",
      fallback: "...",
      extension: "pdf",
    });
    const expectedName = "convertido.pdf";
    expect(actualName).toBe(expectedName);
  });
});
