import { Link, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { type FormEvent, useState } from "react";
import {
	type RegisterRole,
	RoleToggle,
} from "@/features/auth/components/role-toggle";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { sanitizeRedirect } from "@/features/auth/routing/guards";

export interface RegisterFormProps {
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

export function RegisterForm({ redirect, onSuccess }: RegisterFormProps) {
	const navigate = useNavigate();
	const { register } = useAuth();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<RegisterRole>("student");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const trimmedName = name.trim();
		const trimmedEmail = email.trim();

		if (!trimmedName || !trimmedEmail || !password) {
			setError("Please fill in all required fields.");
			return;
		}

		if (password.length < 6) {
			setError("Password must be at least 6 characters long.");
			return;
		}

		setIsSubmitting(true);
		try {
			await register({
				name: trimmedName,
				email: trimmedEmail,
				password,
				role,
			});
			if (onSuccess) {
				onSuccess();
			} else {
				const target = sanitizeRedirect(redirect, "/");
				await navigate({ to: target as string });
			}
		} catch (err) {
			setError(
				extractErrorMessage(err, "Failed to create account. Please try again."),
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

			<RoleToggle value={role} onChange={setRole} disabled={isSubmitting} />

			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="register-name"
					className="text-xs font-semibold uppercase tracking-wider text-muted"
				>
					Full Name
				</label>
				<input
					id="register-name"
					name="name"
					type="text"
					autoComplete="name"
					required
					disabled={isSubmitting}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Alex Morgan"
					className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-subtle disabled:text-muted"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="register-email"
					className="text-xs font-semibold uppercase tracking-wider text-muted"
				>
					Email Address
				</label>
				<input
					id="register-email"
					name="email"
					type="email"
					autoComplete="email"
					required
					disabled={isSubmitting}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="alex@example.com"
					className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-subtle disabled:text-muted"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="register-password"
					className="text-xs font-semibold uppercase tracking-wider text-muted"
				>
					Password
				</label>
				<input
					id="register-password"
					name="password"
					type="password"
					autoComplete="new-password"
					required
					disabled={isSubmitting}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="••••••••"
					className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-subtle disabled:text-muted"
				/>
				<span className="text-xs text-muted">
					Must be at least 6 characters.
				</span>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isSubmitting ? "Creating account..." : "Create account"}
			</button>

			<p className="text-center text-sm text-muted">
				Already have an account?{" "}
				<Link
					to="/login"
					search={redirect ? { redirect } : undefined}
					className="font-semibold text-primary hover:underline"
				>
					Sign in
				</Link>
			</p>
		</form>
	);
}
