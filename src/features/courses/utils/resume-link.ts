import type { ResumePositionResponseDto } from "../types/enrollment.types";

export interface CourseResumeSearch {
	blockId: string;
	positionSeconds?: number;
}

export function buildCourseResumeSearch(
	resumeData: ResumePositionResponseDto | undefined,
): CourseResumeSearch | undefined {
	if (!resumeData?.hasResumePosition || !resumeData.block) {
		return undefined;
	}

	const positionSeconds = resumeData.resumeData?.data?.positionSeconds;
	const validPosition =
		typeof positionSeconds === "number" &&
		Number.isFinite(positionSeconds) &&
		positionSeconds >= 0;

	return {
		blockId: resumeData.block.id,
		...(validPosition ? { positionSeconds } : {}),
	};
}
