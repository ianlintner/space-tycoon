import type { SftTestAPI } from "../../src/testing/TestAPI.ts";

declare global {
  interface Window {
    /** Installed only on `?debug=1` builds by src/testing/index.ts. */
    __sft?: SftTestAPI;
  }
}

export {};
