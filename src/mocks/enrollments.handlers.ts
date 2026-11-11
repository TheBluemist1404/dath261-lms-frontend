import { HttpResponse, http } from "msw";
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

export const enrollmentsHandlers = [
	http.get("*/api/courses/:courseId/enrollments/me", ({ request, params }) => {
		const authError = requireMockAuth(request);
		if (authError) return authError;

		const { courseId } = params;
		if (courseId === "course-left") {
			return HttpResponse.json(mockEnrollmentLeft);
		}
		if (courseId === "course-active" || courseId === "course-intro-cs") {
			return HttpResponse.json(mockEnrollmentActive);
		}
		if (courseId === "course-completed" || courseId === "course-algo") {
			return HttpResponse.json(mockEnrollmentCompleted);
		}
		if (courseId === "course-unavailable" || courseId === "course-draft-os") {
			return HttpResponse.json(mockEnrollmentUnavailable);
		}
		return HttpResponse.json({
			...mockEnrollmentNone,
			courseId: String(courseId),
		});
	}),

	http.post(
		"*/api/courses/:courseId/enrollments/me",
		async ({ request, params }) => {
			const authError = requireMockAuth(request);
			if (authError) return authError;

			const { courseId } = params;
			if (courseId === "course-fail") {
				return HttpResponse.json(
					{ message: "Could not enroll in course." },
					{ status: 400 },
				);
			}
			return HttpResponse.json(
				{
					enrollmentId: "mock-enrollment-id",
					courseId: String(courseId),
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

			const { courseId } = params;
			if (courseId === "course-fail") {
				return HttpResponse.json(
					{ message: "Could not leave course." },
					{ status: 400 },
				);
			}
			return HttpResponse.json({
				enrollmentId: "mock-enrollment-id",
				courseId: String(courseId),
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
