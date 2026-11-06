import { httpClient } from "@/lib/http/client";
import type {
	CatalogQuery,
	Course,
	CourseInput,
	CourseStatus,
	CourseUpdateInput,
} from "../types/course.types";

interface CoursePage {
	data: Course[];
	meta: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
}

export const listCourses = async (signal?: AbortSignal): Promise<Course[]> => {
	const response = await httpClient.get<Course[]>("/courses", {
		signal,
	});

	return response.data;
};

export const listPublishedCourses = async (
	query: CatalogQuery = {},
	signal?: AbortSignal,
): Promise<CoursePage> => {
	const params: Record<string, string | number | boolean> = {};

	if (query.page !== undefined) {
		params.page = query.page;
	}

	if (query.limit !== undefined) {
		params.limit = query.limit;
	}

	if (query.search !== undefined) {
		params.search = query.search;
	}

	if (query.enrollmentOpen !== undefined) {
		params.enrollmentOpen = String(query.enrollmentOpen);
	}

	const response = await httpClient.get<CoursePage>("/courses/catalog", {
		params,
		signal,
		skipAuthRefresh: true,
	});

	return response.data;
};

export const getCourse = async (
	courseId: string,
	signal?: AbortSignal,
): Promise<Course> => {
	const response = await httpClient.get<Course>(
		`/courses/${encodeURIComponent(courseId)}`,
		{
			signal,
		},
	);

	return response.data;
};

export const createCourse = async (input: CourseInput): Promise<Course> => {
	const { status: _status, ...fields } = input;

	const response = await httpClient.post<Course>("/courses", fields);

	return response.data;
};

export const updateCourseStatus = async (
	courseId: string,
	status: CourseStatus,
): Promise<Course> => {
	const response = await httpClient.patch<Course>(
		`/courses/${encodeURIComponent(courseId)}/status`,
		{
			status,
		},
	);

	return response.data;
};

export const updateCourse = async (
	courseId: string,
	input: CourseUpdateInput,
): Promise<Course> => {
	const { status, ...fields } = input;

	const response = await httpClient.patch<Course>(
		`/courses/${encodeURIComponent(courseId)}`,
		fields,
	);

	if (status === undefined) {
		return response.data;
	}

	// If the requested status is already the current status,
	// there is no need to call the status endpoint.
	if (response.data.status === status) {
		return response.data;
	}

	const statusResponse = await httpClient.patch<Course>(
		`/courses/${encodeURIComponent(courseId)}/status`,
		{
			status,
		},
	);

	return statusResponse.data;
};
