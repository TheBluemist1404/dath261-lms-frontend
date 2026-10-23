import type { Workspace, WorkspaceMemberRole } from "./types";

export const roleLabels: Record<WorkspaceMemberRole, string> = {
	OWNER: "Owner",
	CO_OWNER: "Co-owner",
	MEMBER: "Member",
};

export function pageCountLabel(count: number) {
	return `${count} ${count === 1 ? "page" : "pages"}`;
}

export function collaboratorLabel(workspace: Pick<Workspace, "memberCount">) {
	const others = workspace.memberCount - 1;
	if (others <= 0) return "Only you";
	return `${others} ${others === 1 ? "collaborator" : "collaborators"}`;
}
