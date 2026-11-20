import { HttpResponse, http } from "msw";
import {
	DEFAULT_DEADLINE_DAYS,
	MAX_DEADLINE_DAYS,
	MIN_DEADLINE_DAYS,
} from "@/features/courses/api/deadline.api";
import type { EnrollmentStatus } from "@/features/courses/types/enrollment.types";
import { requireMockAuth } from "@/test/mocks/mock-auth-guard";
import {
	createMockUpcomingDeadlines,
	mockEnrollmentActive,
	mockEnrollmentCompleted,
	mockEnrollmentLeft,
	mockEnrollmentNone,
	mockEnrollmentUnavailable,
	mockMyCoursesList,
	mockResumePosition,
	mockStudentProgress,
} from "./enrollments.fixtures";
import {
	getMockCompletedQuizBlockIds,
	resetQuizMockState,
} from "./quizzes.fixtures";

const DAY_MS = 86_400_000;

function parseDeadlineDays(rawDays: string | null): number {
	if (rawDays === null || rawDays.trim() === "") {
		return DEFAULT_DEADLINE_DAYS;
	}
	const parsed = Number(rawDays);
	if (!Number.isFinite(parsed)) {
		return DEFAULT_DEADLINE_DAYS;
	}
	return Math.min(
		MAX_DEADLINE_DAYS,
		Math.max(MIN_DEADLINE_DAYS, Math.trunc(parsed)),
	);
}

const enrollmentStateMap = new Map<string, EnrollmentStatus>([
	["course-active", "ACTIVE"],
	["course-intro-cs", "ACTIVE"],
	["course-left", "LEFT"],
	["course-completed", "COMPLETED"],
	["course-algo", "COMPLETED"],
	["course-unavailable", "ACTIVE"],
	["course-draft-os", "ACTIVE"],
]);

export function hasMockCourseAccess(courseId: string): boolean {
	if (courseId === "course-unavailable" || courseId === "course-draft-os") {
		return false;
	}
	const status = enrollmentStateMap.get(courseId);
	return status === "ACTIVE" || status === "COMPLETED";
}

export function resetEnrollmentMockState() {
	enrollmentStateMap.clear();
	enrollmentStateMap.set("course-active", "ACTIVE");
	enrollmentStateMap.set("course-intro-cs", "ACTIVE");
	enrollmentStateMap.set("course-left", "LEFT");
	enrollmentStateMap.set("course-completed", "COMPLETED");
	enrollmentStateMap.set("course-algo", "COMPLETED");
	enrollmentStateMap.set("course-unavailable", "ACTIVE");
	enrollmentStateMap.set("course-draft-os", "ACTIVE");
	resetQuizMockState();
}

export const enrollmentsHandlers = [
	http.get("*/api/courses/:courseId/enrollments/me", ({ request, params }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		const courseId = String(params.courseId);
		if (courseId === "course-unavailable" || courseId === "course-draft-os") {
			return HttpResponse.json(mockEnrollmentUnavailable);
		}

		const status = enrollmentStateMap.get(courseId);
		if (status === "ACTIVE") {
			return HttpResponse.json({
				...mockEnrollmentActive,
				courseId,
			});
		}
		if (status === "LEFT") {
			return HttpResponse.json({
				...mockEnrollmentLeft,
				courseId,
			});
		}
		if (status === "COMPLETED") {
			return HttpResponse.json({
				...mockEnrollmentCompleted,
				courseId,
			});
		}

		return HttpResponse.json({
			...mockEnrollmentNone,
			courseId,
		});
	}),

	http.post(
		"*/api/courses/:courseId/enrollments/me",
		async ({ request, params }) => {
			const authError = requireMockAuth(request);
			if (authError) return authError;

			const courseId = String(params.courseId);
			if (courseId === "course-fail") {
				return HttpResponse.json(
					{ message: "Could not enroll in course." },
					{ status: 400 },
				);
			}

			enrollmentStateMap.set(courseId, "ACTIVE");
			return HttpResponse.json(
				{
					enrollmentId: `enr-${courseId}`,
					courseId,
					status: "ACTIVE",
					canAccessCourse: true,
				},
				{ status: 201 },
			);
		},
	),

	http.delete(
		"*/api/courses/:courseId/enrollments/me",
		async ({ request, params }) => {
			const authError = requireMockAuth(request);
			if (authError) return authError;

			const courseId = String(params.courseId);
			if (courseId === "course-fail") {
				return HttpResponse.json(
					{ message: "Could not leave course." },
					{ status: 400 },
				);
			}

			enrollmentStateMap.set(courseId, "LEFT");
			return HttpResponse.json({
				enrollmentId: `enr-${courseId}`,
				courseId,
				status: "LEFT",
				canAccessCourse: false,
			});
		},
	),

	http.get("*/api/users/me/enrollments", ({ request }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		const url = new URL(request.url);
		const state = url.searchParams.get("state");
		const filteredData = state
			? mockMyCoursesList.data.filter((item) => item.state === state)
			: mockMyCoursesList.data;

		return HttpResponse.json({
			...mockMyCoursesList,
			data: filteredData,
			meta: {
				...mockMyCoursesList.meta,
				total: filteredData.length,
			},
		});
	}),

	http.get("*/api/courses/:courseId/progress/resume", ({ request }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		return HttpResponse.json(mockResumePosition);
	}),

	http.get("*/api/courses/:courseId/progress", ({ request, params }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		const courseId = String(params.courseId);
		const completedQuizIds = getMockCompletedQuizBlockIds(courseId);
		if (completedQuizIds.size === 0) {
			return HttpResponse.json(mockStudentProgress);
		}

		const base = mockStudentProgress.progress;
		const completedQuizzes = Math.min(
			base.totalQuizzes,
			base.completedQuizzes + completedQuizIds.size,
		);
		const addedQuizzes = completedQuizzes - base.completedQuizzes;
		const completedItems = Math.min(
			base.totalItems,
			base.completedItems + addedQuizzes,
		);
		const learningProgressPercentage =
			base.totalItems > 0
				? Math.round((completedItems / base.totalItems) * 100)
				: 0;
		const quizCompletionPercentage =
			base.totalQuizzes > 0
				? Math.floor((completedQuizzes / base.totalQuizzes) * 100)
				: 0;

		return HttpResponse.json({
			...mockStudentProgress,
			progress: {
				...base,
				completedItems,
				learningProgressPercentage,
				completedQuizzes,
				quizCompletionPercentage,
			},
		});
	}),

	http.get("*/api/users/me/deadlines", ({ request }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		const url = new URL(request.url);
		const days = parseDeadlineDays(url.searchParams.get("days"));
		const nowMs = Date.now();
		const maxMs = nowMs + days * DAY_MS;

		const deadlines = createMockUpcomingDeadlines(nowMs)
			.filter((item) => {
				const deadlineMs = Date.parse(item.deadline);
				return deadlineMs >= nowMs && deadlineMs <= maxMs;
			})
			.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));

		return HttpResponse.json(deadlines);
	}),
];
