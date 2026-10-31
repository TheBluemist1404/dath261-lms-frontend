import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentInput } from "./content.api";
import {
	createContent,
	deleteContent,
	getCourseContent,
	updateContent,
	updateContentPublication,
} from "./content.api";

describe("Content API", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("retrieves course content", async () => {
		const responseData = [
			{
				id: "content-1",
				title: "Introduction",
				contentType: "text",
				text: "Introduction to the course",
				published: false,
			},
		];

		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(responseData), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.stubGlobal("fetch", fetchMock);

		const result = await getCourseContent("course-1");

		expect(result).toEqual(responseData);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/courses/course-1/content",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("creates content with the expected request", async () => {
		const payload: ContentInput = {
			title: "Introduction",
			description: "",
			contentType: "text",
			videoUrl: "",
		};

		const responseData = { id: "content-2", ...payload, published: false };

		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(responseData), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.stubGlobal("fetch", fetchMock);

		const result = await createContent("course-1", payload);

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/courses/course-1/content",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(payload),
			}),
		);
		expect(result).toEqual(responseData);
	});

	it("updates content using its identifier and the expected payload", async () => {
		const payload: ContentInput = {
			title: "Updated introduction",
			description: "",
			contentType: "text",
			videoUrl: "",
		};

		const responseData = { id: "content-1", ...payload };

		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(responseData), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.stubGlobal("fetch", fetchMock);

		const result = await updateContent("content-1", payload);

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/content/content-1",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify(payload),
			}),
		);
		expect(result).toEqual(responseData);
	});

	it("deletes content using its identifier", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204 }));

		vi.stubGlobal("fetch", fetchMock);

		await deleteContent("content-1");

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/content/content-1",
			expect.objectContaining({ method: "DELETE" }),
		);
	});

	it("updates content publication status", async () => {
		const responseData = {
			id: "content-1",
			title: "Introduction",
			published: true,
		};

		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(responseData), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.stubGlobal("fetch", fetchMock);

		const result = await updateContentPublication("content-1", true);

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/content/content-1/publication",
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({ published: true }),
			}),
		);
		expect(result).toEqual(responseData);
	});

	it("reports a failed API request", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ message: "Internal server error" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			}),
		);

		vi.stubGlobal("fetch", fetchMock);

		await expect(getCourseContent("course-1")).rejects.toThrow();
	});
});
