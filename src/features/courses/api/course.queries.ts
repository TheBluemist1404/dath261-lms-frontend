import { queryOptions } from "@tanstack/react-query";
import type { CatalogQuery } from "../types/course.types";
import { getCourse, listCourses, listPublishedCourses } from "./course.api";
import { listCourseBlocks } from "./course-block.api";

export const courseListQuery = () =>
	queryOptions({
		queryKey: ["courses"],
		queryFn: ({ signal }) => listCourses(signal),
	});

export const publishedCourseListQuery = (query: CatalogQuery = {}) =>
	queryOptions({
		queryKey: ["courses", "catalog", query],
		queryFn: ({ signal }) => listPublishedCourses(query, signal),
		staleTime: 30 * 1000,
		retry: false,
	});

export const courseDetailQuery = (courseId: string) =>
	queryOptions({
		queryKey: ["courses", "detail", courseId],
		queryFn: ({ signal }) => getCourse(courseId, signal),
		staleTime: 60 * 1000,
		retry: false,
	});

export const courseBlocksQuery = (courseId: string) =>
	queryOptions({
		queryKey: ["courses", "blocks", courseId],
		queryFn: ({ signal }) => listCourseBlocks(courseId, signal),
		staleTime: 60 * 1000,
		retry: false,
	});
