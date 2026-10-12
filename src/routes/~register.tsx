import { createFileRoute } from "@tanstack/react-router";
import { Brand } from "@/components/layout/brand";
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
	const search = Route.useSearch();

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center bg-canvas p-4 text-ink sm:p-6">
			<div className="mb-6 flex items-center justify-center">
				<Brand />
			</div>
			<div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xs sm:p-8">
				<h1 className="mb-1 text-2xl font-bold tracking-tight">
					Create your account
				</h1>
				<p className="mb-6 text-sm text-muted">
					Join Nodus as a student or lecturer to get started.
				</p>
				<RegisterForm redirect={search.redirect} />
			</div>
		</div>
	);
}
