import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";
import { NotFoundPage } from "@/components/layout/not-found-page";
import type { AppRouterContext } from "@/router-context";

import "../styles.css";

export const Route = createRootRouteWithContext<AppRouterContext>()({
	component: RootComponent,
	notFoundComponent: NotFoundPage,
});

function RootComponent() {
	const [devtoolsReady, setDevtoolsReady] = useState(false);

	useEffect(() => {
		if (!import.meta.env.DEV) return;
		// Saved settings override the config prop. Repair only launcher placement
		// before mounting Devtools, retaining theme, hotkeys, and panel preferences.
		try {
			const key = "tanstack_devtools_settings";
			const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
			if (saved && typeof saved === "object" && !Array.isArray(saved)) {
				const settings = {
					...saved,
					triggerMode: "fixed",
					position: "bottom-right",
				};
				delete settings.triggerCoords;
				localStorage.setItem(key, JSON.stringify(settings));
			}
		} catch {
			// Devtools can still use the fixed config when storage is unavailable.
		}
		setDevtoolsReady(true);
	}, []);

	return (
		<>
			<Outlet />
			{import.meta.env.DEV && devtoolsReady && (
				<TanStackDevtools
					config={{ triggerMode: "fixed", position: "bottom-right" }}
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
