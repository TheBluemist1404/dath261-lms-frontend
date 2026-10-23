import { httpClient } from "@/lib/http/client";
import type {
	AddMemberInput,
	CourseReference,
	CreatePageInput,
	CreateReferenceInput,
	CreateWorkspaceInput,
	Page,
	PageHit,
	PageSummary,
	ReferencedBlock,
	ReferenceSourceFilters,
	UpdatePageInput,
	UpdateWorkspaceInput,
	Workspace,
	WorkspaceListFilters,
	WorkspaceMember,
} from "../types";

export async function listWorkspaces(
	filters: WorkspaceListFilters = {},
	signal?: AbortSignal,
) {
	const { data } = await httpClient.get<Workspace[]>("/workspaces", {
		params: filters.archived ? { archived: true } : undefined,
		signal,
	});
	return data;
}

export async function getWorkspace(workspaceId: string, signal?: AbortSignal) {
	const { data } = await httpClient.get<Workspace>(
		`/workspaces/${workspaceId}`,
		{ signal },
	);
	return data;
}

export async function createWorkspace(input: CreateWorkspaceInput) {
	const { data } = await httpClient.post<Workspace>("/workspaces", input);
	return data;
}

export async function updateWorkspace(
	workspaceId: string,
	input: UpdateWorkspaceInput,
) {
	const { data } = await httpClient.patch<Workspace>(
		`/workspaces/${workspaceId}`,
		input,
	);
	return data;
}

export async function archiveWorkspace(workspaceId: string) {
	const { data } = await httpClient.post<Workspace>(
		`/workspaces/${workspaceId}/archive`,
	);
	return data;
}

export async function restoreWorkspace(workspaceId: string) {
	const { data } = await httpClient.post<Workspace>(
		`/workspaces/${workspaceId}/restore`,
	);
	return data;
}

export async function listPages(workspaceId: string, signal?: AbortSignal) {
	const { data } = await httpClient.get<PageSummary[]>(
		`/workspaces/${workspaceId}/pages`,
		{ signal },
	);
	return data;
}

export async function createPage(workspaceId: string, input: CreatePageInput) {
	const { data } = await httpClient.post<Page>(
		`/workspaces/${workspaceId}/pages`,
		input,
	);
	return data;
}

export async function getPage(pageId: string, signal?: AbortSignal) {
	const { data } = await httpClient.get<Page>(`/pages/${pageId}`, { signal });
	return data;
}

export async function updatePage(pageId: string, input: UpdatePageInput) {
	const { data } = await httpClient.patch<Page>(`/pages/${pageId}`, input);
	return data;
}

export async function deletePage(pageId: string) {
	await httpClient.delete(`/pages/${pageId}`);
}

export async function listMembers(workspaceId: string, signal?: AbortSignal) {
	const { data } = await httpClient.get<WorkspaceMember[]>(
		`/workspaces/${workspaceId}/members`,
		{ signal },
	);
	return data;
}

export async function addMember(workspaceId: string, input: AddMemberInput) {
	const { data } = await httpClient.post<WorkspaceMember>(
		`/workspaces/${workspaceId}/members`,
		input,
	);
	return data;
}

export async function removeMember(workspaceId: string, userId: string) {
	await httpClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
}

export async function listReferences(pageId: string, signal?: AbortSignal) {
	const { data } = await httpClient.get<CourseReference[]>(
		`/pages/${pageId}/references`,
		{ signal },
	);
	return data;
}

export async function createReference(
	pageId: string,
	input: CreateReferenceInput,
) {
	const { data } = await httpClient.post<CourseReference>(
		`/pages/${pageId}/references`,
		input,
	);
	return data;
}

export async function deleteReference(referenceId: string) {
	await httpClient.delete(`/references/${referenceId}`);
}

export async function listReferenceSources(
	filters: ReferenceSourceFilters,
	signal?: AbortSignal,
) {
	const { data } = await httpClient.get<ReferencedBlock[]>(
		"/reference-sources",
		{ params: { type: filters.type, q: filters.q || undefined }, signal },
	);
	return data;
}

export async function searchPages(query: string, signal?: AbortSignal) {
	const { data } = await httpClient.get<PageHit[]>("/search/pages", {
		params: { q: query },
		signal,
	});
	return data;
}

export async function listRecentPages(limit: number, signal?: AbortSignal) {
	const { data } = await httpClient.get<PageHit[]>("/recent-pages", {
		params: { limit },
		signal,
	});
	return data;
}
