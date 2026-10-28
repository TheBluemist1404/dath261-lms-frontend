import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getApiErrorMessage } from "@/lib/http/errors";
import { workspaceListQuery } from "../api/workspace.queries";
import { getWorkspaceCapabilities } from "../capabilities";
import { useRestoreWorkspace } from "../hooks/use-workspace-mutations";
import type { Workspace } from "../types";
import { ErrorState, LoadingState } from "./query-state";

export function ArchivedWorkspacesPage() {
	const workspaces = useQuery(workspaceListQuery({ archived: true }));

	return (
		<div className="mx-auto max-w-6xl space-y-8">
			<header>
				<Link
					to="/workspace"
					className="text-sm font-semibold text-primary hover:underline"
				>
					&larr; All workspaces
				</Link>
				<h1 className="mt-3 font-heading text-3xl font-bold tracking-tight">
					Archived workspaces
				</h1>
				<p className="mt-3 text-base leading-7 text-muted">
					Archived workspaces keep their content and members. Only Owners can
					restore them.
				</p>
			</header>

			{workspaces.isPending ? (
				<LoadingState label="Loading archived workspaces…" />
			) : workspaces.isError ? (
				<ErrorState
					title="Archived workspaces could not be loaded"
					error={workspaces.error}
					onRetry={() => workspaces.refetch()}
				/>
			) : workspaces.data.length === 0 ? (
				<p className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted">
					No archived workspaces.
				</p>
			) : (
				<ul className="grid gap-6 sm:grid-cols-2">
					{workspaces.data.map((workspace) => (
						<ArchivedWorkspaceCard key={workspace.id} workspace={workspace} />
					))}
				</ul>
			)}
		</div>
	);
}

function ArchivedWorkspaceCard({ workspace }: { workspace: Workspace }) {
	const restore = useRestoreWorkspace();
	const { canArchive: canRestore } = getWorkspaceCapabilities(workspace);

	return (
		<li className="flex flex-col items-start gap-2 rounded-xl border border-border bg-white p-6">
			<span className="text-muted">
				<Icon name="workspace" />
			</span>
			<h2 className="w-full font-heading text-xl font-semibold leading-7 [overflow-wrap:anywhere]">
				{workspace.name}
			</h2>
			<p className="text-sm text-muted">
				Archived · Content and memberships retained
			</p>
			{canRestore ? (
				<Button
					className="mt-2"
					disabled={restore.isPending}
					onClick={() => restore.mutate(workspace.id)}
					aria-label={`Restore ${workspace.name}`}
				>
					{restore.isPending ? "Restoring…" : "Restore workspace"}
				</Button>
			) : (
				<p className="text-sm font-semibold text-primary">Owner can restore</p>
			)}
			{restore.isError && (
				<p role="alert" className="text-sm text-error">
					{getApiErrorMessage(restore.error)}
				</p>
			)}
		</li>
	);
}
