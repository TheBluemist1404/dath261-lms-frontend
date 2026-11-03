import { queryOptions } from "@tanstack/react-query";
import { listCourses, listPublishedCourses } from "./course.api";

export const courseListQuery = () =>
	queryOptions({
		queryKey: ["courses"],
		queryFn: ({ signal }) => listCourses(signal),
	});

export const publishedCourseListQuery = () =>
	queryOptions({
		queryKey: ["courses", "published"],
		queryFn: ({ signal }) => listPublishedCourses(signal),
		retry: false,
	});
