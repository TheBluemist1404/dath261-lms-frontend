import { Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { NewPageDialog } from "./page-dialogs";
import { WorkspaceShell } from "./workspace-shell";

export function WorkspaceHomePage({ workspaceId }: { workspaceId: string }) {
	return (
		<WorkspaceShell workspaceId={workspaceId}>
			{({ pages, canEdit }) => {
				const firstRoot = pages.find((page) => page.parentPageId === null);
				return firstRoot ? (
					<Navigate
						to="/workspace/$id/pages/$pageId"
						params={{ id: workspaceId, pageId: firstRoot.id }}
						replace
					/>
				) : (
					<EmptyWorkspace workspaceId={workspaceId} canEdit={canEdit} />
				);
			}}
		</WorkspaceShell>
	);
}

function EmptyWorkspace({
	workspaceId,
	canEdit,
}: {
	workspaceId: string;
	canEdit: boolean;
}) {
	const [creating, setCreating] = useState(false);

	return (
		<div className="space-y-5">
			<div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-6">
				<span className="text-muted">
					<Icon name="book" />
				</span>
				<h2 className="font-heading text-xl font-semibold">
					Create your first study page.
				</h2>
				<p className="text-sm text-muted">
					Capture an idea, organize nested pages, and reference a course block.
				</p>
			</div>
			{canEdit && (
				<>
					<Button onClick={() => setCreating(true)}>Create page</Button>
					<NewPageDialog
						open={creating}
						onClose={() => setCreating(false)}
						workspaceId={workspaceId}
						pages={[]}
					/>
				</>
			)}
		</div>
	);
}
