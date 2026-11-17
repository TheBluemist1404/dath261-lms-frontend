import { HttpResponse, http } from "msw";
import type { EnrollmentStatus } from "@/features/courses/types/enrollment.types";
import { requireMockAuth } from "@/test/mocks/mock-auth-guard";
import {
	mockEnrollmentActive,
	mockEnrollmentCompleted,
	mockEnrollmentLeft,
	mockEnrollmentNone,
	mockEnrollmentUnavailable,
	mockMyCoursesList,
	mockResumePosition,
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
];
