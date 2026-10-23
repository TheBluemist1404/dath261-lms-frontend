import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
			tsconfigPaths: true,
		},
		plugins: [
			devtools(),
			tailwindcss(),
			tanstackRouter({
				target: "react",
				autoCodeSplitting: true,
				routeFilePrefix: "~",
			}),
			viteReact(),
		],
		server: {
			// Same-origin /api keeps the backend's SameSite=Strict refresh cookie usable in development.
			proxy: {
				"/api": {
					target: env.VITE_API_PROXY_TARGET || "http://localhost:3001",
					changeOrigin: true,
					// Carries the collaboration WebSocket at /api/collab.
					ws: true,
				},
			},
		},
		test: {
			environment: "jsdom",
			setupFiles: ["./src/test/setup.ts"],
			css: true,
		},
	};
});
