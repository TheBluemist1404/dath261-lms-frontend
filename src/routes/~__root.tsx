import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { bootstrapSession } from "@/features/auth/session";
import type { AppRouterContext } from "@/router-context";

import "../styles.css";

export const Route = createRootRouteWithContext<AppRouterContext>()({
	beforeLoad: async () => {
		const auth = await bootstrapSession();
		return { auth };
	},
	component: RootComponent,
});

function RootComponent() {
	return (
		<>
			<Outlet />
			{import.meta.env.DEV && import.meta.env.MODE !== "test" && (
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "TanStack Query",
							render: <ReactQueryDevtoolsPanel />,
						},
						{
							name: "TanStack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
			)}
		</>
	);
}
