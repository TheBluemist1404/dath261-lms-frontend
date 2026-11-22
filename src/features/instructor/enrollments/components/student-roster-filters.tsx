import type { EnrollmentStatus } from "../types/instructor-enrollment.types";

export type RosterStatusFilter = "ALL" | EnrollmentStatus;

interface StudentRosterFiltersProps {
	search: string;
	status: RosterStatusFilter;
	onSearchChange: (value: string) => void;
	onStatusChange: (value: RosterStatusFilter) => void;
}

export function StudentRosterFilters({
	search,
	status,
	onSearchChange,
	onStatusChange,
}: StudentRosterFiltersProps) {
	return (
		<div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end">
			<label className="block flex-1">
				<span className="mb-1 block text-xs font-semibold text-muted">
					Search students
				</span>
				<input
					type="search"
					value={search}
					onChange={(event) => onSearchChange(event.target.value)}
					placeholder="Name or email…"
					aria-label="Search students"
					className="min-h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
				/>
			</label>

			<label className="block sm:w-48">
				<span className="mb-1 block text-xs font-semibold text-muted">
					Status
				</span>
				<select
					value={status}
					onChange={(event) =>
						onStatusChange(event.target.value as RosterStatusFilter)
					}
					aria-label="Student status"
					className="min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
				>
					<option value="ALL">All</option>
					<option value="ACTIVE">Active</option>
					<option value="COMPLETED">Completed</option>
					<option value="LEFT">Left</option>
				</select>
			</label>
		</div>
	);
}
