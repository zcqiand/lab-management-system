/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_OFFLINE: string
  readonly VITE_MOCK_JWT_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
