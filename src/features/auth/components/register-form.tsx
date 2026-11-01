import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import type { RegisterPayload } from "../types";
import {
	NameValidationError,
	partitionFullName,
} from "../utils/name-partitioner";
import { AuthBanner } from "./auth-banner";
import { AuthHeader } from "./auth-header";
import { type RoleOption, RoleToggle } from "./role-toggle";

export interface RegisterFormProps {
	onSuccess?: (email: string) => void;
	className?: string;
}

export function RegisterForm({ onSuccess, className = "" }: RegisterFormProps) {
	const navigate = useNavigate();
	const { register } = useAuth();

	const [role, setRole] = useState<RoleOption>("STUDENT");
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const [nameError, setNameError] = useState<string | null>(null);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [bannerError, setBannerError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const validateClient = (): boolean => {
		let isValid = true;

		setNameError(null);
		setEmailError(null);
		setPasswordError(null);
		setBannerError(null);

		try {
			partitionFullName(fullName);
		} catch (error) {
			isValid = false;
			if (error instanceof NameValidationError) {
				setNameError(error.message);
			} else {
				setNameError("Please enter your full name (both first and last name).");
			}
		}

		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			isValid = false;
			setEmailError("Email is required.");
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
			isValid = false;
			setEmailError("Please enter a valid email address.");
		}

		if (!password) {
			isValid = false;
			setPasswordError("Password is required.");
		} else if (password.length < 8) {
			isValid = false;
			setPasswordError("Password must be at least 8 characters.");
		} else if (password.length > 72) {
			isValid = false;
			setPasswordError("Password cannot exceed 72 characters.");
		}

		return isValid;
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!validateClient() || isSubmitting) return;

		setIsSubmitting(true);
		setBannerError(null);

		try {
			const payload: RegisterPayload = {
				fullName: fullName.trim(),
				email: email.trim(),
				password,
				role,
			};

			await register(payload);

			if (onSuccess) {
				onSuccess(email.trim());
			} else {
				await navigate({
					to: "/login",
					search: {
						email: email.trim(),
						registered: true,
					},
				});
			}
		} catch (error: unknown) {
			const axiosError = error as {
				response?: {
					status?: number;
					data?: {
						message?: string | string[];
						error?: string;
					};
				};
			};

			const status = axiosError.response?.status;
			const data = axiosError.response?.data;

			if (status === 409) {
				setBannerError("An account with this email already exists.");
			} else if (data?.message) {
				if (Array.isArray(data.message)) {
					setBannerError(data.message.join(". "));
				} else {
					setBannerError(data.message);
				}
			} else {
				setBannerError(
					"An unexpected error occurred during registration. Please try again.",
				);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className={`flex min-h-dvh flex-col bg-canvas ${className}`}>
			<AuthHeader />
			<main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
				<div className="flex w-full max-w-5xl items-stretch justify-center gap-8 lg:gap-12">
					<div className="hidden lg:flex w-full max-w-[460px] flex-col justify-between rounded-2xl bg-primary-subtle p-10 text-ink">
						<div className="flex flex-col gap-8">
							<div className="flex size-12 items-center justify-center rounded-xl bg-primary text-white">
								<svg
									className="size-6"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<path d="M12 20h9" />
									<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
								</svg>
							</div>
							<div className="flex flex-col gap-4">
								<h2 className="font-heading text-3xl font-bold leading-tight text-ink lg:text-4xl">
									Your next idea starts here.
								</h2>
								<p className="text-base text-muted leading-relaxed">
									Learn from official material. Connect it to your own notes.
									Build understanding together.
								</p>
							</div>
						</div>
						<div className="pt-8">
							<span className="text-sm font-semibold text-primary">
								Private by default. Shared by choice.
							</span>
						</div>
					</div>

					<div className="w-full max-w-[480px] rounded-xl border border-border bg-white p-6 shadow-xs sm:p-8">
						<div className="mb-6 flex flex-col gap-1">
							<h1 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
								Create your account
							</h1>
							<p className="text-sm text-muted">
								Choose how you will use Learner LMS.
							</p>
						</div>

						{bannerError && (
							<div className="mb-5">
								<AuthBanner
									variant="error"
									message={bannerError}
									onClose={() => setBannerError(null)}
								/>
							</div>
						)}

						<form
							onSubmit={handleSubmit}
							noValidate
							className="flex flex-col gap-4"
						>
							<div>
								<span className="mb-1.5 block text-xs font-semibold text-muted">
									Account role
								</span>
								<RoleToggle
									value={role}
									onChange={setRole}
									disabled={isSubmitting}
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="register-fullname"
									className="text-xs font-semibold text-ink"
								>
									Full name
								</label>
								<input
									id="register-fullname"
									name="fullName"
									type="text"
									placeholder="Alex Le"
									autoComplete="name"
									value={fullName}
									onChange={(e) => {
										setFullName(e.target.value);
										if (nameError) setNameError(null);
									}}
									disabled={isSubmitting}
									aria-invalid={Boolean(nameError)}
									aria-describedby={
										nameError ? "register-fullname-error" : undefined
									}
									className={`h-11 w-full rounded-lg border px-3.5 text-sm text-ink placeholder:text-muted/60 transition-colors focus-visible:outline-2 ${
										nameError
											? "border-error focus-visible:outline-error"
											: "border-border focus-visible:outline-primary"
									}`}
								/>
								{nameError && (
									<p
										id="register-fullname-error"
										role="alert"
										className="text-xs text-error"
									>
										{nameError}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="register-email"
									className="text-xs font-semibold text-ink"
								>
									Email
								</label>
								<input
									id="register-email"
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
									aria-describedby={
										emailError ? "register-email-error" : undefined
									}
									className={`h-11 w-full rounded-lg border px-3.5 text-sm text-ink placeholder:text-muted/60 transition-colors focus-visible:outline-2 ${
										emailError
											? "border-error focus-visible:outline-error"
											: "border-border focus-visible:outline-primary"
									}`}
								/>
								{emailError && (
									<p
										id="register-email-error"
										role="alert"
										className="text-xs text-error"
									>
										{emailError}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="register-password"
									className="text-xs font-semibold text-ink"
								>
									Password
								</label>
								<div className="relative">
									<input
										id="register-password"
										name="password"
										type={showPassword ? "text" : "password"}
										placeholder="••••••••"
										autoComplete="new-password"
										value={password}
										onChange={(e) => {
											setPassword(e.target.value);
											if (passwordError) setPasswordError(null);
										}}
										disabled={isSubmitting}
										aria-invalid={Boolean(passwordError)}
										aria-describedby={
											passwordError ? "register-password-error" : undefined
										}
										className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-ink placeholder:text-muted/60 transition-colors focus-visible:outline-2 ${
											passwordError
												? "border-error focus-visible:outline-error"
												: "border-border focus-visible:outline-primary"
										}`}
									/>
									<button
										type="button"
										onClick={() => setShowPassword((prev) => !prev)}
										aria-label={
											showPassword ? "Hide password" : "Show password"
										}
										aria-pressed={showPassword}
										className="absolute right-1 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-md text-muted hover:text-ink focus-visible:outline-2"
									>
										{showPassword ? (
											<svg
												className="size-5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												aria-hidden="true"
											>
												<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
												<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
												<path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
												<line x1="2" y1="2" x2="22" y2="22" />
											</svg>
										) : (
											<svg
												className="size-5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												aria-hidden="true"
											>
												<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
												<circle cx="12" cy="12" r="3" />
											</svg>
										)}
									</button>
								</div>
								{passwordError ? (
									<p
										id="register-password-error"
										role="alert"
										className="text-xs text-error"
									>
										{passwordError}
									</p>
								) : (
									<p className="text-xs text-muted">
										Must be 8 to 72 characters.
									</p>
								)}
							</div>

							<div className="mt-2 flex flex-col gap-3">
								<button
									type="submit"
									disabled={isSubmitting}
									className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isSubmitting ? (
										<span className="flex items-center gap-2">
											<svg
												className="size-4 animate-spin"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												aria-hidden="true"
											>
												<circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
												<path d="M12 2a10 10 0 0 1 10 10" />
											</svg>
											<span>Creating account...</span>
										</span>
									) : (
										"Create account"
									)}
								</button>

								<Link
									to="/login"
									className="flex h-11 w-full items-center justify-center rounded-lg border border-border bg-subtle px-4 text-sm font-semibold text-ink transition-colors hover:bg-border/60"
								>
									Already have an account? Log in
								</Link>
							</div>
						</form>
					</div>
				</div>
			</main>
		</div>
	);
}
