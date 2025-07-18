/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_ANOTHER_VARIABLE: string;
  // Add all your other VITE_ prefixed environment variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}