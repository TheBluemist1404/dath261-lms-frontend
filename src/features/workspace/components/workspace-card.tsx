import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import type { WorkspaceSummary } from "../workspace-preview-data";

export function WorkspaceCard({ workspace }: { workspace: WorkspaceSummary }) {
	return (
		<Link
			to="/workspace/$id"
			params={{ id: workspace.id }}
			className="flex flex-col items-start gap-2 rounded-xl border border-border bg-white p-6 transition-colors hover:border-primary"
		>
			<span className="text-muted">
				<Icon name="workspace" />
			</span>
			<h3 className="w-full font-heading text-xl font-semibold leading-7 [overflow-wrap:anywhere]">
				{workspace.title}
			</h3>
			<p className="text-sm leading-[22px] text-muted">
				{workspace.pageCount} {workspace.pageCount === 1 ? "page" : "pages"}
			</p>
			<p className="text-sm font-semibold leading-5 text-primary">
				{workspace.collaboratorCount === 0
					? "Only you"
					: `${workspace.collaboratorCount} ${workspace.collaboratorCount === 1 ? "collaborator" : "collaborators"}`}
			</p>
		</Link>
	);
}
