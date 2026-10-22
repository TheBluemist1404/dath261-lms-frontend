import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { restoreSession } from "@/lib/auth/session";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { queryClient } from "@/lib/query/client";
import { router } from "@/router";

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element #app was not found");
}

async function enableApiMocking() {
	if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKING !== "true") {
		return;
	}
	const { worker } = await import("@/mocks/browser");
	await worker.start({ onUnhandledRequest: "bypass" });
}

installAuthInterceptors();

const root = ReactDOM.createRoot(rootElement);

enableApiMocking()
	.then(restoreSession)
	.finally(() => {
		root.render(
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);
	});
