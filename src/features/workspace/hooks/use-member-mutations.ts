import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addMember, removeMember } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace.queries";
import type { AddMemberInput } from "../types";

/** Membership changes also move the member counts on the detail and the lists. */
function useInvalidateMembership(workspaceId: string) {
	const queryClient = useQueryClient();
	return () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: workspaceKeys.detail(workspaceId),
			}),
			queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() }),
		]);
}

export function useAddMember(workspaceId: string) {
	const invalidate = useInvalidateMembership(workspaceId);
	return useMutation({
		mutationFn: (input: AddMemberInput) => addMember(workspaceId, input),
		onSuccess: invalidate,
	});
}

export function useRemoveMember(workspaceId: string) {
	const invalidate = useInvalidateMembership(workspaceId);
	return useMutation({
		mutationFn: (userId: string) => removeMember(workspaceId, userId),
		onSuccess: invalidate,
	});
}
