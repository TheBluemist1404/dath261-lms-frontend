import { useId, useRef } from "react";

export type RoleOption = "STUDENT" | "LECTURER";

export interface RoleToggleProps {
	value: RoleOption | "student" | "lecturer";
	onChange: (role: RoleOption) => void;
	disabled?: boolean;
	className?: string;
}

const ROLE_HINTS: Record<RoleOption, string> = {
	STUDENT: "Students enroll, learn and build personal knowledge.",
	LECTURER: "Lecturers create courses and manage learning.",
};

export function RoleToggle({
	value,
	onChange,
	disabled = false,
	className = "",
}: RoleToggleProps) {
	const baseId = useId();
	const studentTabRef = useRef<HTMLButtonElement>(null);
	const lecturerTabRef = useRef<HTMLButtonElement>(null);

	const normalizedValue: RoleOption =
		String(value).toUpperCase() === "LECTURER" ? "LECTURER" : "STUDENT";

	const studentTabId = `${baseId}-tab-student`;
	const lecturerTabId = `${baseId}-tab-lecturer`;
	const hintId = `${baseId}-role-hint`;

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;

		if (event.key === "ArrowRight" || event.key === "ArrowDown") {
			event.preventDefault();
			onChange("LECTURER");
			lecturerTabRef.current?.focus();
		} else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
			event.preventDefault();
			onChange("STUDENT");
			studentTabRef.current?.focus();
		} else if (event.key === "Home") {
			event.preventDefault();
			onChange("STUDENT");
			studentTabRef.current?.focus();
		} else if (event.key === "End") {
			event.preventDefault();
			onChange("LECTURER");
			lecturerTabRef.current?.focus();
		}
	};

	return (
		<div className={`flex flex-col gap-2 ${className}`}>
			<div
				role="tablist"
				aria-label="Account role"
				onKeyDown={handleKeyDown}
				className="flex h-11 w-full items-center rounded-lg bg-subtle p-1"
			>
				<button
					ref={studentTabRef}
					type="button"
					role="tab"
					id={studentTabId}
					aria-selected={normalizedValue === "STUDENT"}
					aria-controls={hintId}
					tabIndex={normalizedValue === "STUDENT" ? 0 : -1}
					disabled={disabled}
					onClick={() => onChange("STUDENT")}
					className={`flex h-full flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
						normalizedValue === "STUDENT"
							? "bg-primary-subtle text-primary shadow-xs"
							: "bg-transparent text-muted hover:text-ink"
					}`}
				>
					Student
				</button>
				<button
					ref={lecturerTabRef}
					type="button"
					role="tab"
					id={lecturerTabId}
					aria-selected={normalizedValue === "LECTURER"}
					aria-controls={hintId}
					tabIndex={normalizedValue === "LECTURER" ? 0 : -1}
					disabled={disabled}
					onClick={() => onChange("LECTURER")}
					className={`flex h-full flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
						normalizedValue === "LECTURER"
							? "bg-primary-subtle text-primary shadow-xs"
							: "bg-transparent text-muted hover:text-ink"
					}`}
				>
					Lecturer
				</button>
			</div>
			<p id={hintId} className="text-xs text-muted" aria-live="polite">
				{ROLE_HINTS[normalizedValue]}
			</p>
		</div>
	);
}
