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
	mockLecturerStudentProgress,
	mockMyCoursesList,
	mockResumePosition,
	mockRoster,
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
	http.get("*/api/courses/:courseId/enrollments", ({ request }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		const url = new URL(request.url);
		const status = url.searchParams.get("status");
		const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
		const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
		const limit = Math.min(
			100,
			Math.max(1, Number(url.searchParams.get("limit") ?? 20)),
		);

		let data = mockRoster.data.filter((item) => {
			if (status && item.status !== status) return false;
			if (!search) return true;

			const name =
				`${item.student.firstName ?? ""} ${item.student.lastName ?? ""}`.toLowerCase();
			return (
				name.includes(search) ||
				item.student.email.toLowerCase().includes(search)
			);
		});

		const total = data.length;
		const totalPages = Math.max(1, Math.ceil(total / limit));
		const safePage = Math.min(page, totalPages);
		const startIndex = (safePage - 1) * limit;

		data = data.slice(startIndex, startIndex + limit);

		return HttpResponse.json({
			data,
			meta: {
				total,
				page: safePage,
				limit,
				totalPages,
				hasNextPage: safePage < totalPages,
				hasPrevPage: safePage > 1,
			},
		});
	}),

	http.patch(
		"*/api/courses/:courseId/enrollments/:enrollmentId/complete",
		({ request, params }) => {
			const authError = requireMockAuth(request);
			if (authError) return authError;

			const enrollmentId = String(params.enrollmentId);
			const enrollment = mockRoster.data.find(
				(item) => item.enrollmentId === enrollmentId,
			);

			if (!enrollment) {
				return HttpResponse.json(
					{ message: "Enrollment not found in this course." },
					{ status: 404 },
				);
			}

			if (enrollment.status !== "ACTIVE") {
				return HttpResponse.json(
					{ message: "Only ACTIVE enrollments can be completed." },
					{ status: 409 },
				);
			}

			const completedAt = new Date().toISOString();
			enrollment.status = "COMPLETED";
			enrollment.completedAt = completedAt;

			return HttpResponse.json({
				enrollmentId,
				status: "COMPLETED",
				completedAt,
			});
		},
	),

	http.get(
		"*/api/courses/:courseId/enrollments/:enrollmentId/progress",
		({ request, params }) => {
			const authError = requireMockAuth(request);
			if (authError) return authError;

			const enrollmentId = String(params.enrollmentId);
			const rosterStudent = mockRoster.data.find(
				(item) => item.enrollmentId === enrollmentId,
			);

			if (!rosterStudent) {
				return HttpResponse.json(
					{ message: "Enrollment not found in this course." },
					{ status: 404 },
				);
			}

			return HttpResponse.json({
				...mockLecturerStudentProgress,
				mockRoster,
				enrollment: {
					...mockLecturerStudentProgress.enrollment,
					id: rosterStudent.enrollmentId,
					status: rosterStudent.status,
					completedAt: rosterStudent.completedAt,
				},
				student: rosterStudent.student,
				progress: {
					...mockLecturerStudentProgress.progress,
					totalItems: rosterStudent.progress.totalBlocks,
					completedItems: rosterStudent.progress.completedBlocks,
					learningProgressPercentage: rosterStudent.progress.percent,
				},
			});
		},
	),
];
