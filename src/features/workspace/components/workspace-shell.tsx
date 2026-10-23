import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { getApiErrorStatus } from "@/lib/http/errors";
import { workspacePagesQuery, workspaceQuery } from "../api/workspace.queries";
import { getWorkspaceCapabilities } from "../capabilities";
import { buildPageTree } from "../page-tree";
import type { PageSummary, Workspace } from "../types";
import { NewPageDialog } from "./page-dialogs";
import { PageTreeNav } from "./page-tree-nav";
import { ErrorState, LoadingState } from "./query-state";
import { WorkspaceNotFound } from "./workspace-not-found";

export interface WorkspaceShellContext {
	workspace: Workspace;
	pages: PageSummary[];
	canEdit: boolean;
}

/**
 * Loads a workspace and its pages, then renders the header and page tree around
 * `children`. Shared by the workspace home and page routes.
 */
export function WorkspaceShell({
	workspaceId,
	activePageId,
	children,
}: {
	workspaceId: string;
	activePageId?: string;
	children: (context: WorkspaceShellContext) => ReactNode;
}) {
	const workspace = useQuery(workspaceQuery(workspaceId));
	const pages = useQuery(workspacePagesQuery(workspaceId));
	const [creating, setCreating] = useState(false);

	const failed = workspace.error ?? pages.error;
	if (failed) {
		return getApiErrorStatus(failed) === 404 ? (
			<WorkspaceNotFound />
		) : (
			<ErrorState
				title="Workspace could not be loaded"
				error={failed}
				onRetry={() => {
					workspace.refetch();
					pages.refetch();
				}}
			/>
		);
	}
	if (!workspace.data || !pages.data) {
		return <LoadingState label="Loading workspace…" />;
	}

	const { canEditPages } = getWorkspaceCapabilities(workspace.data);
	const context: WorkspaceShellContext = {
		workspace: workspace.data,
		pages: pages.data,
		canEdit: canEditPages,
	};
	const isPersonal = workspace.data.type === "PERSONAL";

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<header className="space-y-2">
				<Link
					to="/workspace"
					className="text-sm font-semibold text-primary hover:underline"
				>
					&larr; All workspaces
				</Link>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<h1 className="font-heading text-3xl font-bold tracking-tight [overflow-wrap:anywhere]">
						{workspace.data.name}
					</h1>
					<Link
						to="/workspace/$id/settings"
						params={{ id: workspaceId }}
						className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-subtle"
					>
						Workspace settings
					</Link>
				</div>
				<p className="text-sm text-muted">
					{isPersonal
						? "Only you can access this workspace. Invitations are unavailable."
						: "Workspace membership governs access."}
				</p>
			</header>

			{workspace.data.archivedAt && (
				<div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
					<p className="font-semibold">Workspace archived</p>
					<p className="mt-1">
						Pages are read-only until an Owner restores the workspace.
					</p>
				</div>
			)}

			{pages.data.length === 0 ? (
				children(context)
			) : (
				<div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
					<aside className="space-y-4 rounded-xl border border-border bg-white p-4">
						<h2 className="font-heading text-base font-semibold">Pages</h2>
						<PageTreeNav
							workspaceId={workspaceId}
							tree={buildPageTree(pages.data)}
							activePageId={activePageId}
						/>
						{canEditPages && (
							<Button
								variant="secondary"
								className="w-full"
								onClick={() => setCreating(true)}
							>
								New page
							</Button>
						)}
					</aside>
					<div className="min-w-0">{children(context)}</div>
				</div>
			)}

			{canEditPages && (
				<NewPageDialog
					open={creating}
					onClose={() => setCreating(false)}
					workspaceId={workspaceId}
					pages={pages.data}
				/>
			)}
		</div>
	);
}
