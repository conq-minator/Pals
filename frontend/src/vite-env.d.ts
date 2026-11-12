/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLY_BASE_URL?: string;
  readonly VITE_GLY_WS_URL?: string;
  /** "true" = offline UI demo with made-up replies and payments. */
  readonly VITE_PALS_SIMULATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

