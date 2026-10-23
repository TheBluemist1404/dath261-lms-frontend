import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import type { Workspace } from "../types";
import {
	collaboratorLabel,
	pageCountLabel,
	roleLabels,
} from "../workspace-labels";

export function WorkspaceCard({ workspace }: { workspace: Workspace }) {
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
				{workspace.name}
			</h3>
			<p className="text-sm leading-[22px] text-muted">
				{pageCountLabel(workspace.pageCount)}
			</p>
			<p className="text-sm font-semibold leading-5 text-primary">
				{collaboratorLabel(workspace)} · {roleLabels[workspace.currentUserRole]}
			</p>
		</Link>
	);
}
