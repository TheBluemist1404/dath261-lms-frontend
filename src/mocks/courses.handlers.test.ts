import axios from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test/mocks/server";
import {
	mockCourseBlocks,
	mockDraftCourse,
	mockPublishedCourses,
} from "./courses.fixtures";
import { coursesHandlers } from "./courses.handlers";

const testClient = axios.create({
	baseURL: "/api",
	validateStatus: () => true,
});

describe("MSW Courses Handlers & Dual-Mode Auth Contract", () => {
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

		it("returns 404 for an unknown course", async () => {
			const response = await testClient.get("/courses/non-existent-course-id");
			expect(response.status).toBe(404);
		});
	});

	describe("GET /api/courses/:courseId/blocks (Dual-Mode Auth)", () => {
		it("allows unauthenticated request to read blocks of published course", async () => {
			const published = mockPublishedCourses[0];
			const response = await testClient.get(`/courses/${published.id}/blocks`);
			expect(response.status).toBe(200);
			expect(response.data).toEqual(mockCourseBlocks);
		});

		it("returns 401 for draft course when request lacks authorization header", async () => {
			const response = await testClient.get(
				`/courses/${mockDraftCourse.id}/blocks`,
			);
			expect(response.status).toBe(401);
			expect(response.data.message).toMatch(/Unauthorized/);
		});

		it("returns 401 for draft course when bearer token is missing or malformed", async () => {
			const response = await testClient.get(
				`/courses/${mockDraftCourse.id}/blocks`,
				{
					headers: { Authorization: "Basic invalid" },
				},
			);
			expect(response.status).toBe(401);
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

		it("returns 404 for non-existent course blocks request", async () => {
			const response = await testClient.get("/courses/non-existent-id/blocks");
			expect(response.status).toBe(404);
		});
	});
});
