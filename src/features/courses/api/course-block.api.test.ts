import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http/client";
import type { CourseBlock } from "../types/course-block.types";
import {
	createCourseBlock,
	deleteCourseBlock,
	listCourseBlocks,
	updateCourseBlock,
} from "./course-block.api";

vi.mock("@/lib/http/client", () => ({
	httpClient: {
		get: vi.fn(),
		post: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
}));

const block: CourseBlock = {
	id: "block-1",
	courseId: "course-1",
	type: "MODULE",
	title: "Introduction",
	parentModuleId: null,
	position: 0,
	content: null,
};

afterEach(() => vi.clearAllMocks());

describe("course block API", () => {
	it("queries course blocks through the nested course resource", async () => {
		vi.mocked(httpClient.get).mockResolvedValue({
			data: [block],
		} as never);

		expect(await listCourseBlocks("course-1")).toEqual([block]);

		expect(httpClient.get).toHaveBeenCalledWith("/courses/course-1/blocks", {
			signal: undefined,
		});
	});

	it("creates nested content as a CourseBlock", async () => {
		vi.mocked(httpClient.post).mockResolvedValue({
			data: block,
		} as never);

		const input = {
			courseId: "course-1",
			type: "MODULE" as const,
			title: "Introduction",
			parentModuleId: null,
			position: 0,
			content: null,
		};

		await createCourseBlock("course-1", input);

		// Only the fields the backend accepts: no courseId, position or null content.
		expect(httpClient.post).toHaveBeenCalledWith("/courses/course-1/blocks", {
			type: "MODULE",
			title: "Introduction",
		});
	});

	it("sends content and the parent module for a lesson inside a module", async () => {
		vi.mocked(httpClient.post).mockResolvedValue({ data: block } as never);

		await createCourseBlock("course-1", {
			courseId: "course-1",
			type: "TEXT",
			title: "Lesson",
			parentModuleId: "module-1",
			position: 3,
			content: { text: "# Hi" },
		});

		expect(httpClient.post).toHaveBeenCalledWith("/courses/course-1/blocks", {
			type: "TEXT",
			title: "Lesson",
			parentModuleId: "module-1",
			content: { text: "# Hi" },
		});
	});

	it("leaves null content out of an update", async () => {
		vi.mocked(httpClient.patch).mockResolvedValue({ data: block } as never);

		await updateCourseBlock("course-1", "block-1", {
			title: "Renamed module",
			type: "MODULE",
			content: null,
		});

		expect(httpClient.patch).toHaveBeenCalledWith(
			"/courses/course-1/blocks/block-1",
			{ title: "Renamed module", type: "MODULE" },
		);
	});

	it("updates and deletes a block by ID", async () => {
		vi.mocked(httpClient.patch).mockResolvedValue({
			data: block,
		} as never);

		vi.mocked(httpClient.delete).mockResolvedValue({} as never);

		await updateCourseBlock("course-1", "block-1", { title: "Updated" });

		await deleteCourseBlock("course-1", "block-1");

		expect(httpClient.patch).toHaveBeenCalledWith(
			"/courses/course-1/blocks/block-1",
			{
				title: "Updated",
			},
		);

		expect(httpClient.delete).toHaveBeenCalledWith(
			"/courses/course-1/blocks/block-1",
		);
	});
});
