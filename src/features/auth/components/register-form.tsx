import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/errors";
import { EMAIL_REGEX } from "../constants";
import { useAuth } from "../hooks/use-auth";
import type { RegisterPayload } from "../types";
import { AuthBanner } from "./auth-banner";
import { AuthLayout } from "./auth-layout";
import { PasswordField } from "./password-field";
import { type RoleOption, RoleToggle } from "./role-toggle";

export interface RegisterFormProps {
	onSuccess?: (email: string) => void;
	className?: string;
}

export function RegisterForm({ onSuccess, className = "" }: RegisterFormProps) {
	const navigate = useNavigate();
	const { register } = useAuth();

	const [role, setRole] = useState<RoleOption>("STUDENT");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const [firstNameError, setFirstNameError] = useState<string | null>(null);
	const [lastNameError, setLastNameError] = useState<string | null>(null);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [bannerError, setBannerError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const validateClient = (): boolean => {
		let isValid = true;

		setFirstNameError(null);
		setLastNameError(null);
		setEmailError(null);
		setPasswordError(null);
		setBannerError(null);

		const trimmedFirstName = firstName.trim();
		if (!trimmedFirstName) {
			isValid = false;
			setFirstNameError("First name is required.");
		} else if (trimmedFirstName.length > 100) {
			isValid = false;
			setFirstNameError("First name cannot exceed 100 characters.");
		}

		const trimmedLastName = lastName.trim();
		if (!trimmedLastName) {
			isValid = false;
			setLastNameError("Last name is required.");
		} else if (trimmedLastName.length > 100) {
			isValid = false;
			setLastNameError("Last name cannot exceed 100 characters.");
		}

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
				firstName: firstName.trim(),
				lastName: lastName.trim(),
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
			const status = getApiErrorStatus(error);

			if (status === 409) {
				setBannerError("An account with this email already exists.");
			} else {
				setBannerError(
					getApiErrorMessage(
						error,
						"An unexpected error occurred during registration. Please try again.",
					),
				);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthLayout
			heroTitle="Your next idea starts here."
			heroSubtitle="Learn from official material. Connect it to your own notes. Build understanding together."
			title="Create your account"
			subtitle="Choose how you will use Nodus."
			className={className}
		>
			{bannerError && (
				<div className="mb-5">
					<AuthBanner
						variant="error"
						message={bannerError}
						onClose={() => setBannerError(null)}
					/>
				</div>
			)}

			<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
				<div>
					<span className="mb-1.5 block text-xs font-semibold text-muted">
						Account role
					</span>
					<RoleToggle value={role} onChange={setRole} disabled={isSubmitting} />
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="register-firstname"
							className="text-xs font-semibold text-ink"
						>
							First name
						</label>
						<input
							id="register-firstname"
							name="firstName"
							type="text"
							placeholder="Alex"
							autoComplete="given-name"
							value={firstName}
							onChange={(e) => {
								setFirstName(e.target.value);
								if (firstNameError) setFirstNameError(null);
							}}
							disabled={isSubmitting}
							aria-invalid={Boolean(firstNameError)}
							aria-describedby={
								firstNameError ? "register-firstname-error" : undefined
							}
							className={`h-11 w-full rounded-lg border px-3.5 text-sm text-ink placeholder:text-muted/60 transition-colors focus-visible:outline-2 ${
								firstNameError
									? "border-error focus-visible:outline-error"
									: "border-border focus-visible:outline-primary"
							}`}
						/>
						{firstNameError && (
							<p
								id="register-firstname-error"
								role="alert"
								className="text-xs text-error"
							>
								{firstNameError}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="register-lastname"
							className="text-xs font-semibold text-ink"
						>
							Last name
						</label>
						<input
							id="register-lastname"
							name="lastName"
							type="text"
							placeholder="Le"
							autoComplete="family-name"
							value={lastName}
							onChange={(e) => {
								setLastName(e.target.value);
								if (lastNameError) setLastNameError(null);
							}}
							disabled={isSubmitting}
							aria-invalid={Boolean(lastNameError)}
							aria-describedby={
								lastNameError ? "register-lastname-error" : undefined
							}
							className={`h-11 w-full rounded-lg border px-3.5 text-sm text-ink placeholder:text-muted/60 transition-colors focus-visible:outline-2 ${
								lastNameError
									? "border-error focus-visible:outline-error"
									: "border-border focus-visible:outline-primary"
							}`}
						/>
						{lastNameError && (
							<p
								id="register-lastname-error"
								role="alert"
								className="text-xs text-error"
							>
								{lastNameError}
							</p>
						)}
					</div>
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
						aria-describedby={emailError ? "register-email-error" : undefined}
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

				<PasswordField
					id="register-password"
					autoComplete="new-password"
					value={password}
					onChange={(e) => {
						setPassword(e.target.value);
						if (passwordError) setPasswordError(null);
					}}
					error={passwordError}
					hint="Must be 8 to 72 characters."
					disabled={isSubmitting}
				/>

				<div className="mt-2 flex flex-col gap-3">
					<Button
						type="submit"
						variant="primary"
						size="md"
						loading={isSubmitting}
						loadingText="Creating account..."
						className="w-full"
					>
						Create account
					</Button>

					<Link
						to="/login"
						className="flex h-11 w-full items-center justify-center rounded-lg border border-border bg-subtle px-4 text-sm font-semibold text-ink transition-colors hover:bg-border/60"
					>
						Already have an account? Log in
					</Link>
				</div>
			</form>
		</AuthLayout>
	);
}
