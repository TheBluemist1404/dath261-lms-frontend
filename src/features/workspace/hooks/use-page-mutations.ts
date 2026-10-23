import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	archivePage,
	createPage,
	restorePage,
	updatePage,
} from "../api/workspace.api";
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
			queryClient.invalidateQueries({
				queryKey: workspaceKeys.archivedPages(page.workspaceId),
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

/**
 * Archive or restore a page. Subpages change with it, and archived pages leave
 * search and recent pages, so those lists are refreshed too.
 */
export function usePageArchive() {
	const sync = useSyncPage();
	const queryClient = useQueryClient();
	const onSuccess = (page: Page) =>
		Promise.all([
			sync(page),
			queryClient.invalidateQueries({
				queryKey: [...workspaceKeys.all, "search"],
			}),
			queryClient.invalidateQueries({
				queryKey: [...workspaceKeys.all, "recent"],
			}),
			// Subpages archived or restored with it show the new state when opened.
			queryClient.invalidateQueries({
				queryKey: [...workspaceKeys.all, "page"],
				predicate: (query) => query.queryKey[2] !== page.id,
			}),
		]);
	return {
		archive: useMutation({ mutationFn: archivePage, onSuccess }),
		restore: useMutation({ mutationFn: restorePage, onSuccess }),
	};
}
