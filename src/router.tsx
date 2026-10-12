import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { queryClient } from "@/lib/query/client";
import { routeTree } from "@/routeTree.gen";

export const router = createTanStackRouter({
	routeTree,
	context: {
		queryClient,
		auth: {
			user: null,
			isLoading: true,
			isAuthenticated: false,
		},
	},
	scrollRestoration: true,
	defaultPreload: "intent",
	defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
