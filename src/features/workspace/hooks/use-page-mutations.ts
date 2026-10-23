import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPage, updatePage } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace.queries";
import type { CreatePageInput, Page, UpdatePageInput } from "../types";

function useSyncPage() {
	const queryClient = useQueryClient();
	return (page: Page) => {
		queryClient.setQueryData(workspaceKeys.page(page.id), page);
		return Promise.all([
			queryClient.invalidateQueries({
				queryKey: workspaceKeys.pages(page.workspaceId),
			}),
			// Page counts on the workspace cards change with new pages.
			queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() }),
		]);
	};
}

export function useCreatePage(workspaceId: string) {
	const sync = useSyncPage();
	return useMutation({
		mutationFn: (input: CreatePageInput) => createPage(workspaceId, input),
		onSuccess: sync,
	});
}

/** Title and parent changes; content goes through usePageAutosave. */
export function useUpdatePage(pageId: string) {
	const sync = useSyncPage();
	return useMutation({
		mutationFn: (input: Omit<UpdatePageInput, "content">) =>
			updatePage(pageId, input),
		onSuccess: sync,
	});
}
