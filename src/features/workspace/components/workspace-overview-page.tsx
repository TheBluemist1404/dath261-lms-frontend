import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getApiErrorStatus } from "@/lib/http/errors";
import { workspaceQuery } from "../api/workspace.queries";
import { collaboratorLabel, pageCountLabel } from "../workspace-labels";
import { ErrorState, LoadingState } from "./query-state";
import { WorkspaceNotFound } from "./workspace-not-found";

// Placeholder shell until Phase 2 adds the page tree and editor slot.
export function WorkspaceOverviewPage({
	workspaceId,
}: {
	workspaceId: string;
}) {
	const workspace = useQuery(workspaceQuery(workspaceId));

	if (workspace.isPending) return <LoadingState label="Loading workspace…" />;
	if (workspace.isError) {
		return getApiErrorStatus(workspace.error) === 404 ? (
			<WorkspaceNotFound />
		) : (
			<ErrorState
				title="Workspace could not be loaded"
				error={workspace.error}
				onRetry={() => workspace.refetch()}
			/>
		);
	}

	const { data } = workspace;
	return (
		<div className="mx-auto max-w-6xl space-y-4">
			<Link
				to="/workspace"
				className="text-sm font-semibold text-primary hover:underline"
			>
				&larr; All workspaces
			</Link>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="font-heading text-3xl font-bold tracking-tight">
					{data.name}
				</h1>
				<Link
					to="/workspace/$id/settings"
					params={{ id: data.id }}
					className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-subtle"
				>
					Workspace settings
				</Link>
			</div>
			<p className="text-sm text-muted">
				{pageCountLabel(data.pageCount)} · {collaboratorLabel(data)}
				{data.archivedAt && " · Archived"}
			</p>
		</div>
	);
}
