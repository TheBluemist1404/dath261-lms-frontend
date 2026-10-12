import { createFileRoute } from "@tanstack/react-router";
import { Brand } from "@/components/layout/brand";
import { LoginForm } from "@/features/auth/components/login-form";
import { requireGuest } from "@/features/auth/routing/guards";

export const Route = createFileRoute("/login")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	beforeLoad: ({ context, search }) => {
		requireGuest({ context, search });
	},
	component: LoginComponent,
});

function LoginComponent() {
	const search = Route.useSearch();

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center bg-canvas p-4 text-ink sm:p-6">
			<div className="mb-6 flex items-center justify-center">
				<Brand />
			</div>
			<div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xs sm:p-8">
				<h1 className="mb-1 text-2xl font-bold tracking-tight">
					Sign in to Nodus
				</h1>
				<p className="mb-6 text-sm text-muted">
					Enter your credentials to access your courses and workspace.
				</p>
				<LoginForm redirect={search.redirect} />
			</div>
		</div>
	);
}
