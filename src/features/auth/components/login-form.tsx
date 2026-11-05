import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/errors";
import { EMAIL_REGEX } from "../constants";
import { useAuth } from "../hooks/use-auth";
import { sanitizeRedirect } from "../routing/guards";
import { AuthBanner } from "./auth-banner";
import { AuthLayout } from "./auth-layout";
import { PasswordField } from "./password-field";

export interface LoginFormProps {
	initialEmail?: string;
	registered?: boolean;
	redirect?: string;
	onSuccess?: () => void;
	className?: string;
}

export function LoginForm({
	initialEmail = "",
	registered = false,
	redirect = "/workspace",
	onSuccess,
	className = "",
}: LoginFormProps) {
	const navigate = useNavigate();
	const { login } = useAuth();

	const [email, setEmail] = useState(initialEmail);
	const [password, setPassword] = useState("");

	const [emailError, setEmailError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [bannerError, setBannerError] = useState<string | null>(null);
	const [isSuspended, setIsSuspended] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const validateClient = (): boolean => {
		let isValid = true;
		setEmailError(null);
		setPasswordError(null);
		setBannerError(null);

		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			isValid = false;
			setEmailError("Email is required.");
		} else if (!EMAIL_REGEX.test(trimmedEmail)) {
			isValid = false;
			setEmailError("Please enter a valid email address.");
		}

		if (!password) {
			isValid = false;
			setPasswordError("Password is required.");
		}

		return isValid;
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!validateClient() || isSubmitting) return;

		setIsSubmitting(true);
		setBannerError(null);
		setIsSuspended(false);

		try {
			await login({
				email: email.trim(),
				password,
			});

			if (onSuccess) {
				onSuccess();
			} else {
				const destination = sanitizeRedirect(redirect, "/workspace");
				await navigate({ to: destination });
			}
		} catch (error: unknown) {
			const status = getApiErrorStatus(error);

			if (status === 401) {
				setBannerError("Invalid email or password.");
			} else if (status === 403) {
				setIsSuspended(true);
				setBannerError("Your account has been suspended by an administrator.");
			} else {
				setBannerError(
					status && status < 500
						? getApiErrorMessage(
								error,
								"Unable to connect to login service. Please try again later.",
							)
						: "Unable to connect to login service. Please try again later.",
				);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthLayout
			heroTitle="Keep your ideas connected."
			heroSubtitle="Your personal notes, official materials, and peer discussions all in one place."
			title="Welcome back"
			subtitle="Continue learning and keep your ideas connected."
			className={className}
		>
			{registered && !bannerError && !isSuspended && (
				<div className="mb-5">
					<AuthBanner
						variant="success"
						message="Account created successfully. Please log in."
					/>
				</div>
			)}

			{bannerError && !isSuspended && (
				<div className="mb-5">
					<AuthBanner
						variant="error"
						message={bannerError}
						onClose={() => setBannerError(null)}
					/>
				</div>
			)}

			{isSuspended ? (
				<div className="flex flex-col gap-5">
					<AuthBanner
						variant="error"
						title="Account Suspended"
						message="Your account has been suspended by an administrator."
					/>
					<p className="text-sm text-muted">
						If you believe this is an error, please reach out to your
						administrator for assistance.
					</p>
					<Link
						to="/"
						className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
					>
						Return to catalog
					</Link>
				</div>
			) : (
				<form
					onSubmit={handleSubmit}
					noValidate
					className="flex flex-col gap-4"
				>
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="login-email"
							className="text-xs font-semibold text-ink"
						>
							Email
						</label>
						<input
							id="login-email"
							name="email"
							type="email"
							placeholder="alex@example.com"
							autoComplete="email"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								if (emailError) setEmailError(null);
							}}
							disabled={isSubmitting}
							aria-invalid={Boolean(emailError)}
							aria-describedby={emailError ? "login-email-error" : undefined}
							className={`h-11 w-full rounded-lg border px-3.5 text-sm text-ink placeholder:text-muted/60 transition-colors focus-visible:outline-2 ${
								emailError
									? "border-error focus-visible:outline-error"
									: "border-border focus-visible:outline-primary"
							}`}
						/>
						{emailError && (
							<p
								id="login-email-error"
								role="alert"
								className="text-xs text-error"
							>
								{emailError}
							</p>
						)}
					</div>

					<PasswordField
						id="login-password"
						value={password}
						onChange={(e) => {
							setPassword(e.target.value);
							if (passwordError) setPasswordError(null);
						}}
						error={passwordError}
						disabled={isSubmitting}
						headerRight={
							<span className="text-xs text-muted">Forgot password?</span>
						}
					/>

					<div className="mt-2 flex flex-col gap-3">
						<Button
							type="submit"
							variant="primary"
							size="md"
							loading={isSubmitting}
							loadingText="Signing in..."
							className="w-full"
						>
							Log in
						</Button>

						<Link
							to="/register"
							className="flex h-11 w-full items-center justify-center rounded-lg border border-border bg-subtle px-4 text-sm font-semibold text-ink transition-colors hover:bg-border/60"
						>
							Create an account
						</Link>
					</div>
				</form>
			)}
		</AuthLayout>
	);
}
