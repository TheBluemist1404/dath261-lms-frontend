import { describe, expect, it } from "vitest";
import type {
	DeadlineResponseDto,
	MyCourseItemDto,
	ResumePositionResponseDto,
} from "@/features/courses/types/enrollment.types";
import { buildCourseResumeSearch } from "@/features/courses/utils/resume-link";
import { formatDeadlineDateTime } from "@/lib/format/date";
import {
	formatDeadlineUrgency,
	getDashboardGreeting,
	resolveDashboardViewState,
	sortDeadlinesSoonestFirst,
} from "./dashboard-domain";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function makeCourseItem(
	overrides: Partial<MyCourseItemDto> & {
		courseId: string;
		state: MyCourseItemDto["state"];
	},
): MyCourseItemDto {
	const { courseId, state, ...rest } = overrides;
	return {
		enrollmentId: `enr-${courseId}`,
		courseId,
		status: state === "COMPLETED" ? "COMPLETED" : "ACTIVE",
		state,
		courseAvailable: state !== "UNAVAILABLE",
		canAccessCourse: state !== "UNAVAILABLE",
		course: {
			id: courseId,
			title: `Course ${courseId}`,
			status: state === "UNAVAILABLE" ? "DRAFT" : "PUBLISHED",
			isSuspended: false,
		},
		...rest,
	};
}

function makeDeadline(
	overrides: Partial<DeadlineResponseDto> & {
		blockId: string;
		deadline: string;
	},
): DeadlineResponseDto {
	const { blockId, deadline, ...rest } = overrides;
	return {
		courseId: "course-intro-cs",
		courseTitle: "Introduction to Computer Science",
		blockId,
		title: `Quiz ${blockId}`,
		deadline,
		allowLate: false,
		attemptsUsed: 0,
		maxAttempts: 3,
		...rest,
	};
}

describe("resolveDashboardViewState", () => {
	it("returns empty kind when the learner has no enrollments", () => {
		expect(resolveDashboardViewState([])).toEqual({ kind: "empty" });
	});

	it("categorizes mixed enrollment states and selects the first in-progress course as featured", () => {
		const inProgressFirst = makeCourseItem({
			courseId: "cs-101",
			state: "IN_PROGRESS",
		});
		const unavailable = makeCourseItem({
			courseId: "os-lab",
			state: "UNAVAILABLE",
		});
		const completed = makeCourseItem({
			courseId: "algo-201",
			state: "COMPLETED",
		});
		const inProgressSecond = makeCourseItem({
			courseId: "db-202",
			state: "IN_PROGRESS",
		});

		const state = resolveDashboardViewState([
			unavailable,
			inProgressFirst,
			completed,
			inProgressSecond,
		]);

		expect(state).toEqual({
			kind: "loaded",
			featuredCourse: inProgressFirst,
			inProgressCourses: [inProgressFirst, inProgressSecond],
			completedCourses: [completed],
			unavailableCount: 1,
		});
	});

	it("sets featuredCourse to null when only completed courses exist", () => {
		const completedA = makeCourseItem({
			courseId: "algo-1",
			state: "COMPLETED",
		});
		const completedB = makeCourseItem({
			courseId: "net-2",
			state: "COMPLETED",
		});

		expect(resolveDashboardViewState([completedA, completedB])).toEqual({
			kind: "loaded",
			featuredCourse: null,
			inProgressCourses: [],
			completedCourses: [completedA, completedB],
			unavailableCount: 0,
		});
	});

	it("sets featuredCourse to null and counts unavailable courses when only unavailable courses exist", () => {
		const unavailableA = makeCourseItem({
			courseId: "draft-1",
			state: "UNAVAILABLE",
		});
		const unavailableB = makeCourseItem({
			courseId: "draft-2",
			state: "UNAVAILABLE",
		});

		expect(resolveDashboardViewState([unavailableA, unavailableB])).toEqual({
			kind: "loaded",
			featuredCourse: null,
			inProgressCourses: [],
			completedCourses: [],
			unavailableCount: 2,
		});
	});
});

describe("sortDeadlinesSoonestFirst", () => {
	it("returns a new array sorted soonest-first without mutating the input", () => {
		const dLater = makeDeadline({
			blockId: "later",
			deadline: "2026-11-25T16:59:00.000Z",
		});
		const dEarliest = makeDeadline({
			blockId: "earliest",
			deadline: "2026-11-20T09:00:00.000+07:00",
		});
		const dMiddle = makeDeadline({
			blockId: "middle",
			deadline: "2026-11-21T12:00:00.000Z",
		});

		const input = [dLater, dEarliest, dMiddle];
		const sorted = sortDeadlinesSoonestFirst(input);

		expect(sorted).not.toBe(input);
		expect(sorted.map((item) => item.blockId)).toEqual([
			"earliest",
			"middle",
			"later",
		]);
		expect(input.map((item) => item.blockId)).toEqual([
			"later",
			"earliest",
			"middle",
		]);
	});

	it("places invalid deadline timestamps at the end while preserving their relative order", () => {
		const invalidFirst = makeDeadline({
			blockId: "invalid-1",
			deadline: "not-a-date",
		});
		const validLate = makeDeadline({
			blockId: "valid-late",
			deadline: "2026-11-24T10:00:00.000Z",
		});
		const invalidSecond = makeDeadline({
			blockId: "invalid-2",
			deadline: "",
		});
		const validSoon = makeDeadline({
			blockId: "valid-soon",
			deadline: "2026-11-20T10:00:00.000Z",
		});

		const sorted = sortDeadlinesSoonestFirst([
			invalidFirst,
			validLate,
			invalidSecond,
			validSoon,
		]);

		expect(sorted.map((item) => item.blockId)).toEqual([
			"valid-soon",
			"valid-late",
			"invalid-1",
			"invalid-2",
		]);
	});
});

describe("formatDeadlineUrgency", () => {
	const nowMs = Date.parse("2026-11-19T10:00:00.000Z");

	const isoAfter = (offsetMs: number) =>
		new Date(nowMs + offsetMs).toISOString();

	it("returns 'Due now' when overdue or less than 1 hour remains", () => {
		expect(formatDeadlineUrgency(isoAfter(-30 * 60 * 1000), nowMs)).toBe(
			"Due now",
		);
		expect(formatDeadlineUrgency(isoAfter(0), nowMs)).toBe("Due now");
		expect(formatDeadlineUrgency(isoAfter(59 * 60 * 1000), nowMs)).toBe(
			"Due now",
		);
	});

	it("formats whole and fractional hours below 24h", () => {
		expect(formatDeadlineUrgency(isoAfter(1 * HOUR_MS), nowMs)).toBe(
			"Due in 1h",
		);
		expect(
			formatDeadlineUrgency(isoAfter(5 * HOUR_MS + 20 * 60 * 1000), nowMs),
		).toBe("Due in 5h");
		expect(
			formatDeadlineUrgency(isoAfter(23 * HOUR_MS + 20 * 60 * 1000), nowMs),
		).toBe("Due in 23h");
	});

	it("promotes 23h45m and 1-day deadlines to 'Due tomorrow'", () => {
		expect(
			formatDeadlineUrgency(isoAfter(23 * HOUR_MS + 45 * 60 * 1000), nowMs),
		).toBe("Due tomorrow");
		expect(formatDeadlineUrgency(isoAfter(1 * DAY_MS), nowMs)).toBe(
			"Due tomorrow",
		);
		expect(formatDeadlineUrgency(isoAfter(30 * HOUR_MS), nowMs)).toBe(
			"Due tomorrow",
		);
	});

	it("rounds multi-day deadlines with slight jitter cleanly", () => {
		expect(
			formatDeadlineUrgency(isoAfter(2 * DAY_MS - 10 * 60 * 1000), nowMs),
		).toBe("Due in 2 days");
		expect(formatDeadlineUrgency(isoAfter(5 * DAY_MS), nowMs)).toBe(
			"Due in 5 days",
		);
		expect(formatDeadlineUrgency(isoAfter(14 * DAY_MS), nowMs)).toBe(
			"Due in 14 days",
		);
	});

	it("returns empty string for invalid ISO strings or non-finite nowMs", () => {
		expect(formatDeadlineUrgency("not-a-date", nowMs)).toBe("");
		expect(formatDeadlineUrgency("", nowMs)).toBe("");
		expect(formatDeadlineUrgency(isoAfter(DAY_MS), Number.NaN)).toBe("");
		expect(
			formatDeadlineUrgency(isoAfter(DAY_MS), Number.POSITIVE_INFINITY),
		).toBe("");
	});
});

describe("getDashboardGreeting", () => {
	const atLocalHour = (hour: number, minute = 0) =>
		new Date(2026, 10, 19, hour, minute, 0, 0);

	it("selects morning, afternoon, and evening salutations at hour boundaries", () => {
		expect(getDashboardGreeting("Alex", atLocalHour(0, 0))).toBe(
			"Good morning, Alex.",
		);
		expect(getDashboardGreeting("Alex", atLocalHour(11, 59))).toBe(
			"Good morning, Alex.",
		);
		expect(getDashboardGreeting("Alex", atLocalHour(12, 0))).toBe(
			"Good afternoon, Alex.",
		);
		expect(getDashboardGreeting("Alex", atLocalHour(17, 59))).toBe(
			"Good afternoon, Alex.",
		);
		expect(getDashboardGreeting("Alex", atLocalHour(18, 0))).toBe(
			"Good evening, Alex.",
		);
		expect(getDashboardGreeting("Alex", atLocalHour(23, 59))).toBe(
			"Good evening, Alex.",
		);
	});

	it("extracts only the trimmed first token from a full name", () => {
		expect(getDashboardGreeting("  Minh   Nguyen Van  ", atLocalHour(9))).toBe(
			"Good morning, Minh.",
		);
	});

	it("falls back to 'Welcome back.' when name is empty, whitespace, null, or undefined", () => {
		expect(getDashboardGreeting("", atLocalHour(9))).toBe("Welcome back.");
		expect(getDashboardGreeting("   \t\n ", atLocalHour(14))).toBe(
			"Welcome back.",
		);
		expect(getDashboardGreeting(null, atLocalHour(20))).toBe("Welcome back.");
		expect(getDashboardGreeting(undefined, atLocalHour(20))).toBe(
			"Welcome back.",
		);
	});
});

describe("formatDeadlineDateTime", () => {
	it("formats valid timestamps in ICT (UTC+7)", () => {
		expect(formatDeadlineDateTime("2026-10-06T16:59:00.000Z")).toBe(
			"Oct 06 · 23:59 ICT",
		);
		expect(formatDeadlineDateTime("2026-10-06T17:05:00.000Z")).toBe(
			"Oct 07 · 00:05 ICT",
		);
	});

	it("returns an em dash for invalid timestamps", () => {
		expect(formatDeadlineDateTime("invalid-date")).toBe("—");
		expect(formatDeadlineDateTime("")).toBe("—");
	});
});

describe("buildCourseResumeSearch", () => {
	const baseBlock: NonNullable<ResumePositionResponseDto["block"]> = {
		id: "block-video-1",
		type: "VIDEO",
		title: "Lecture 1",
		position: 1,
		parentModuleId: "mod-1",
	};

	it("returns undefined when resume data is absent, inactive, or missing a block", () => {
		expect(buildCourseResumeSearch(undefined)).toBeUndefined();
		expect(
			buildCourseResumeSearch({
				hasResumePosition: false,
				lastVisitedAt: null,
				block: baseBlock,
				resumeData: null,
			}),
		).toBeUndefined();
		expect(
			buildCourseResumeSearch({
				hasResumePosition: true,
				lastVisitedAt: "2026-10-20T14:30:00.000Z",
				block: null,
				resumeData: null,
			}),
		).toBeUndefined();
	});

	it("includes blockId and non-negative finite positionSeconds", () => {
		expect(
			buildCourseResumeSearch({
				hasResumePosition: true,
				lastVisitedAt: "2026-10-20T14:30:00.000Z",
				block: baseBlock,
				resumeData: {
					version: 1,
					type: "VIDEO",
					data: { positionSeconds: 142 },
				},
			}),
		).toEqual({
			blockId: "block-video-1",
			positionSeconds: 142,
		});

		expect(
			buildCourseResumeSearch({
				hasResumePosition: true,
				lastVisitedAt: "2026-10-20T14:30:00.000Z",
				block: baseBlock,
				resumeData: {
					version: 1,
					type: "VIDEO",
					data: { positionSeconds: 0 },
				},
			}),
		).toEqual({
			blockId: "block-video-1",
			positionSeconds: 0,
		});
	});

	it("omits positionSeconds when resumeData is null or positionSeconds is missing or invalid", () => {
		expect(
			buildCourseResumeSearch({
				hasResumePosition: true,
				lastVisitedAt: "2026-10-20T14:30:00.000Z",
				block: { ...baseBlock, id: "block-text-1", type: "TEXT" },
				resumeData: null,
			}),
		).toEqual({ blockId: "block-text-1" });

		for (const badPosition of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
			const search = buildCourseResumeSearch({
				hasResumePosition: true,
				lastVisitedAt: "2026-10-20T14:30:00.000Z",
				block: baseBlock,
				resumeData: {
					version: 1,
					type: "VIDEO",
					data: { positionSeconds: badPosition },
				},
			});
			expect(search).toEqual({ blockId: "block-video-1" });
			expect(search).not.toHaveProperty("positionSeconds");
		}
	});
});
