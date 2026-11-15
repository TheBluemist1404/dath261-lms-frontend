import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import {
	courseBlocksQuery,
	courseDetailQuery,
	courseListQuery,
	publishedCourseListQuery,
} from "./course.queries";

describe("course.queries", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
	});

	it("creates stable query keys for catalog and detail queries", () => {
		const listKey = courseListQuery().queryKey;
		expect(listKey).toEqual(["courses"]);

		const catalogKey = publishedCourseListQuery({ search: "os" }).queryKey;
		expect(catalogKey).toEqual(["courses", "catalog", { search: "os" }]);

		const detailKey = courseDetailQuery("course-os").queryKey;
		expect(detailKey).toEqual(["courses", "detail", "course-os"]);

		const blocksKey = courseBlocksQuery("course-os").queryKey;
		expect(blocksKey).toEqual(["courses", "blocks", "course-os"]);
	});

	it("fetches published course list through queryFn", async () => {
		const options = publishedCourseListQuery({ search: "Operating" });
		const result = await queryClient.fetchQuery(options);

		expect(result.data.length).toBeGreaterThan(0);
		expect(result.data[0].id).toBe("course-os");
		expect(result.meta.total).toBe(1);
	});

	it("fetches public course details through queryFn", async () => {
		const options = courseDetailQuery("course-os");
		const course = await queryClient.fetchQuery(options);

		expect(course.id).toBe("course-os");
		expect(course.title).toBe("Operating Systems");
		expect(course.status).toBe("PUBLISHED");
	});

	it("fetches public course blocks through queryFn", async () => {
		const options = courseBlocksQuery("course-os");
		const blocks = await queryClient.fetchQuery(options);

		expect(Array.isArray(blocks)).toBe(true);
		expect(blocks.length).toBeGreaterThan(0);
		expect(blocks[0].courseId).toBe("course-os");
	});
});
