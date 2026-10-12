export type RegisterRole = "student" | "lecturer";

export interface RoleToggleProps {
	value: RegisterRole;
	onChange: (role: RegisterRole) => void;
	disabled?: boolean;
}

export function RoleToggle({
	value,
	onChange,
	disabled = false,
}: RoleToggleProps) {
	return (
		<fieldset className="m-0 flex flex-col gap-1.5 border-none p-0">
			<legend className="text-xs font-semibold uppercase tracking-wider text-muted">
				Account Role
			</legend>
			<div className="grid grid-cols-2 rounded-xl border border-border bg-subtle p-1">
				<label
					className={`flex flex-col items-center justify-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
						value === "student"
							? "bg-white font-semibold text-primary shadow-xs"
							: "font-medium text-muted hover:text-ink"
					} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
				>
					<input
						type="radio"
						name="account-role"
						value="student"
						checked={value === "student"}
						disabled={disabled}
						onChange={() => onChange("student")}
						className="sr-only"
					/>
					<span>Student</span>
					<span className="text-xs font-normal text-muted">Learner</span>
				</label>
				<label
					className={`flex flex-col items-center justify-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
						value === "lecturer"
							? "bg-white font-semibold text-primary shadow-xs"
							: "font-medium text-muted hover:text-ink"
					} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
				>
					<input
						type="radio"
						name="account-role"
						value="lecturer"
						checked={value === "lecturer"}
						disabled={disabled}
						onChange={() => onChange("lecturer")}
						className="sr-only"
					/>
					<span>Lecturer</span>
					<span className="text-xs font-normal text-muted">Instructor</span>
				</label>
			</div>
		</fieldset>
	);
}
