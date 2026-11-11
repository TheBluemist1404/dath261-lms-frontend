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

export async function createCourseBlock(
	courseId: string,
	input: CourseBlockInput,
): Promise<CourseBlock> {
	const { data } = await httpClient.post<CourseBlock>(
		`/courses/${encodeURIComponent(courseId)}/blocks`,
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
		`/courses/${encodeURIComponent(courseId)}/blocks/${encodeURIComponent(blockId)}`,
		input,
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
