import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

// Shared building blocks for the admin screens (Figma AD-02 to AD-05):
// main content gap 24, cards with radius 12 and a 1px border.

export const cardClass = "rounded-xl border border-border bg-white";

export function AdminPage({
	title,
	description,
	children,
}: {
	title: string;
	description: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-6 text-ink min-[1200px]:px-[88px]">
			<header>
				<h1 className="font-heading text-[32px] font-semibold leading-[42px]">
					{title}
				</h1>
				<p className="mt-3 text-sm text-muted">{description}</p>
			</header>
			{children}
		</section>
	);
}

export function AdminTabs<T extends string>({
	label,
	tabs,
	value,
	onChange,
}: {
	label: string;
	tabs: ReadonlyArray<{ label: string; value: T }>;
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<div className="flex flex-wrap gap-1" role="tablist" aria-label={label}>
			{tabs.map((tab) => (
				<button
					key={tab.value}
					type="button"
					role="tab"
					aria-selected={value === tab.value}
					onClick={() => onChange(tab.value)}
					className={`min-h-10 min-w-[136px] rounded-lg px-3 text-left text-sm font-semibold ${value === tab.value ? "bg-primary-subtle text-primary" : "text-ink hover:bg-subtle"}`}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}

export function SearchField({
	label,
	placeholder,
	value,
	onChange,
}: {
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="flex w-full max-w-[400px] flex-col gap-2">
			<span className="text-xs font-semibold">{label}</span>
			<input
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
			/>
		</label>
	);
}

export function EmptyState({ title, body }: { title: string; body: string }) {
	return (
		<div className={`${cardClass} flex flex-col gap-2 p-4 text-left`}>
			<span className="text-ink">
				<Icon name="book" />
			</span>
			<h2 className="text-xl leading-7">{title}</h2>
			<p className="text-sm text-muted">{body}</p>
		</div>
	);
}

export function LoadingState({ label }: { label: string }) {
	return (
		<output className={`${cardClass} block p-8 text-center text-sm text-muted`}>
			{label}
		</output>
	);
}

export function ErrorState({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<div className={`${cardClass} p-6`} role="alert">
			<p className="text-sm text-error">{message}</p>
			<button
				type="button"
				onClick={onRetry}
				className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-subtle"
			>
				Retry
			</button>
		</div>
	);
}

/** Coloured notice used for suspended, unavailable, dismissed and resolved states. */
export function Notice({
	tone,
	title,
	children,
}: {
	tone: "warning" | "info" | "success";
	title: string;
	children: ReactNode;
}) {
	const tones = {
		warning: "bg-amber-100 text-amber-900",
		info: "bg-blue-100 text-blue-800",
		success: "bg-green-100 text-green-900",
	} as const;
	return (
		<output className={`block rounded-lg px-3 py-2.5 ${tones[tone]}`}>
			<p className="text-xs font-semibold">{title}</p>
			<p className="mt-1 text-xs">{children}</p>
		</output>
	);
}

export function ActionButton({
	tone,
	className = "",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
	tone: "primary" | "danger" | "outline";
}) {
	const tones = {
		primary: "bg-primary text-white hover:bg-primary-hover",
		danger: "bg-error text-white hover:opacity-90",
		outline: "border border-border bg-white text-primary hover:bg-subtle",
	} as const;
	return (
		<button
			type="button"
			className={`inline-flex min-h-10 min-w-[160px] items-center justify-center rounded-lg px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
			{...props}
		/>
	);
}
