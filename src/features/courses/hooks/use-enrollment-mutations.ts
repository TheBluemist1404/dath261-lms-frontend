import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enrollInCourse, leaveCourse } from "../api/enrollment.api";
import { enrollmentKeys, progressKeys } from "../api/enrollment.queries";
import type { EnrollmentStateResponseDto } from "../types/enrollment.types";

export function useEnrollCourse(courseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => enrollInCourse(courseId),
		onMutate: async () => {
			await queryClient.cancelQueries({
				queryKey: enrollmentKeys.course(courseId),
			});
			const previousState =
				queryClient.getQueryData<EnrollmentStateResponseDto>(
					enrollmentKeys.course(courseId),
				);

			queryClient.setQueryData<EnrollmentStateResponseDto>(
				enrollmentKeys.course(courseId),
				(old) => ({
					courseId,
					enrollmentId: old?.enrollmentId ?? "temp-enrollment-id",
					enrollmentStatus: "ACTIVE",
					courseAvailable: true,
					canAccessCourse: true,
				}),
			);

			return { previousState };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousState !== undefined) {
				queryClient.setQueryData(
					enrollmentKeys.course(courseId),
					context.previousState,
				);
			} else {
				queryClient.removeQueries({
					queryKey: enrollmentKeys.course(courseId),
				});
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: enrollmentKeys.course(courseId),
			});
			queryClient.invalidateQueries({
				queryKey: enrollmentKeys.myLists(),
			});
			queryClient.invalidateQueries({
				queryKey: ["courses", "detail", courseId],
			});
		},
	});
}

export function useLeaveCourse(courseId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => leaveCourse(courseId),
		onMutate: async () => {
			await queryClient.cancelQueries({
				queryKey: enrollmentKeys.course(courseId),
			});
			const previousState =
				queryClient.getQueryData<EnrollmentStateResponseDto>(
					enrollmentKeys.course(courseId),
				);

			queryClient.setQueryData<EnrollmentStateResponseDto>(
				enrollmentKeys.course(courseId),
				(old) => ({
					courseId,
					enrollmentId: old?.enrollmentId ?? null,
					enrollmentStatus: "LEFT",
					courseAvailable: old?.courseAvailable ?? true,
					canAccessCourse: false,
				}),
			);

			return { previousState };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousState !== undefined) {
				queryClient.setQueryData(
					enrollmentKeys.course(courseId),
					context.previousState,
				);
			} else {
				queryClient.removeQueries({
					queryKey: enrollmentKeys.course(courseId),
				});
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: enrollmentKeys.course(courseId),
			});
			queryClient.invalidateQueries({
				queryKey: enrollmentKeys.myLists(),
			});
			queryClient.invalidateQueries({
				queryKey: ["courses", "detail", courseId],
			});
			queryClient.invalidateQueries({
				queryKey: progressKeys.course(courseId),
			});
		},
	});
}
