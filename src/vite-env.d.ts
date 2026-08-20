/// <reference types="vite/client" />

declare module "mammoth" {
  interface MammothResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  interface MammothApi {
    convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<MammothResult>;
    extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<MammothResult>;
  }
  const mammoth: MammothApi;
  export default mammoth;
}
