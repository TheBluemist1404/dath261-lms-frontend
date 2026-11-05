import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "ghost"
	| "danger"
	| "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
	primary: "bg-primary text-white hover:bg-primary-hover",
	secondary: "border border-border bg-white text-ink hover:bg-subtle",
	outline: "border border-border bg-transparent text-ink hover:bg-subtle",
	ghost: "text-primary hover:bg-primary-subtle",
	danger: "bg-error text-white hover:opacity-90",
	"danger-ghost": "text-error hover:bg-error-subtle",
};

const sizes: Record<ButtonSize, string> = {
	sm: "min-h-9 px-3 py-1.5 text-xs",
	md: "min-h-11 px-4 py-3 text-sm",
	lg: "min-h-12 px-6 py-3.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	loadingText?: ReactNode;
}

export function Button({
	variant = "primary",
	size = "md",
	type = "button",
	loading = false,
	loadingText,
	disabled,
	className = "",
	children,
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			disabled={disabled || loading}
			aria-busy={loading ? "true" : undefined}
			className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
			{...props}
		>
			{loading ? (
				<>
					<span
						aria-hidden="true"
						className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
					/>
					{loadingText ?? children}
				</>
			) : (
				children
			)}
		</button>
	);
}
