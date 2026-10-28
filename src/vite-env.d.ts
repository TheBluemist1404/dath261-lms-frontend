/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_BASE_URL?: string;
	readonly VITE_API_MOCKING?: string;
	/** Collaboration WebSocket; defaults to <VITE_API_BASE_URL>/collab on this host. */
	readonly VITE_COLLAB_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
