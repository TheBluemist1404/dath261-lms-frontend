import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/admin/components/reports-page";

export const Route = createFileRoute("/_layout/admin/reports/")({
	component: ReportsPage,
});
