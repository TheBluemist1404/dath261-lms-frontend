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
	const { data } = await httpClient.get<CourseBlock[]>(
		`/courseblock/get-all/${encodeURIComponent(courseId)}`,
		{ signal },
	);
	return data;
}

export async function createCourseBlock(
	courseId: string,
	input: CourseBlockInput,
): Promise<CourseBlock> {
	const { data } = await httpClient.post<CourseBlock>(
		`/courseblock/create/${encodeURIComponent(courseId)}`,
		input,
	);
	return data;
}

export async function updateCourseBlock(
	courseId: string,
	blockId: string,
	input: Partial<Omit<CourseBlockInput, "courseId">>,
): Promise<CourseBlock> {
	const { data } = await httpClient.patch<CourseBlock>(
		`/courseblock/update/${encodeURIComponent(courseId)}/${encodeURIComponent(blockId)}`,
		input,
	);
	return data;
}

export async function deleteCourseBlock(
	courseId: string,
	blockId: string,
): Promise<void> {
	await httpClient.delete(
		`/courseblock/delete/${encodeURIComponent(courseId)}/${encodeURIComponent(blockId)}`,
	);
}
