import { httpClient } from "@/lib/http/client";
import { createMockAdapter } from "./axios-adapter";
import { handlers } from "./handlers";

/** Development-only: serves the API contract from MSW handlers in the page. */
export async function enableApiMocking() {
	httpClient.defaults.adapter = createMockAdapter(handlers);

	// Remove the service worker an earlier version of this setup registered.
	const registrations =
		(await navigator.serviceWorker?.getRegistrations()) ?? [];
	await Promise.all(
		registrations
			.filter((registration) =>
				registration.active?.scriptURL.endsWith("/mockServiceWorker.js"),
			)
			.map((registration) => registration.unregister()),
	);

	console.info("[mocks] API mocking enabled; requests resolve in the page.");
}
