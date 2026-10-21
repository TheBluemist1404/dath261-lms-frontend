import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewPlaceholder } from "@/features/admin/components/admin-overview-placeholder";

export const Route = createFileRoute("/admin/")({
	component: AdminOverviewPlaceholder,
});
