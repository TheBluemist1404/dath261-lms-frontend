import type { UserRole } from "@/stores/auth.store";

interface BrandProps {
	audience?: UserRole;
	compact?: boolean;
	className?: string;
}

const audienceLabels: Record<UserRole, string> = {
	student: "for Students",
	lecturer: "for Lecturers",
	admin: "Administration",
};

export function Brand({ audience, compact = false, className }: BrandProps) {
	const subtitle = audience ? audienceLabels[audience] : undefined;

	return (
		<span
			className={`inline-flex shrink-0 items-center gap-3 ${className ?? ""}`}
		>
			<svg
				aria-hidden="true"
				focusable="false"
				viewBox="0 0 40 40"
				className="size-10 shrink-0"
			>
				<rect width="40" height="40" rx="12" fill="#0F766E" />
				<path
					d="M12 28V12L28 28V12"
					fill="none"
					stroke="white"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<g fill="white">
					<circle cx="12" cy="12" r="2.5" />
					<circle cx="28" cy="28" r="2.5" />
				</g>
			</svg>
			<span className={compact ? "sr-only" : "flex flex-col gap-0.5"}>
				<span className="font-heading text-xl leading-6 font-bold tracking-tight text-primary">
					Nodus
				</span>
				{subtitle && (
					<span className="text-xs leading-4 font-medium text-muted">
						{subtitle}
					</span>
				)}
			</span>
		</span>
	);
}
