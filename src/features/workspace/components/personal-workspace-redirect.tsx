import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { workspaceListQuery } from "../api/workspace.queries";
import { ErrorState, LoadingState } from "./query-state";
import { WorkspaceNotFound } from "./workspace-not-found";

/** `/workspace/me` is a shortcut to the signed-in user's personal workspace. */
export function PersonalWorkspaceRedirect() {
	const workspaces = useQuery(workspaceListQuery());

	if (workspaces.isPending)
		return <LoadingState label="Opening your workspace…" />;
	if (workspaces.isError) {
		return (
			<ErrorState
				title="Your workspace could not be opened"
				error={workspaces.error}
				onRetry={() => workspaces.refetch()}
			/>
		);
	}

	const personal = workspaces.data.find(
		(workspace) => workspace.type === "PERSONAL",
	);
	if (!personal) return <WorkspaceNotFound />;
	return <Navigate to="/workspace/$id" params={{ id: personal.id }} replace />;
}
