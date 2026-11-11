import { HttpResponse, http } from "msw";
import type { Course } from "@/features/courses/types/course.types";
import { requireMockAuth } from "@/test/mocks/mock-auth-guard";
import {
	coursePage,
	mockCourseBlocks,
	mockDraftCourse,
	mockPublishedCourses,
} from "./courses.fixtures";

const allMockCourses: Course[] = [...mockPublishedCourses, mockDraftCourse];

export const coursesHandlers = [
	http.get("*/api/courses/catalog", ({ request }) => {
		const url = new URL(request.url);
		const search = url.searchParams.get("search")?.toLowerCase().trim();
		const lecturerId = url.searchParams.get("lecturerId");
		const enrollmentOpen = url.searchParams.get("enrollmentOpen");
		const sortBy = url.searchParams.get("sortBy") || "createdAt";
		const sortOrder = url.searchParams.get("sortOrder") || "desc";
		const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
		const limit = Math.max(1, Number(url.searchParams.get("limit")) || 20);

		let result = mockPublishedCourses.filter((c) => c.status === "PUBLISHED");

		if (search) {
			result = result.filter(
				(c) =>
					c.title.toLowerCase().includes(search) ||
					c.description?.toLowerCase().includes(search) ||
					c.prerequisites?.toLowerCase().includes(search),
			);
		}

		if (lecturerId) {
			result = result.filter((c) => c.lecturer?.id === lecturerId);
		}

		if (enrollmentOpen === "true") {
			const now = new Date();
			result = result.filter((c) => {
				if (!c.enrollmentEndAt) return true;
				return new Date(c.enrollmentEndAt) >= now;
			});
		}

		result.sort((a, b) => {
			let valA = "";
			let valB = "";

			if (sortBy === "title") {
				valA = a.title;
				valB = b.title;
			} else if (sortBy === "enrollmentStartAt") {
				valA = a.enrollmentStartAt || "";
				valB = b.enrollmentStartAt || "";
			} else {
				valA = a.createdAt || "";
				valB = b.createdAt || "";
			}

			const cmp = valA.localeCompare(valB);
			return sortOrder === "asc" ? cmp : -cmp;
		});

		return HttpResponse.json(coursePage(result, page, limit));
	}),

	http.get("*/api/courses/:courseId", ({ params }) => {
		const { courseId } = params;
		const course = allMockCourses.find((c) => c.id === courseId);

		if (!course || course.status !== "PUBLISHED") {
			return HttpResponse.json(
				{ message: "Course not found." },
				{ status: 404 },
			);
		}

		return HttpResponse.json(course);
	}),

	http.get("*/api/courses/:courseId/blocks", ({ request, params }) => {
		const { courseId } = params;
		const course = allMockCourses.find((c) => c.id === courseId);

		if (!course) {
			return HttpResponse.json(
				{ message: "Course not found." },
				{ status: 404 },
			);
		}

		if (course.status !== "PUBLISHED") {
			const authError = requireMockAuth(request);
			if (authError) return authError;
		}

		return HttpResponse.json(mockCourseBlocks);
	}),
];
