import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	updateBlockCompletion,
	updateLearningPosition,
} from "../api/enrollment.api";
import { enrollmentKeys, progressKeys } from "../api/enrollment.queries";
import type { ResumeData } from "../types/enrollment.types";

/** Marks a block complete or not; progress bars, My Courses and the dashboard refresh after. */
export function useBlockCompletion(courseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			blockId,
			completed,
		}: {
			blockId: string;
			completed: boolean;
		}) => updateBlockCompletion(courseId, blockId, completed),
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: progressKeys.course(courseId),
			});
			void queryClient.invalidateQueries({
				queryKey: enrollmentKeys.myLists(),
			});
		},
	});
}

/**
 * Saves where the student is. Failures are ignored on purpose: a missed save only
 * means "Resume" opens a little earlier, and must never interrupt the lesson.
 */
export function useSaveLearningPosition(courseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			blockId,
			resumeData,
		}: {
			blockId: string;
			resumeData: ResumeData;
		}) => updateLearningPosition(courseId, blockId, resumeData),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: progressKeys.resume(courseId),
				refetchType: "none",
			});
			void queryClient.invalidateQueries({
				queryKey: enrollmentKeys.myLists(),
				refetchType: "none",
			});
		},
	});
}
