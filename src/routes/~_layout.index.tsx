import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/home/components/home-page";
import { redirectSignedInHome } from "@/features/home/role-home";

export const Route = createFileRoute("/_layout/")({
	beforeLoad: redirectSignedInHome,
	component: HomePage,
});
