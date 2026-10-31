import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { getAdminAccess } from "../access";

const deniedMessages = {
	unauthenticated: {
		title: "Sign in required",
		body: "Sign in with an administrator account to open Administration.",
	},
	forbidden: {
		title: "Access denied",
		body: "Administration is only available to administrators.",
	},
} as const;

export function AdminGuard({ children }: { children: ReactNode }) {
	const access = useAuthStore(getAdminAccess);

	if (access === "granted") return children;

	if (access === "pending") {
		return (
			<output className="block p-8 text-sm text-muted">
				Checking your session…
			</output>
		);
	}

	const message = deniedMessages[access];

	return (
		<main className="flex min-h-dvh items-center justify-center bg-canvas px-5 text-ink">
			<section className="max-w-md rounded-2xl bg-white p-8">
				<h1 className="font-heading text-2xl font-bold">{message.title}</h1>
				<p className="mt-2 text-muted">{message.body}</p>
			</section>
		</main>
	);
}
