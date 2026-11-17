import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export interface CatalogEmptyStateProps {
	onClearFilters: () => void;
}

export function CatalogEmptyState({ onClearFilters }: CatalogEmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-12 text-center">
			<div className="flex size-14 items-center justify-center rounded-2xl bg-subtle text-muted">
				<Icon name="search" className="size-6" />
			</div>
			<h3 className="mt-4 font-heading text-xl font-bold text-ink">
				No matching courses found
			</h3>
			<p className="mt-1.5 max-w-md text-sm text-muted">
				We couldn't find any courses matching your search criteria. Try refining
				your keywords or clearing the active filters.
			</p>
			<div className="mt-6">
				<Button variant="secondary" size="md" onClick={onClearFilters}>
					Clear filters
				</Button>
			</div>
		</div>
	);
}
