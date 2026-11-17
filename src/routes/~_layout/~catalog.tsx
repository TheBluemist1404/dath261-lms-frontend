import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { CatalogView } from "@/features/courses/components/catalog-view";
import type { CatalogQuery } from "@/features/courses/types/course.types";

const defaultCatalogSearch = {
	sortBy: "createdAt" as const,
	sortOrder: "desc" as const,
	page: 1,
	limit: 12,
};

export const Route = createFileRoute("/_layout/catalog")({
	validateSearch: (search: Record<string, unknown>): CatalogQuery => {
		const pageNum = Number(search.page);
		const page = Number.isInteger(pageNum) && pageNum >= 1 ? pageNum : 1;
		const searchStr =
			typeof search.search === "string" && search.search.trim()
				? search.search.trim()
				: undefined;

		return {
			search: searchStr,
			enrollmentOpen:
				search.enrollmentOpen === "true" || search.enrollmentOpen === true
					? true
					: undefined,
			sortBy:
				search.sortBy === "title" || search.sortBy === "enrollmentStartAt"
					? search.sortBy
					: defaultCatalogSearch.sortBy,
			sortOrder:
				search.sortOrder === "asc" ? "asc" : defaultCatalogSearch.sortOrder,
			page,
			limit: defaultCatalogSearch.limit,
		};
	},
	search: {
		middlewares: [stripSearchParams(defaultCatalogSearch)],
	},
	component: CatalogRouteComponent,
});

function CatalogRouteComponent() {
	const searchParams = Route.useSearch();
	return <CatalogView searchParams={searchParams} />;
}
