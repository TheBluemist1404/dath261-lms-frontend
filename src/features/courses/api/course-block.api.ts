import { httpClient } from "@/lib/http/client";
import type {
	CourseBlock,
	CourseBlockInput,
} from "../types/course-block.types";

export async function listCourseBlocks(
	courseId: string,
	signal?: AbortSignal,
): Promise<CourseBlock[]> {
	const { data } = await httpClient.get<CourseBlock[]>(
		`/courses/${encodeURIComponent(courseId)}/blocks`,
		{ signal },
	);

	return data;
}

/**
 * The backend rejects unknown fields (courseId and position come from the URL and the
 * server) and accepts `content` only as an object, so a block without content leaves
 * it out instead of sending null.
 */
function createBody(input: CourseBlockInput) {
	return {
		type: input.type,
		title: input.title,
		...(input.parentModuleId ? { parentModuleId: input.parentModuleId } : {}),
		...(input.content ? { content: input.content } : {}),
	};
}

function updateBody(input: Partial<Omit<CourseBlockInput, "courseId">>) {
	return {
		...(input.type !== undefined ? { type: input.type } : {}),
		...(input.title !== undefined ? { title: input.title } : {}),
		...(input.content ? { content: input.content } : {}),
	};
}

export async function createCourseBlock(
	courseId: string,
	input: CourseBlockInput,
): Promise<CourseBlock> {
	const { data } = await httpClient.post<CourseBlock>(
		`/courses/${encodeURIComponent(courseId)}/blocks`,
		createBody(input),
	);

	return data;
}

export async function updateCourseBlock(
	courseId: string,
	blockId: string,
	input: Partial<Omit<CourseBlockInput, "courseId">>,
): Promise<CourseBlock> {
	const { data } = await httpClient.patch<CourseBlock>(
		`/courses/${encodeURIComponent(courseId)}/blocks/${encodeURIComponent(blockId)}`,
		updateBody(input),
	);

	return data;
}

export async function deleteCourseBlock(
	courseId: string,
	blockId: string,
): Promise<void> {
	await httpClient.delete(
		`/courses/${encodeURIComponent(courseId)}/blocks/${encodeURIComponent(blockId)}`,
	);
}
