import type { ReactNode } from "react";

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
		error: "border-red-200 bg-red-50 text-red-900",
		success: "border-emerald-200 bg-emerald-50 text-emerald-900",
		warning: "border-amber-200 bg-amber-50 text-amber-900",
	}[variant];

	const iconStyles = {
		error: "text-red-700",
		success: "text-emerald-700",
		warning: "text-amber-700",
	}[variant];

	return (
		<div
			role={role}
			aria-live={isSuccess ? "polite" : "assertive"}
			className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${variantStyles} ${className}`}
		>
			<span className={`mt-0.5 shrink-0 ${iconStyles}`} aria-hidden="true">
				{variant === "error" && (
					<svg
						className="size-5"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
							clipRule="evenodd"
						/>
					</svg>
				)}
				{variant === "success" && (
					<svg
						className="size-5"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
							clipRule="evenodd"
						/>
					</svg>
				)}
				{variant === "warning" && (
					<svg
						className="size-5"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
							clipRule="evenodd"
						/>
					</svg>
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
					<svg
						className="size-4"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
					</svg>
				</button>
			)}
		</div>
	);
}
