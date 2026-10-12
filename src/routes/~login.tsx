import { createFileRoute } from "@tanstack/react-router";
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
	return (
		<div className="flex min-h-dvh items-center justify-center bg-canvas p-4 text-ink">
			<div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
				<h1 className="text-2xl font-bold tracking-tight">Sign in to Nodus</h1>
			</div>
		</div>
	);
}
