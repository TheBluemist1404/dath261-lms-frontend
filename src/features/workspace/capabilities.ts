import type { Workspace } from "./types";

export interface WorkspaceCapabilities {
	canEditPages: boolean;
	canManageMembers: boolean;
	canManageCoOwners: boolean;
	canArchive: boolean;
}

/**
 * UI-only capability flags from the Notion Authorization Model. They decide which
 * controls to show; the backend enforces every action independently.
 */
export function getWorkspaceCapabilities(
	workspace: Pick<Workspace, "type" | "currentUserRole" | "archivedAt">,
): WorkspaceCapabilities {
	const active = workspace.archivedAt === null;
	const collaborative = workspace.type === "COLLABORATIVE";
	const owner = workspace.currentUserRole === "OWNER";
	const coOwner = workspace.currentUserRole === "CO_OWNER";

	return {
		canEditPages: active,
		canManageMembers: active && collaborative && (owner || coOwner),
		canManageCoOwners: active && collaborative && owner,
		canArchive: collaborative && owner,
	};
}
