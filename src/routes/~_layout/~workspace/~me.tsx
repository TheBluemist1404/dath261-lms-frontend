import { createFileRoute } from "@tanstack/react-router";
import { PersonalWorkspaceRedirect } from "@/features/workspace/screens/personal-workspace-redirect";

export const Route = createFileRoute("/_layout/workspace/me")({
	component: PersonalWorkspaceRedirect,
});
