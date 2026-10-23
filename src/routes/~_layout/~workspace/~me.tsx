import { createFileRoute } from "@tanstack/react-router";
import { PersonalWorkspaceRedirect } from "@/features/workspace/components/personal-workspace-redirect";

export const Route = createFileRoute("/_layout/workspace/me")({
	component: PersonalWorkspaceRedirect,
});
