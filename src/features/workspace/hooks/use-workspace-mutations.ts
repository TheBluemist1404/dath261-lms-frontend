import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	archiveWorkspace,
	createWorkspace,
	restoreWorkspace,
	updateWorkspace,
} from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace.queries";
import type { Workspace } from "../types";

function useSyncWorkspace() {
	const queryClient = useQueryClient();
	return (workspace: Workspace) => {
		queryClient.setQueryData(workspaceKeys.detail(workspace.id), workspace);
		return queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
	};
}

export function useCreateWorkspace() {
	const sync = useSyncWorkspace();
	return useMutation({ mutationFn: createWorkspace, onSuccess: sync });
}

export function useRenameWorkspace(workspaceId: string) {
	const sync = useSyncWorkspace();
	return useMutation({
		mutationFn: (name: string) => updateWorkspace(workspaceId, { name }),
		onSuccess: sync,
	});
}

export function useArchiveWorkspace(workspaceId: string) {
	const sync = useSyncWorkspace();
	return useMutation({
		mutationFn: () => archiveWorkspace(workspaceId),
		onSuccess: sync,
	});
}

export function useRestoreWorkspace() {
	const sync = useSyncWorkspace();
	return useMutation({ mutationFn: restoreWorkspace, onSuccess: sync });
}
