import { type ChangeEvent, type ReactNode, useId, useState } from "react";
import { Icon } from "@/components/ui/icon";

export interface PasswordFieldProps {
	id?: string;
	name?: string;
	label?: string;
	value: string;
	onChange: (e: ChangeEvent<HTMLInputElement>) => void;
	error?: string | null;
	hint?: string;
	headerRight?: ReactNode;
	autoComplete?: "current-password" | "new-password" | string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function PasswordField({
	id: providedId,
	name = "password",
	label = "Password",
	value,
	onChange,
	error,
	hint,
	headerRight,
	autoComplete = "current-password",
	placeholder = "••••••••",
	disabled = false,
	className = "",
}: PasswordFieldProps) {
	const defaultId = useId();
	const inputId = providedId || defaultId;
	const errorId = `${inputId}-error`;
	const hintId = `${inputId}-hint`;

	const [showPassword, setShowPassword] = useState(false);

	const describedBy =
		[error ? errorId : undefined, hint && !error ? hintId : undefined]
			.filter(Boolean)
			.join(" ") || undefined;

	return (
		<div className={`flex flex-col gap-1.5 ${className}`}>
			<div className="flex items-center justify-between">
				<label htmlFor={inputId} className="text-xs font-semibold text-ink">
					{label}
				</label>
				{headerRight}
			</div>

			<div className="relative">
				<input
					id={inputId}
					name={name}
					type={showPassword ? "text" : "password"}
					placeholder={placeholder}
					autoComplete={autoComplete}
					value={value}
					onChange={onChange}
					disabled={disabled}
					aria-invalid={Boolean(error)}
					aria-describedby={describedBy}
					className={`h-11 w-full rounded-lg border px-3.5 pr-11 text-sm text-ink placeholder:text-muted/60 transition-colors focus-visible:outline-2 ${
						error
							? "border-error focus-visible:outline-error"
							: "border-border focus-visible:outline-primary"
					}`}
				/>
				<button
					type="button"
					onClick={() => setShowPassword((prev) => !prev)}
					aria-label={showPassword ? "Hide password" : "Show password"}
					aria-pressed={showPassword}
					disabled={disabled}
					className="absolute right-1 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-md text-muted hover:text-ink focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Icon name={showPassword ? "eyeOff" : "eye"} className="size-5" />
				</button>
			</div>

			{error ? (
				<p id={errorId} role="alert" className="text-xs text-error">
					{error}
				</p>
			) : hint ? (
				<p id={hintId} className="text-xs text-muted">
					{hint}
				</p>
			) : null}
		</div>
	);
}
