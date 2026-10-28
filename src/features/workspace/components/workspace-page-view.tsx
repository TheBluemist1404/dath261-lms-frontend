import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getApiErrorStatus } from "@/lib/http/errors";
import { useAuthStore } from "@/stores/auth.store";
import {
	pageQuery,
	workspaceKeys,
	workspaceMembersQuery,
} from "../api/workspace.queries";
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
	PageArchiveDialog,
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

const ignoreChange = () => {};

type OpenDialog = "rename" | "move" | "subpage" | "archive" | "restore" | null;

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
	const archived = page.archivedAt !== null;
	// Archived pages are read-only; workspace editors can still restore them.
	const canEditPage = canEdit && !archived;
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
			? {
					pageId: page.id,
					userId,
					members: members.data,
					initialContent: page.content,
				}
			: null,
	);
	const paused = collaborative && collaboration.status !== "connected";
	const editable = canEditPage && !paused && !collaboration.readOnly;
	// Shared pages are saved by the collaboration server as edits sync.
	const saveStatus = collaborative
		? collaboration.unsyncedChanges > 0
			? "saving"
			: "idle"
		: autosave.status;

	// The server changed this page's scope (archived or restored elsewhere):
	// refresh the workspace so the rest of the page shows it too.
	const queryClient = useQueryClient();
	const serverReadOnly = collaboration.readOnly;
	const connected = collaboration.status === "connected";
	const expectedReadOnly = Boolean(workspace.archivedAt) || archived;
	useEffect(() => {
		if (connected && serverReadOnly !== expectedReadOnly) {
			void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
		}
	}, [connected, serverReadOnly, expectedReadOnly, queryClient]);

	if (collaborative && collaboration.status === "revoked") {
		return <AccessEnded />;
	}

	return (
		<article className="space-y-5 rounded-xl border border-border bg-white p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				{canEditPage && (
					<SaveStatusIndicator status={saveStatus} onRetry={autosave.retry} />
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
			{collaborative && canEditPage && (
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
					<div className="flex flex-wrap gap-2">
						{collaborative && (
							<Link
								to="/workspace/$id/discussion/$pageId"
								params={{ id: workspace.id, pageId: page.id }}
								className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-primary hover:bg-primary-subtle"
							>
								Discussion
							</Link>
						)}
						{canEditPage && (
							<>
								<Button variant="ghost" onClick={() => setDialog("subpage")}>
									New subpage
								</Button>
								<Button variant="ghost" onClick={() => setDialog("rename")}>
									Rename
								</Button>
								<Button variant="ghost" onClick={() => setDialog("move")}>
									Move
								</Button>
								<Button variant="ghost" onClick={() => setDialog("archive")}>
									Archive
								</Button>
							</>
						)}
					</div>
				</div>
			</div>

			{archived && (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
					<div>
						<p className="font-semibold">Page archived</p>
						<p className="mt-1">
							It is hidden from the page tree and search, and read-only until
							restored.
						</p>
					</div>
					{canEdit && (
						<Button variant="secondary" onClick={() => setDialog("restore")}>
							Restore page
						</Button>
					)}
				</div>
			)}

			{collaborative && !collaboration.shared ? (
				<output className="block min-h-60 rounded-xl border border-border p-6 text-sm text-muted">
					Opening the shared page…
				</output>
			) : (
				<EditorSlot
					pageId={page.id}
					destination={`${workspace.name} / ${summary.title}`}
					initialContent={page.content}
					readOnly={!editable}
					onChange={collaborative ? ignoreChange : autosave.queue}
					shared={collaboration.shared}
				/>
			)}

			<CourseReferences
				pageId={page.id}
				destination={`${workspace.name} / ${summary.title}`}
				canEdit={canEditPage}
			/>

			{canEdit && (
				<PageArchiveDialog
					open={dialog === "archive" || dialog === "restore"}
					onClose={close}
					page={summary}
					action={dialog === "restore" ? "restore" : "archive"}
				/>
			)}

			{canEditPage && (
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
