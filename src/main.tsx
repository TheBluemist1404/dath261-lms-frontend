import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { setDefaultCollaborationAdapter } from "@/features/workspace/collaboration/collaboration";
import { setDiscussionChannel } from "@/features/workspace/collaboration/discussion-channel";
import {
	hocuspocusAdapter,
	hocuspocusDiscussionChannel,
} from "@/features/workspace/collaboration/hocuspocus-adapter";
import { restoreSession } from "@/lib/auth/session";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { queryClient } from "@/lib/query/client";
import { router } from "@/router";

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element #app was not found");
}

async function startApiMocking() {
	if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKING !== "true") {
		// Shared pages sync through the backend; mocks keep a local document.
		setDefaultCollaborationAdapter(hocuspocusAdapter);
		setDiscussionChannel(hocuspocusDiscussionChannel);
		return;
	}
	const { enableApiMocking } = await import("@/mocks/enable-api-mocking");
	await enableApiMocking();
}

installAuthInterceptors();

const root = ReactDOM.createRoot(rootElement);

startApiMocking()
	.then(restoreSession)
	.finally(() => {
		root.render(
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>,
		);
	});
