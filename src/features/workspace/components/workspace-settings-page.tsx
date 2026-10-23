import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/errors";
import { workspaceQuery } from "../api/workspace.queries";
import { getWorkspaceCapabilities } from "../capabilities";
import {
	useArchiveWorkspace,
	useRenameWorkspace,
	useRestoreWorkspace,
} from "../hooks/use-workspace-mutations";
import type { Workspace } from "../types";
import { roleLabels } from "../workspace-labels";
import { ErrorState, LoadingState } from "./query-state";
import { WorkspaceNotFound } from "./workspace-not-found";

export function WorkspaceSettingsPage({
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
				title="Workspace settings could not be loaded"
				error={workspace.error}
				onRetry={() => workspace.refetch()}
			/>
		);
	}

	return <WorkspaceSettings workspace={workspace.data} />;
}

function WorkspaceSettings({ workspace }: { workspace: Workspace }) {
	const isOwner = workspace.currentUserRole === "OWNER";
	const archived = workspace.archivedAt !== null;
	const { canArchive } = getWorkspaceCapabilities(workspace);

	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<header>
				<Link
					to="/workspace/$id"
					params={{ id: workspace.id }}
					className="text-sm font-semibold text-primary hover:underline"
				>
					&larr; {workspace.name}
				</Link>
				<h1 className="mt-3 font-heading text-3xl font-bold tracking-tight">
					Workspace settings
				</h1>
				<p className="mt-3 text-sm text-muted">
					{workspace.name} ·{" "}
					{isOwner
						? "Owner controls"
						: `${roleLabels[workspace.currentUserRole]} view`}
				</p>
			</header>

			<section className="space-y-6 rounded-xl border border-border bg-white p-6">
				<RenameForm
					key={workspace.id}
					workspace={workspace}
					editable={isOwner && !archived}
				/>
				{archived ? (
					<ArchivedNotice workspace={workspace} canRestore={canArchive} />
				) : (
					canArchive && <ArchiveSection workspace={workspace} />
				)}
			</section>
		</div>
	);
}

function RenameForm({
	workspace,
	editable,
}: {
	workspace: Workspace;
	editable: boolean;
}) {
	const [name, setName] = useState(workspace.name);
	const rename = useRenameWorkspace(workspace.id);
	const trimmed = name.trim();

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (trimmed && trimmed !== workspace.name) rename.mutate(trimmed);
	}

	return (
		<form onSubmit={submit} className="space-y-3">
			<h2 className="font-heading text-xl font-semibold">Workspace details</h2>
			<div>
				<label
					htmlFor="workspace-settings-name"
					className="text-sm font-semibold"
				>
					Workspace name
				</label>
				<input
					id="workspace-settings-name"
					value={name}
					maxLength={100}
					readOnly={!editable}
					onChange={(event) => setName(event.target.value)}
					className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 py-2 read-only:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
				/>
			</div>
			<p className="text-sm text-muted">
				{workspace.type === "PERSONAL"
					? "Default personal workspace · Private, collaborators cannot be invited"
					: workspace.memberCount > 1
						? "Additional workspace · Shared with collaborators"
						: "Additional workspace · Only you so far"}
			</p>
			{rename.isError && (
				<p role="alert" className="text-sm text-error">
					{getApiErrorMessage(rename.error)}
				</p>
			)}
			{rename.isSuccess && (
				<output className="block text-sm text-primary">Name saved.</output>
			)}
			{editable && (
				<Button
					type="submit"
					disabled={!trimmed || trimmed === workspace.name || rename.isPending}
				>
					{rename.isPending ? "Saving…" : "Save name"}
				</Button>
			)}
		</form>
	);
}

function ArchiveSection({ workspace }: { workspace: Workspace }) {
	const [confirming, setConfirming] = useState(false);
	const archive = useArchiveWorkspace(workspace.id);

	return (
		<div className="space-y-3 border-t border-border pt-6">
			<h2 className="font-heading text-xl font-semibold">Archive workspace</h2>
			<p className="text-sm text-muted">
				Only Owners can archive or restore. This preserves content and
				membership history.
			</p>
			<Button variant="danger" onClick={() => setConfirming(true)}>
				Archive workspace
			</Button>
			<Dialog
				open={confirming}
				onClose={() => {
					setConfirming(false);
					archive.reset();
				}}
				title={`Archive ${workspace.name}?`}
				description="Content and memberships are retained. Editing becomes unavailable until an Owner restores the workspace."
			>
				{archive.isError && (
					<p role="alert" className="text-sm text-error">
						{getApiErrorMessage(archive.error)}
					</p>
				)}
				<div className="flex justify-end gap-3">
					<Button variant="secondary" onClick={() => setConfirming(false)}>
						Cancel
					</Button>
					<Button
						variant="danger"
						disabled={archive.isPending}
						onClick={() =>
							archive.mutate(undefined, {
								onSuccess: () => setConfirming(false),
							})
						}
					>
						{archive.isPending ? "Archiving…" : "Archive workspace"}
					</Button>
				</div>
			</Dialog>
		</div>
	);
}

function ArchivedNotice({
	workspace,
	canRestore,
}: {
	workspace: Workspace;
	canRestore: boolean;
}) {
	const restore = useRestoreWorkspace();

	return (
		<div className="space-y-4">
			<div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
				<p className="font-semibold">Workspace archived</p>
				<p className="mt-1">
					Content and memberships are retained. Editing is unavailable until
					restoration.
				</p>
			</div>
			{restore.isError && (
				<p role="alert" className="text-sm text-error">
					{getApiErrorMessage(restore.error)}
				</p>
			)}
			{canRestore ? (
				<Button
					disabled={restore.isPending}
					onClick={() => restore.mutate(workspace.id)}
				>
					{restore.isPending ? "Restoring…" : "Restore workspace"}
				</Button>
			) : (
				<p className="text-sm text-muted">Only an Owner can restore it.</p>
			)}
		</div>
	);
}
