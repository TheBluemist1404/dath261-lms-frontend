import type { ChangeEvent } from "react";
import type { CatalogQuery } from "../types/course.types";

export interface CatalogFiltersProps {
	enrollmentOpen?: boolean;
	onEnrollmentOpenChange: (open: boolean) => void;
	sortBy?: CatalogQuery["sortBy"];
	sortOrder?: CatalogQuery["sortOrder"];
	onSortChange: (
		sortBy: NonNullable<CatalogQuery["sortBy"]>,
		sortOrder: NonNullable<CatalogQuery["sortOrder"]>,
	) => void;
}

export function CatalogFilters({
	enrollmentOpen = false,
	onEnrollmentOpenChange,
	sortBy = "createdAt",
	sortOrder = "desc",
	onSortChange,
}: CatalogFiltersProps) {
	const sortKey = `${sortBy}:${sortOrder}`;

	const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
		const [newSortBy, newSortOrder] = e.target.value.split(":") as [
			NonNullable<CatalogQuery["sortBy"]>,
			NonNullable<CatalogQuery["sortOrder"]>,
		];
		onSortChange(newSortBy, newSortOrder);
	};

	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative">
				<label htmlFor="catalog-sort-filter" className="sr-only">
					Sort courses
				</label>
				<select
					id="catalog-sort-filter"
					value={sortKey}
					onChange={handleSortChange}
					className="h-11 rounded-xl border border-border bg-white px-3.5 pr-8 text-sm font-medium text-ink transition-colors focus-visible:outline-2 focus-visible:outline-primary"
				>
					<option value="createdAt:desc">Newest first</option>
					<option value="title:asc">Title A-Z</option>
					<option value="enrollmentStartAt:asc">Starting soonest</option>
				</select>
			</div>

			<label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-sm font-medium text-ink transition-colors hover:bg-subtle">
				<input
					type="checkbox"
					checked={enrollmentOpen}
					onChange={(e) => onEnrollmentOpenChange(e.target.checked)}
					className="size-4 rounded border-border text-primary accent-primary focus-visible:outline-2 focus-visible:outline-primary"
				/>
				<span>Only open enrollment</span>
			</label>
		</div>
	);
}
