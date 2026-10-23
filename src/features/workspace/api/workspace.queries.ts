import { queryOptions } from "@tanstack/react-query";
import type { ReferenceSourceFilters, WorkspaceListFilters } from "../types";
import {
	getPage,
	getWorkspace,
	listMembers,
	listMessages,
	listPages,
	listRecentPages,
	listReferenceSources,
	listReferences,
	listWorkspaces,
	searchPages,
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
	archivedPages: (workspaceId: string) =>
		[...workspaceKeys.detail(workspaceId), "archived-pages"] as const,
	members: (workspaceId: string) =>
		[...workspaceKeys.detail(workspaceId), "members"] as const,
	page: (pageId: string) => [...workspaceKeys.all, "page", pageId] as const,
	messages: (pageId: string) =>
		[...workspaceKeys.page(pageId), "messages"] as const,
	references: (pageId: string) =>
		[...workspaceKeys.page(pageId), "references"] as const,
	search: (query: string) => [...workspaceKeys.all, "search", query] as const,
	recent: (limit: number) => [...workspaceKeys.all, "recent", limit] as const,
	referenceSources: (filters: ReferenceSourceFilters) =>
		[
			...workspaceKeys.all,
			"reference-sources",
			{ type: filters.type, q: filters.q ?? "" },
		] as const,
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

export function archivedPagesQuery(workspaceId: string) {
	return queryOptions({
		queryKey: workspaceKeys.archivedPages(workspaceId),
		queryFn: ({ signal }) => listPages(workspaceId, signal, true),
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

export function pageReferencesQuery(pageId: string) {
	return queryOptions({
		queryKey: workspaceKeys.references(pageId),
		queryFn: ({ signal }) => listReferences(pageId, signal),
	});
}

export function referenceSourcesQuery(filters: ReferenceSourceFilters) {
	return queryOptions({
		queryKey: workspaceKeys.referenceSources(filters),
		queryFn: ({ signal }) => listReferenceSources(filters, signal),
	});
}

/** Shortest query the search endpoint accepts. */
export const minSearchLength = 2;

export function pageSearchQuery(query: string) {
	return queryOptions({
		queryKey: workspaceKeys.search(query),
		queryFn: ({ signal }) => searchPages(query, signal),
		enabled: query.length >= minSearchLength,
	});
}

export function recentPagesQuery(limit: number) {
	return queryOptions({
		queryKey: workspaceKeys.recent(limit),
		queryFn: ({ signal }) => listRecentPages(limit, signal),
	});
}

export function pageMessagesQuery(pageId: string) {
	return queryOptions({
		queryKey: workspaceKeys.messages(pageId),
		queryFn: ({ signal }) => listMessages(pageId, signal),
	});
}
