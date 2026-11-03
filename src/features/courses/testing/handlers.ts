import { HttpResponse, http } from "msw";
import type { Course, CoursePage } from "../types/course.types";

const seededAt = "2026-10-01T08:00:00.000Z";

function publishedCourse(
	id: string,
	title: string,
	description: string,
): Course {
	return {
		id,
		title,
		description,
		prerequisites: null,
		status: "PUBLISHED",
		enrollmentStartAt: null,
		enrollmentEndAt: null,
		createdAt: seededAt,
		updatedAt: seededAt,
	};
}

export const mockPublishedCourses: Course[] = [
	publishedCourse(
		"course-os",
		"Operating Systems",
		"Processes, memory and file systems, from scheduling to virtual memory.",
	),
	publishedCourse(
		"course-intro-cs",
		"Introduction to Computer Science",
		"Problem solving, algorithms and your first programs.",
	),
	publishedCourse(
		"course-db",
		"Database Design",
		"Model data, normalise schemas and write the queries that use them.",
	),
	publishedCourse(
		"course-networks",
		"Computer Networks",
		"How packets travel, from links and routing to the web.",
	),
];

export function coursePage(courses: Course[]): CoursePage {
	return {
		data: courses,
		meta: {
			total: courses.length,
			page: 1,
			limit: 20,
			totalPages: courses.length ? 1 : 0,
			hasNextPage: false,
			hasPrevPage: false,
		},
	};
}

// Public catalog read (GET /courses/catalog).
export const catalogHandlers = [
	http.get("*/api/courses/catalog", () =>
		HttpResponse.json(coursePage(mockPublishedCourses)),
	),
];
