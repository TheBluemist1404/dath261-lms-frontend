import type {
	DeadlineResponseDto,
	MyCourseItemDto,
} from "@/features/courses/types/enrollment.types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type DashboardViewState =
	| { kind: "empty" }
	| {
			kind: "loaded";
			featuredCourse: MyCourseItemDto | null;
			inProgressCourses: MyCourseItemDto[];
			completedCourses: MyCourseItemDto[];
			unavailableCount: number;
	  };

export function resolveDashboardViewState(
	items: readonly MyCourseItemDto[],
): DashboardViewState {
	if (items.length === 0) {
		return { kind: "empty" };
	}

	const inProgressCourses: MyCourseItemDto[] = [];
	const completedCourses: MyCourseItemDto[] = [];
	let unavailableCount = 0;

	for (const item of items) {
		switch (item.state) {
			case "IN_PROGRESS":
				inProgressCourses.push(item);
				break;
			case "COMPLETED":
				completedCourses.push(item);
				break;
			case "UNAVAILABLE":
				unavailableCount += 1;
				break;
			default: {
				const _exhaustive: never = item.state;
				void _exhaustive;
				break;
			}
		}
	}

	return {
		kind: "loaded",
		featuredCourse: inProgressCourses[0] ?? null,
		inProgressCourses,
		completedCourses,
		unavailableCount,
	};
}

export function sortDeadlinesSoonestFirst(
	deadlines: readonly DeadlineResponseDto[],
): DeadlineResponseDto[] {
	return [...deadlines].sort((a, b) => {
		const timeA = Date.parse(a.deadline);
		const timeB = Date.parse(b.deadline);
		const invalidA = Number.isNaN(timeA);
		const invalidB = Number.isNaN(timeB);
		if (invalidA && invalidB) return 0;
		if (invalidA) return 1;
		if (invalidB) return -1;
		return timeA - timeB;
	});
}

export function formatDeadlineUrgency(
	deadlineIso: string,
	nowMs = Date.now(),
): string {
	const targetMs = Date.parse(deadlineIso);
	if (Number.isNaN(targetMs) || !Number.isFinite(nowMs)) {
		return "";
	}

	const diffMs = targetMs - nowMs;
	if (diffMs < HOUR_MS) {
		return "Due now";
	}

	if (diffMs < DAY_MS) {
		const hours = Math.round(diffMs / HOUR_MS);
		return hours >= 24 ? "Due tomorrow" : `Due in ${hours}h`;
	}

	const days = Math.round(diffMs / DAY_MS);
	return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}

export function getDashboardGreeting(
	name: string | null | undefined,
	now = new Date(),
): string {
	const firstName = name?.trim().split(/\s+/)[0];
	if (!firstName) {
		return "Welcome back.";
	}

	const hour = now.getHours();
	const salutation =
		hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

	return `${salutation}, ${firstName}.`;
}
