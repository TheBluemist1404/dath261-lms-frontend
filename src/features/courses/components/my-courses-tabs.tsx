import { Button } from "@/components/ui/button";
import type { LearnerCourseState } from "../types/enrollment.types";

export interface MyCoursesTabsProps {
	activeState: LearnerCourseState;
	onChange: (state: LearnerCourseState) => void;
	counts?: {
		IN_PROGRESS?: number;
		UNAVAILABLE?: number;
		COMPLETED?: number;
	};
}

export function MyCoursesTabs({
	activeState,
	onChange,
	counts,
}: MyCoursesTabsProps) {
	const tabs: Array<{ state: LearnerCourseState; label: string }> = [
		{ state: "IN_PROGRESS", label: "In Progress" },
		{ state: "UNAVAILABLE", label: "Unavailable" },
		{ state: "COMPLETED", label: "Completed" },
	];

	return (
		<div className="flex flex-wrap gap-2 border-b border-border pb-4">
			{tabs.map((tab) => {
				const isActive = activeState === tab.state;
				const count = counts?.[tab.state];
				return (
					<Button
						key={tab.state}
						variant={isActive ? "primary" : "outline"}
						size="sm"
						onClick={() => onChange(tab.state)}
						className="gap-2"
					>
						<span>{tab.label}</span>
						{typeof count === "number" ? (
							<span
								className={`rounded-full px-2 py-0.5 text-xs ${
									isActive ? "bg-white/20 text-white" : "bg-subtle text-muted"
								}`}
							>
								{count}
							</span>
						) : null}
					</Button>
				);
			})}
		</div>
	);
}
