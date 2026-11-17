import { Button } from "@/components/ui/button";
import type { PageMeta } from "../types/course.types";

export interface CoursePaginationProps {
	meta: PageMeta;
	onPageChange: (page: number) => void;
}

export function CoursePagination({
	meta,
	onPageChange,
}: CoursePaginationProps) {
	const { page, totalPages, hasNextPage, hasPrevPage } = meta;

	if (totalPages <= 1) return null;

	const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

	return (
		<nav
			aria-label="Catalog pagination"
			className="mt-10 flex items-center justify-center gap-2"
		>
			<Button
				variant="secondary"
				size="sm"
				disabled={!hasPrevPage}
				onClick={() => onPageChange(page - 1)}
				aria-label="Previous page"
			>
				Previous
			</Button>

			<div className="flex items-center gap-1">
				{pages.map((p) => {
					const isCurrent = p === page;
					return (
						<Button
							key={p}
							variant={isCurrent ? "primary" : "ghost"}
							size="sm"
							onClick={() => onPageChange(p)}
							aria-current={isCurrent ? "page" : undefined}
							aria-label={`Page ${p}`}
							className="size-9 p-0"
						>
							{p}
						</Button>
					);
				})}
			</div>

			<Button
				variant="secondary"
				size="sm"
				disabled={!hasNextPage}
				onClick={() => onPageChange(page + 1)}
				aria-label="Next page"
			>
				Next
			</Button>
		</nav>
	);
}
