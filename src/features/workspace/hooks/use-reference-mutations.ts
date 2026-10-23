import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReference, deleteReference } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace.queries";
import type { CreateReferenceInput } from "../types";

export function useCreateReference(pageId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateReferenceInput) => createReference(pageId, input),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: workspaceKeys.references(pageId),
			}),
	});
}

export function useDeleteReference(pageId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteReference,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: workspaceKeys.references(pageId),
			}),
	});
}
