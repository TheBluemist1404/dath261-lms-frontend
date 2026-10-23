import { createFileRoute } from "@tanstack/react-router";
import { ArchivedWorkspacesPage } from "@/features/workspace/components/archived-workspaces-page";

export const Route = createFileRoute("/_layout/workspace/archived")({
	component: ArchivedWorkspacesPage,
});
