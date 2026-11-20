import { HttpResponse, http } from "msw";
import type { EnrollmentStatus } from "@/features/courses/types/enrollment.types";
import { requireMockAuth } from "@/test/mocks/mock-auth-guard";
import {
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

const enrollmentStateMap = new Map<string, EnrollmentStatus>([
	["course-active", "ACTIVE"],
	["course-intro-cs", "ACTIVE"],
	["course-left", "LEFT"],
	["course-completed", "COMPLETED"],
	["course-algo", "COMPLETED"],
	["course-unavailable", "ACTIVE"],
	["course-draft-os", "ACTIVE"],
]);

export function resetEnrollmentMockState() {
	enrollmentStateMap.clear();
	enrollmentStateMap.set("course-active", "ACTIVE");
	enrollmentStateMap.set("course-intro-cs", "ACTIVE");
	enrollmentStateMap.set("course-left", "LEFT");
	enrollmentStateMap.set("course-completed", "COMPLETED");
	enrollmentStateMap.set("course-algo", "COMPLETED");
	enrollmentStateMap.set("course-unavailable", "ACTIVE");
	enrollmentStateMap.set("course-draft-os", "ACTIVE");
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

	http.get("*/api/courses/:courseId/progress", ({ request }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		return HttpResponse.json(mockStudentProgress);
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
