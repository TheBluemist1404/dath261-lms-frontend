import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewPage } from "@/features/admin/components/admin-overview-page";

export const Route = createFileRoute("/_layout/admin/")({
	component: AdminOverviewPage,
});
