import type { PageSummary } from "./types";

export interface PageTreeNode {
	page: PageSummary;
	children: PageTreeNode[];
}

/** Builds the nested tree from the flat page list, keeping API order per level. */
export function buildPageTree(pages: PageSummary[]): PageTreeNode[] {
	const nodes = new Map(
		pages.map((page) => [page.id, { page, children: [] as PageTreeNode[] }]),
	);
	const roots: PageTreeNode[] = [];
	for (const node of nodes.values()) {
		const parent = node.page.parentPageId
			? nodes.get(node.page.parentPageId)
			: undefined;
		(parent ? parent.children : roots).push(node);
	}
	return roots;
}

/** Ancestors from the root down to the page's parent. */
export function getAncestors(pages: PageSummary[], pageId: string) {
	const byId = new Map(pages.map((page) => [page.id, page]));
	const ancestors: PageSummary[] = [];
	let parentId = byId.get(pageId)?.parentPageId;
	while (parentId) {
		const parent = byId.get(parentId);
		if (!parent || ancestors.includes(parent)) break;
		ancestors.unshift(parent);
		parentId = parent.parentPageId;
	}
	return ancestors;
}

export function getDescendantIds(pages: PageSummary[], pageId: string) {
	const descendants = new Set<string>();
	const queue = [pageId];
	while (queue.length > 0) {
		const current = queue.shift();
		for (const page of pages) {
			if (page.parentPageId === current && !descendants.has(page.id)) {
				descendants.add(page.id);
				queue.push(page.id);
			}
		}
	}
	return descendants;
}

/** Flattened tree with depth, for parent pickers. */
export function flattenPageTree(tree: PageTreeNode[], depth = 0) {
	return tree.flatMap((node): { page: PageSummary; depth: number }[] => [
		{ page: node.page, depth },
		...flattenPageTree(node.children, depth + 1),
	]);
}
