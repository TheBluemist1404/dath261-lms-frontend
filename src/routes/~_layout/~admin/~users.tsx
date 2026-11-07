import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/features/admin/components/users-page";

export const Route = createFileRoute("/_layout/admin/users")({
	component: UsersPage,
});
