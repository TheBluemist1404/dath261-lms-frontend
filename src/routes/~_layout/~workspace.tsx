import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuth } from "@/features/auth/routing/guards";

export const Route = createFileRoute("/_layout/workspace")({
	beforeLoad: requireAuth,
	component: Outlet,
});
