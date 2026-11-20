import axios from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import type { CourseBlock } from "@/features/courses/types/course-block.types";
import { server } from "@/test/mocks/server";
import {
	mockCourseBlocks,
	mockCourseOutline,
	mockDraftCourse,
	mockPublishedCourses,
	mockSuspendedCourse,
	toCourseOutline,
} from "./courses.fixtures";
import { coursesHandlers } from "./courses.handlers";

const testClient = axios.create({
	baseURL: "/api",
	validateStatus: () => true,
});

describe("MSW Courses Handlers Contract", () => {
	beforeEach(() => {
		server.use(...coursesHandlers);
	});

	describe("GET /api/courses/catalog", () => {
		it("returns 200 with paginated published courses", async () => {
			const response = await testClient.get("/courses/catalog");
			expect(response.status).toBe(200);
			expect(response.data).toHaveProperty("data");
			expect(response.data).toHaveProperty("meta");
			expect(response.data.data.length).toBeGreaterThan(0);
		});

		it("filters courses by search parameter", async () => {
			const targetTitle = mockPublishedCourses[0].title.slice(0, 4);
			const response = await testClient.get(
				`/courses/catalog?search=${encodeURIComponent(targetTitle)}`,
			);
			expect(response.status).toBe(200);
			expect(response.data.data.length).toBeGreaterThan(0);
			for (const course of response.data.data) {
				const match =
					course.title.toLowerCase().includes(targetTitle.toLowerCase()) ||
					course.description
						?.toLowerCase()
						.includes(targetTitle.toLowerCase()) ||
					course.prerequisites
						?.toLowerCase()
						.includes(targetTitle.toLowerCase());
				expect(match).toBe(true);
			}
		});

		it("filters courses by lecturerId parameter", async () => {
			const lecturerId = mockPublishedCourses[0].lecturer?.id;
			if (lecturerId) {
				const response = await testClient.get(
					`/courses/catalog?lecturerId=${lecturerId}`,
				);
				expect(response.status).toBe(200);
				for (const course of response.data.data) {
					expect(course.lecturer?.id).toBe(lecturerId);
				}
			}
		});
	});

	describe("GET /api/courses/:courseId", () => {
		it("returns 200 for a published course", async () => {
			const published = mockPublishedCourses[0];
			const response = await testClient.get(`/courses/${published.id}`);
			expect(response.status).toBe(200);
			expect(response.data.id).toBe(published.id);
		});

		it("returns 404 for a draft course in public lookup", async () => {
			const response = await testClient.get(`/courses/${mockDraftCourse.id}`);
			expect(response.status).toBe(404);
		});

		it("returns 404 for a suspended course in public lookup", async () => {
			const response = await testClient.get(
				`/courses/${mockSuspendedCourse.id}`,
			);
			expect(response.status).toBe(404);
		});

		it("returns 404 for an unknown course", async () => {
			const response = await testClient.get("/courses/non-existent-course-id");
			expect(response.status).toBe(404);
		});
	});

	describe("GET /api/courses/:courseId/outline", () => {
		it("allows unauthenticated request to read public outline without private fields", async () => {
			const published = mockPublishedCourses[0];
			const response = await testClient.get(`/courses/${published.id}/outline`);
			expect(response.status).toBe(200);
			expect(response.data).toEqual(mockCourseOutline);
			expect(response.data.length).toBeGreaterThan(0);
			expect(response.data[0].children.length).toBeGreaterThan(0);

			for (const item of response.data) {
				expect(item).not.toHaveProperty("content");
				expect(item).not.toHaveProperty("courseId");
				expect(item).not.toHaveProperty("parentModuleId");
				for (const child of item.children) {
					expect(child).not.toHaveProperty("content");
					expect(child).not.toHaveProperty("courseId");
					expect(child).not.toHaveProperty("parentModuleId");
				}
			}
		});

		it("returns 404 for a draft course even with valid bearer token", async () => {
			const response = await testClient.get(
				`/courses/${mockDraftCourse.id}/outline`,
				{
					headers: { Authorization: "Bearer valid-mock-token" },
				},
			);
			expect(response.status).toBe(404);
		});

		it("returns 404 for a suspended course even with valid bearer token", async () => {
			const response = await testClient.get(
				`/courses/${mockSuspendedCourse.id}/outline`,
				{
					headers: { Authorization: "Bearer valid-mock-token" },
				},
			);
			expect(response.status).toBe(404);
		});

		it("returns 404 for a non-existent course", async () => {
			const response = await testClient.get("/courses/non-existent-id/outline");
			expect(response.status).toBe(404);
		});
	});

	describe("GET /api/courses/:courseId/blocks", () => {
		it("returns 401 for published course when request lacks authorization header", async () => {
			const published = mockPublishedCourses[0];
			const response = await testClient.get(`/courses/${published.id}/blocks`);
			expect(response.status).toBe(401);
			expect(response.data.message).toMatch(/Unauthorized/);
		});

		it("returns 401 for draft course when request lacks authorization header", async () => {
			const response = await testClient.get(
				`/courses/${mockDraftCourse.id}/blocks`,
			);
			expect(response.status).toBe(401);
			expect(response.data.message).toMatch(/Unauthorized/);
		});

		it("returns 401 when bearer token is malformed", async () => {
			const published = mockPublishedCourses[0];
			const response = await testClient.get(`/courses/${published.id}/blocks`, {
				headers: { Authorization: "Basic invalid" },
			});
			expect(response.status).toBe(401);
		});

		it("returns 200 for published course when request includes valid bearer token", async () => {
			const published = mockPublishedCourses[0];
			const response = await testClient.get(`/courses/${published.id}/blocks`, {
				headers: { Authorization: "Bearer valid-mock-token" },
			});
			expect(response.status).toBe(200);
			expect(response.data).toEqual(mockCourseBlocks);
		});

		it("returns 200 for draft course when request includes valid bearer token", async () => {
			const response = await testClient.get(
				`/courses/${mockDraftCourse.id}/blocks`,
				{
					headers: { Authorization: "Bearer valid-mock-token" },
				},
			);
			expect(response.status).toBe(200);
			expect(response.data).toEqual(mockCourseBlocks);
		});

		it("returns 401 for non-existent course when unauthenticated", async () => {
			const response = await testClient.get("/courses/non-existent-id/blocks");
			expect(response.status).toBe(401);
		});

		it("returns 404 for non-existent course blocks request when authenticated", async () => {
			const response = await testClient.get("/courses/non-existent-id/blocks", {
				headers: { Authorization: "Bearer valid-mock-token" },
			});
			expect(response.status).toBe(404);
		});
	});

	describe("toCourseOutline", () => {
		it("projects flat parentModuleId blocks sorted by position and omits private fields", () => {
			const flatBlocks: CourseBlock[] = [
				{
					id: "child-2",
					courseId: "course-flat",
					type: "QUIZ",
					title: "Lesson B",
					parentModuleId: "mod-1",
					position: 2,
					content: { questionCount: 3 },
					createdAt: "2026-10-01T00:00:00.000Z",
					updatedAt: "2026-10-01T00:00:00.000Z",
				},
				{
					id: "mod-2",
					courseId: "course-flat",
					type: "MODULE",
					title: "Second Module",
					parentModuleId: null,
					position: 2,
					content: null,
				},
				{
					id: "mod-1",
					courseId: "course-flat",
					type: "MODULE",
					title: "First Module",
					parentModuleId: null,
					position: 1,
					content: null,
					createdAt: "2026-10-01T00:00:00.000Z",
					updatedAt: "2026-10-01T00:00:00.000Z",
				},
				{
					id: "child-1",
					courseId: "course-flat",
					type: "TEXT",
					title: "Lesson A",
					parentModuleId: "mod-1",
					position: 1,
					content: { text: "Secret body" },
				},
			];

			expect(toCourseOutline(flatBlocks)).toEqual([
				{
					id: "mod-1",
					type: "MODULE",
					title: "First Module",
					position: 1,
					children: [
						{ id: "child-1", type: "TEXT", title: "Lesson A", position: 1 },
						{ id: "child-2", type: "QUIZ", title: "Lesson B", position: 2 },
					],
				},
				{
					id: "mod-2",
					type: "MODULE",
					title: "Second Module",
					position: 2,
					children: [],
				},
			]);
		});
	});
});
