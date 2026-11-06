import { queryOptions } from "@tanstack/react-query";
import type { CatalogQuery } from "../types/course.types";
import { listCourses, listPublishedCourses } from "./course.api";

export const courseListQuery = () =>
	queryOptions({
		queryKey: ["courses"],
		queryFn: ({ signal }) => listCourses(signal),
	});

export const publishedCourseListQuery = (query: CatalogQuery = {}) =>
	queryOptions({
		queryKey: ["courses", "catalog", query],
		queryFn: ({ signal }) => listPublishedCourses(query, signal),
		retry: false,
	});
