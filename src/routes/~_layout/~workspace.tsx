import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/workspace")({
	// Authentication is assumed for now. Add a beforeLoad guard here when
	// session resolution is available; it will cover the index, me, and $id routes.
	component: Outlet,
});
