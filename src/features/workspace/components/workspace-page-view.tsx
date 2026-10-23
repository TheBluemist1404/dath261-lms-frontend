import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getApiErrorStatus } from "@/lib/http/errors";
import { useAuthStore } from "@/stores/auth.store";
import { pageQuery, workspaceMembersQuery } from "../api/workspace.queries";
import { useCollaboration } from "../collaboration/collaboration";
import { usePageAutosave } from "../hooks/use-page-autosave";
import { getAncestors } from "../page-tree";
import type { Page, PageSummary, Workspace } from "../types";
import {
	AccessEnded,
	ConnectionBanner,
	PresenceIndicator,
} from "./collaboration-status";
import { CourseReferences } from "./course-references";
import { EditorSlot } from "./editor-slot";
import {
	MovePageDialog,
	NewPageDialog,
	RenamePageDialog,
} from "./page-dialogs";
import { ErrorState, LoadingState } from "./query-state";
import { SaveStatusIndicator } from "./save-status";
import { WorkspaceShell } from "./workspace-shell";

export function WorkspacePageView({
	workspaceId,
	pageId,
	autosaveDelayMs,
}: {
	workspaceId: string;
	pageId: string;
	autosaveDelayMs?: number;
}) {
	return (
		<WorkspaceShell workspaceId={workspaceId} activePageId={pageId}>
			{({ workspace, pages, canEdit }) => (
				<PageLoader
					key={pageId}
					pageId={pageId}
					workspace={workspace}
					pages={pages}
					canEdit={canEdit}
					autosaveDelayMs={autosaveDelayMs}
				/>
			)}
		</WorkspaceShell>
	);
}

function PageLoader({
	pageId,
	workspace,
	pages,
	canEdit,
	autosaveDelayMs,
}: {
	pageId: string;
	workspace: Workspace;
	pages: PageSummary[];
	canEdit: boolean;
	autosaveDelayMs?: number;
}) {
	const page = useQuery({
		...pageQuery(pageId),
		staleTime: Number.POSITIVE_INFINITY,
	});

	if (page.isPending) return <LoadingState label="Loading page…" />;
	if (page.isError) {
		return getApiErrorStatus(page.error) === 404 ? (
			<div className="rounded-xl border border-border bg-white p-6">
				<h2 className="font-heading text-xl font-semibold">Page not found</h2>
				<p className="mt-2 text-sm text-muted">
					It may have been deleted or moved to another workspace.
				</p>
			</div>
		) : (
			<ErrorState
				title="Page could not be loaded"
				error={page.error}
				onRetry={() => page.refetch()}
			/>
		);
	}

	return (
		<PageEditor
			page={page.data}
			workspace={workspace}
			pages={pages}
			canEdit={canEdit}
			autosaveDelayMs={autosaveDelayMs}
		/>
	);
}

type OpenDialog = "rename" | "move" | "subpage" | null;

function PageEditor({
	page,
	workspace,
	pages,
	canEdit,
	autosaveDelayMs,
}: {
	page: Page;
	workspace: Workspace;
	pages: PageSummary[];
	canEdit: boolean;
	autosaveDelayMs?: number;
}) {
	const autosave = usePageAutosave(page.id, autosaveDelayMs);
	const [dialog, setDialog] = useState<OpenDialog>(null);
	const ancestors = getAncestors(pages, page.id);
	// The tree list carries renames immediately; the page body may be cached.
	const summary = pages.find((entry) => entry.id === page.id) ?? page;
	const close = () => setDialog(null);

	// Shared pages go through the real-time layer; personal pages never do.
	const userId = useAuthStore((state) => state.user?.id);
	const collaborative = workspace.type === "COLLABORATIVE";
	const members = useQuery({
		...workspaceMembersQuery(workspace.id),
		enabled: collaborative,
	});
	const collaboration = useCollaboration(
		collaborative && userId && members.data
			? { pageId: page.id, userId, members: members.data }
			: null,
	);
	const paused = collaborative && collaboration.status !== "connected";
	const editable = canEdit && !paused;

	if (collaborative && collaboration.status === "revoked") {
		return <AccessEnded />;
	}

	return (
		<article className="space-y-5 rounded-xl border border-border bg-white p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				{canEdit && (
					<SaveStatusIndicator
						status={autosave.status}
						onRetry={autosave.retry}
					/>
				)}
				{collaborative && userId && members.data && (
					<PresenceIndicator
						status={collaboration.status}
						members={members.data}
						currentUserId={userId}
						presentUserIds={collaboration.presentUserIds}
					/>
				)}
			</div>
			{collaborative && canEdit && (
				<ConnectionBanner
					status={collaboration.status}
					onRetry={collaboration.retry}
				/>
			)}
			<div className="space-y-2">
				{ancestors.length > 0 && (
					<p className="text-sm text-muted">
						{ancestors.map((ancestor) => ancestor.title).join(" / ")}
					</p>
				)}
				<div className="flex flex-wrap items-start justify-between gap-3">
					<h2 className="font-heading text-3xl font-bold tracking-tight [overflow-wrap:anywhere]">
						{summary.title}
					</h2>
					{canEdit && (
						<div className="flex flex-wrap gap-2">
							<Button variant="ghost" onClick={() => setDialog("subpage")}>
								New subpage
							</Button>
							<Button variant="ghost" onClick={() => setDialog("rename")}>
								Rename
							</Button>
							<Button variant="ghost" onClick={() => setDialog("move")}>
								Move
							</Button>
						</div>
					)}
				</div>
			</div>

			<EditorSlot
				pageId={page.id}
				initialContent={page.content}
				readOnly={!editable}
				onChange={autosave.queue}
			/>

			<CourseReferences
				pageId={page.id}
				destination={`${workspace.name} / ${summary.title}`}
				canEdit={canEdit}
			/>

			{canEdit && (
				<>
					<NewPageDialog
						open={dialog === "subpage"}
						onClose={close}
						workspaceId={page.workspaceId}
						pages={pages}
						defaultParentId={page.id}
					/>
					<RenamePageDialog
						open={dialog === "rename"}
						onClose={close}
						page={summary}
					/>
					<MovePageDialog
						open={dialog === "move"}
						onClose={close}
						page={summary}
						pages={pages}
					/>
				</>
			)}
		</article>
	);
}
