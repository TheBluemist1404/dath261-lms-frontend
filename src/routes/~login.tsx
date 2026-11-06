import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth/components/login-form";
import { requireGuest } from "@/features/auth/routing/guards";

export const Route = createFileRoute("/login")({
	validateSearch: (
		search: Record<string, unknown>,
	): { redirect?: string; email?: string; registered?: boolean } => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
		email: typeof search.email === "string" ? search.email : undefined,
		registered:
			search.registered === true || search.registered === "true"
				? true
				: undefined,
	}),
	beforeLoad: ({ context, search }) => {
		requireGuest({ context, search });
	},
	component: LoginComponent,
});

function LoginComponent() {
	const search = Route.useSearch();
	return (
		<LoginForm
			initialEmail={search.email}
			registered={search.registered}
			redirect={search.redirect}
		/>
	);
}
