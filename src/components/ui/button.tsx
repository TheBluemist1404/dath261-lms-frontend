import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
	primary: "bg-primary text-white hover:bg-primary-hover",
	secondary: "border border-border bg-white text-ink hover:bg-subtle",
	ghost: "text-primary hover:bg-primary-subtle",
	danger: "bg-error text-white hover:opacity-90",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

export function Button({
	variant = "primary",
	type = "button",
	className = "",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
			{...props}
		/>
	);
}
