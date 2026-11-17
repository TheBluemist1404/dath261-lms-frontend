import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export type BannerVariant = "error" | "success" | "warning";

export interface AuthBannerProps {
	variant?: BannerVariant;
	title?: string;
	message?: ReactNode;
	children?: ReactNode;
	action?: ReactNode;
	onClose?: () => void;
	className?: string;
}

export function AuthBanner({
	variant = "error",
	title,
	message,
	children,
	action,
	onClose,
	className = "",
}: AuthBannerProps) {
	const isSuccess = variant === "success";
	const role = isSuccess ? "status" : "alert";

	const variantStyles = {
		error: "border-error/20 bg-error-subtle text-error",
		success: "border-success/20 bg-success-subtle text-success",
		warning: "border-warning/20 bg-warning-subtle text-warning",
	}[variant];

	const iconStyles = {
		error: "text-error",
		success: "text-success",
		warning: "text-warning",
	}[variant];

	return (
		<div
			role={role}
			aria-live={isSuccess ? "polite" : "assertive"}
			className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${variantStyles} ${className}`}
		>
			<span className={`mt-0.5 shrink-0 ${iconStyles}`} aria-hidden="true">
				{variant === "error" && <Icon name="alertCircle" className="size-5" />}
				{variant === "success" && (
					<Icon name="checkCircle" className="size-5" />
				)}
				{variant === "warning" && (
					<Icon name="alertTriangle" className="size-5" />
				)}
			</span>

			<div className="flex-1 leading-normal">
				{title && <p className="font-semibold text-inherit">{title}</p>}
				{message && <div className="text-inherit">{message}</div>}
				{children}
				{action && <div className="mt-2">{action}</div>}
			</div>

			{onClose && (
				<button
					type="button"
					onClick={onClose}
					aria-label="Dismiss banner"
					className="shrink-0 rounded p-1 text-inherit opacity-70 hover:opacity-100 focus-visible:outline-2"
				>
					<Icon name="xMark" className="size-4" />
				</button>
			)}
		</div>
	);
}
