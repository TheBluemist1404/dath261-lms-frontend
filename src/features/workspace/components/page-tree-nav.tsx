import { Link } from "@tanstack/react-router";
import type { PageTreeNode } from "../page-tree";

export function PageTreeNav({
	workspaceId,
	tree,
	activePageId,
}: {
	workspaceId: string;
	tree: PageTreeNode[];
	activePageId?: string;
}) {
	return (
		<nav aria-label="Pages">
			<PageTreeLevel
				workspaceId={workspaceId}
				nodes={tree}
				activePageId={activePageId}
			/>
		</nav>
	);
}

function PageTreeLevel({
	workspaceId,
	nodes,
	activePageId,
	nested = false,
}: {
	workspaceId: string;
	nodes: PageTreeNode[];
	activePageId?: string;
	nested?: boolean;
}) {
	return (
		<ul className={nested ? "ml-3 border-l border-border pl-2" : "space-y-1"}>
			{nodes.map(({ page, children }) => {
				const active = page.id === activePageId;
				return (
					<li key={page.id}>
						<Link
							to="/workspace/$id/pages/$pageId"
							params={{ id: workspaceId, pageId: page.id }}
							aria-current={active ? "page" : undefined}
							className={`block rounded-lg px-3 py-2 text-sm font-medium [overflow-wrap:anywhere] ${active ? "bg-primary-subtle text-primary" : "hover:bg-subtle"}`}
						>
							{page.title}
						</Link>
						{children.length > 0 && (
							<PageTreeLevel
								workspaceId={workspaceId}
								nodes={children}
								activePageId={activePageId}
								nested
							/>
						)}
					</li>
				);
			})}
		</ul>
	);
}
