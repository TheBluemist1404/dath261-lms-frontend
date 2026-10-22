import { queryOptions } from "@tanstack/react-query";
import type { WorkspaceListFilters } from "../types";
import {
	getPage,
	getWorkspace,
	listMembers,
	listPages,
	listWorkspaces,
} from "./workspace.api";

export const workspaceKeys = {
	all: ["workspaces"] as const,
	lists: () => [...workspaceKeys.all, "list"] as const,
	list: (filters: WorkspaceListFilters = {}) =>
		[
			...workspaceKeys.lists(),
			{ archived: filters.archived ?? false },
		] as const,
	detail: (workspaceId: string) =>
		[...workspaceKeys.all, "detail", workspaceId] as const,
	pages: (workspaceId: string) =>
		[...workspaceKeys.detail(workspaceId), "pages"] as const,
	members: (workspaceId: string) =>
		[...workspaceKeys.detail(workspaceId), "members"] as const,
	page: (pageId: string) => [...workspaceKeys.all, "page", pageId] as const,
};

export function workspaceListQuery(filters: WorkspaceListFilters = {}) {
	return queryOptions({
		queryKey: workspaceKeys.list(filters),
		queryFn: ({ signal }) => listWorkspaces(filters, signal),
	});
}

export function workspaceQuery(workspaceId: string) {
	return queryOptions({
		queryKey: workspaceKeys.detail(workspaceId),
		queryFn: ({ signal }) => getWorkspace(workspaceId, signal),
	});
}

export function workspacePagesQuery(workspaceId: string) {
	return queryOptions({
		queryKey: workspaceKeys.pages(workspaceId),
		queryFn: ({ signal }) => listPages(workspaceId, signal),
	});
}

export function workspaceMembersQuery(workspaceId: string) {
	return queryOptions({
		queryKey: workspaceKeys.members(workspaceId),
		queryFn: ({ signal }) => listMembers(workspaceId, signal),
	});
}

export function pageQuery(pageId: string) {
	return queryOptions({
		queryKey: workspaceKeys.page(pageId),
		queryFn: ({ signal }) => getPage(pageId, signal),
	});
}
