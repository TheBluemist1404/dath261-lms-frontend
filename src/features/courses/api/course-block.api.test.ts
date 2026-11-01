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
	httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
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
	it("queries course blocks through the courseblock resource", async () => {
		vi.mocked(httpClient.get).mockResolvedValue({ data: [block] } as never);
		expect(await listCourseBlocks("course-1")).toEqual([block]);
		expect(httpClient.get).toHaveBeenCalledWith(
			"/courseblock/get-all/course-1",
			{ signal: undefined },
		);
	});
	it("creates nested content as a CourseBlock", async () => {
		vi.mocked(httpClient.post).mockResolvedValue({ data: block } as never);

		const input = {
			courseId: "course-1",
			type: "MODULE" as const,
			title: "Introduction",
			parentModuleId: null,
			position: 0,
			content: null,
		};

		await createCourseBlock("course-1", input);

		expect(httpClient.post).toHaveBeenCalledWith(
			"/courseblock/create/course-1",
			input,
		);
	});
	it("updates and deletes a block by ID", async () => {
		vi.mocked(httpClient.patch).mockResolvedValue({ data: block } as never);
		vi.mocked(httpClient.delete).mockResolvedValue({} as never);
		await updateCourseBlock("course-1", "block-1", { title: "Updated" });
		await deleteCourseBlock("block-1");
		expect(httpClient.patch).toHaveBeenCalledWith(
			"/courseblock/update/course-1/block-1",
			{
				title: "Updated",
			},
		);
		expect(httpClient.delete).toHaveBeenCalledWith("/courseblock/block-1");
	});
});
