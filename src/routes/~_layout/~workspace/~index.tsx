import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceLandingPage } from "@/features/workspace/components/workspace-landing-page";

export const Route = createFileRoute("/_layout/workspace/")({
	component: WorkspaceLandingPage,
});
