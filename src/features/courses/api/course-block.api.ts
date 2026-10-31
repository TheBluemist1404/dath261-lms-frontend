import { httpClient } from "@/lib/http/client";
import type {
	CourseBlock,
	CourseBlockInput,
} from "../types/course-block.types";

/** Course content is represented by CourseBlock records, not separate lessons. */
export async function listCourseBlocks(
	courseId: string,
	signal?: AbortSignal,
): Promise<CourseBlock[]> {
	const { data } = await httpClient.get<CourseBlock[]>("/courseblock", {
		params: { courseId },
		signal,
	});
	return data;
}

export async function createCourseBlock(
	input: CourseBlockInput,
): Promise<CourseBlock> {
	const { data } = await httpClient.post<CourseBlock>("/courseblock", input);
	return data;
}

export async function updateCourseBlock(
	blockId: string,
	input: Partial<Omit<CourseBlockInput, "courseId">>,
): Promise<CourseBlock> {
	const { data } = await httpClient.patch<CourseBlock>(
		`/courseblock/${encodeURIComponent(blockId)}`,
		input,
	);
	return data;
}

export async function deleteCourseBlock(blockId: string): Promise<void> {
	await httpClient.delete(`/courseblock/${encodeURIComponent(blockId)}`);
}
