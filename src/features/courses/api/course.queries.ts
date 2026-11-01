import { queryOptions } from "@tanstack/react-query";
import { listCourses } from "./course.api";

export const courseListQuery = () =>
	queryOptions({
		queryKey: ["courses"],
		queryFn: ({ signal }) => listCourses(signal),
	});
