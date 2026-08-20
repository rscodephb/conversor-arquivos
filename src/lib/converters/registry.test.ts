import { describe, expect, it } from "vitest";
import { listConversionTargets } from "@/lib/converters/registry";

describe("listConversionTargets", () => {
  it("returns empty when there is no source", () => {
    const actualOptions = listConversionTargets([]);
    expect(actualOptions).toEqual([]);
  });
  it("offers pdf png and jpg for mixed raster files", () => {
    const actualTargets = listConversionTargets(["png", "jpg", "webp"]).map((option) => option.target);
    const expectedTargets = ["pdf", "png", "jpg"];
    expect(actualTargets).toEqual(expectedTargets);
  });
  it("puts merge first when several pdfs are selected", () => {
    const actualOptions = listConversionTargets(["pdf", "pdf"]);
    expect(actualOptions[0]).toMatchObject({ target: "pdf", isMerge: true, label: "Unir PDFs" });
  });
  it("omits docx as a target when the source is already docx", () => {
    const actualTargets = listConversionTargets(["docx"]).map((option) => option.target);
    expect(actualTargets).not.toContain("docx");
    expect(actualTargets).toContain("pdf");
  });
  it("returns empty for mixed document kinds", () => {
    const actualOptions = listConversionTargets(["docx", "pdf"]);
    expect(actualOptions).toEqual([]);
  });
  it("offers xlsx from csv", () => {
    const actualTargets = listConversionTargets(["csv"]).map((option) => option.target);
    expect(actualTargets).toContain("xlsx");
    expect(actualTargets).toContain("pdf");
  });
});
