/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLY_BASE_URL?: string;
  readonly VITE_GLY_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

