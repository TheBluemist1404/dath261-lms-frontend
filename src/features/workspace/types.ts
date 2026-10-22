// Workspace API contract. Mirrors the backend Prisma models (workspace.prisma) and
// docs/workspace-api-contract.md; update all three together.

export type WorkspaceType = "PERSONAL" | "COLLABORATIVE";

export type WorkspaceMemberRole = "OWNER" | "CO_OWNER" | "MEMBER";

export interface Workspace {
	id: string;
	name: string;
	type: WorkspaceType;
	/** The requesting user's membership role; OWNER for their personal workspace. */
	currentUserRole: WorkspaceMemberRole;
	pageCount: number;
	memberCount: number;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PageSummary {
	id: string;
	workspaceId: string;
	title: string;
	parentPageId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Page extends PageSummary {
	/** Serialized editor document; its shape belongs to the editor component. */
	content: unknown | null;
}

export interface WorkspaceMemberUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
}

export interface WorkspaceMember {
	userId: string;
	role: WorkspaceMemberRole;
	joinedAt: string;
	user: WorkspaceMemberUser;
}

export interface CreateWorkspaceInput {
	name: string;
}

export interface UpdateWorkspaceInput {
	name: string;
}

export interface CreatePageInput {
	title: string;
	parentPageId?: string | null;
}

export interface UpdatePageInput {
	title?: string;
	parentPageId?: string | null;
	content?: unknown | null;
}

export interface AddMemberInput {
	email: string;
	role: Exclude<WorkspaceMemberRole, "OWNER">;
}

export interface WorkspaceListFilters {
	archived?: boolean;
}
