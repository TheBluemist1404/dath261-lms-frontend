import { QueryClient } from "@tanstack/react-query";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";
import { setAccessToken } from "@/lib/auth/access-token";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { createMockAccessToken, resetMockAuth } from "@/mocks/auth.handlers";
import { useAuthStore } from "@/stores/auth.store";
import {
	courseBlocksQuery,
	courseDetailQuery,
	courseListQuery,
	courseOutlineQuery,
	publishedCourseListQuery,
} from "./course.queries";

describe("course.queries", () => {
	let queryClient: QueryClient;
	let uninstallInterceptors: (() => void) | undefined;

	beforeAll(() => {
		uninstallInterceptors = installAuthInterceptors();
	});

	beforeEach(() => {
		resetMockAuth();
		setAccessToken(null);
		useAuthStore.getState().reset();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
	});

	afterEach(() => {
		resetMockAuth();
		setAccessToken(null);
		useAuthStore.getState().reset();
	});

	afterAll(() => {
		uninstallInterceptors?.();
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

		const outlineKey = courseOutlineQuery("course-os").queryKey;
		expect(outlineKey).toEqual(["courses", "outline", "course-os"]);
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

	it("fetches public course outline without authentication and omits content and courseId", async () => {
		const outline = await queryClient.fetchQuery(
			courseOutlineQuery("course-os"),
		);

		expect(Array.isArray(outline)).toBe(true);
		expect(outline.length).toBeGreaterThan(0);
		expect(outline[0].children.length).toBeGreaterThan(0);

		for (const item of outline) {
			expect(item).not.toHaveProperty("content");
			expect(item).not.toHaveProperty("courseId");
			for (const child of item.children) {
				expect(child).not.toHaveProperty("content");
				expect(child).not.toHaveProperty("courseId");
			}
		}
	});

	it("rejects courseBlocksQuery with 401 when unauthenticated", async () => {
		await expect(
			queryClient.fetchQuery(courseBlocksQuery("course-os")),
		).rejects.toMatchObject({ response: { status: 401 } });
	});

	it("fetches courseBlocksQuery when authenticated with a Bearer token", async () => {
		setAccessToken(createMockAccessToken());

		const blocks = await queryClient.fetchQuery(courseBlocksQuery("course-os"));

		expect(Array.isArray(blocks)).toBe(true);
		expect(blocks.length).toBeGreaterThan(0);
		expect(blocks[0].courseId).toBe("course-os");
	});
});
