import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { archivedPagesQuery } from "../api/workspace.queries";
import type { PageSummary } from "../types";
import { PageArchiveDialog } from "./page-dialogs";
import { ErrorState, LoadingState } from "./query-state";
import { WorkspaceShell } from "./workspace-shell";

const dateFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

/** Archived pages of a workspace, with restore for those who can edit pages. */
export function ArchivedPagesPage({ workspaceId }: { workspaceId: string }) {
	return (
		<WorkspaceShell workspaceId={workspaceId}>
			{({ workspace, canEdit }) => (
				<ArchivedPagesList workspaceId={workspace.id} canRestore={canEdit} />
			)}
		</WorkspaceShell>
	);
}

function ArchivedPagesList({
	workspaceId,
	canRestore,
}: {
	workspaceId: string;
	canRestore: boolean;
}) {
	const pages = useQuery(archivedPagesQuery(workspaceId));
	const [restoring, setRestoring] = useState<PageSummary | null>(null);

	return (
		<section
			aria-labelledby="archived-pages-heading"
			className="space-y-4 rounded-xl border border-border bg-white p-6"
		>
			<div>
				<h2
					id="archived-pages-heading"
					className="font-heading text-2xl font-semibold"
				>
					Archived pages
				</h2>
				<p className="mt-2 text-sm text-muted">
					Archived pages keep their content, references and discussion. They are
					read-only until restored.
				</p>
			</div>

			{pages.isPending ? (
				<LoadingState label="Loading archived pages…" />
			) : pages.isError ? (
				<ErrorState
					title="Archived pages could not be loaded"
					error={pages.error}
					onRetry={() => pages.refetch()}
				/>
			) : pages.data.length === 0 ? (
				<p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
					No archived pages.
				</p>
			) : (
				<ul className="divide-y divide-border">
					{pages.data.map((page) => {
						const parent = pages.data.find(
							(entry) =>
								entry.id === page.parentPageId &&
								entry.archivedAt === page.archivedAt,
						);
						return (
							<li
								key={page.id}
								className="flex flex-wrap items-center justify-between gap-3 py-3"
							>
								<div className="min-w-0">
									<Link
										to="/workspace/$id/pages/$pageId"
										params={{ id: workspaceId, pageId: page.id }}
										className="font-semibold text-primary hover:underline [overflow-wrap:anywhere]"
									>
										{page.title}
									</Link>
									<p className="text-sm text-muted">
										{parent ? `Archived with ${parent.title}` : "Archived"}
										{page.archivedAt &&
											` · ${dateFormat.format(new Date(page.archivedAt))}`}
									</p>
								</div>
								{canRestore && (
									<Button
										variant="secondary"
										aria-label={`Restore ${page.title}`}
										onClick={() => setRestoring(page)}
									>
										Restore
									</Button>
								)}
							</li>
						);
					})}
				</ul>
			)}

			{canRestore && restoring && (
				<PageArchiveDialog
					open
					onClose={() => setRestoring(null)}
					page={restoring}
					action="restore"
				/>
			)}
		</section>
	);
}
