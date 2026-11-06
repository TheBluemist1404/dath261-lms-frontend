import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "@/features/auth/components/register-form";
import { requireGuest } from "@/features/auth/routing/guards";

export const Route = createFileRoute("/register")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	beforeLoad: ({ context, search }) => {
		requireGuest({ context, search });
	},
	component: RegisterComponent,
});

function RegisterComponent() {
	return <RegisterForm />;
}
