import { Link, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { sanitizeRedirect } from "@/features/auth/routing/guards";

export interface LoginFormProps {
	redirect?: string;
	onSuccess?: () => void;
}

function extractErrorMessage(error: unknown, fallback: string): string {
	if (axios.isAxiosError(error)) {
		const message = (error.response?.data as { message?: string } | undefined)
			?.message;
		if (typeof message === "string" && message.trim().length > 0) {
			return message;
		}
	}
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return fallback;
}

export function LoginForm({ redirect, onSuccess }: LoginFormProps) {
	const navigate = useNavigate();
	const { login } = useAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const trimmedEmail = email.trim();
		if (!trimmedEmail || !password) {
			setError("Please fill in both email and password.");
			return;
		}

		setIsSubmitting(true);
		try {
			await login({ email: trimmedEmail, password });
			if (onSuccess) {
				onSuccess();
			} else {
				const target = sanitizeRedirect(redirect, "/");
				await navigate({ to: target as string });
			}
		} catch (err) {
			setError(
				extractErrorMessage(err, "Failed to sign in. Please try again."),
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
			{error && (
				<div
					role="alert"
					className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-error"
				>
					{error}
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="login-email"
					className="text-xs font-semibold uppercase tracking-wider text-muted"
				>
					Email Address
				</label>
				<input
					id="login-email"
					name="email"
					type="email"
					autoComplete="email"
					required
					disabled={isSubmitting}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="student@example.com"
					className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-subtle disabled:text-muted"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="login-password"
					className="text-xs font-semibold uppercase tracking-wider text-muted"
				>
					Password
				</label>
				<input
					id="login-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					disabled={isSubmitting}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="••••••••"
					className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-subtle disabled:text-muted"
				/>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isSubmitting ? "Signing in..." : "Sign in"}
			</button>

			<p className="text-center text-sm text-muted">
				Don&apos;t have an account?{" "}
				<Link
					to="/register"
					search={redirect ? { redirect } : undefined}
					className="font-semibold text-primary hover:underline"
				>
					Sign up
				</Link>
			</p>
		</form>
	);
}
