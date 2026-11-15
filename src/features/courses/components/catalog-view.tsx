import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { publishedCourseListQuery } from "../api/course.queries";
import type { CatalogQuery } from "../types/course.types";
import { CatalogEmptyState } from "./catalog-empty-state";
import { CatalogErrorState } from "./catalog-error-state";
import { CatalogFilters } from "./catalog-filters";
import { CatalogHero } from "./catalog-hero";
import { CatalogSearchBar } from "./catalog-search-bar";
import { CourseGrid } from "./course-grid";
import { CoursePagination } from "./course-pagination";

export interface CatalogViewProps {
	searchParams: CatalogQuery;
}

export function CatalogView({ searchParams }: CatalogViewProps) {
	const navigate = useNavigate();

	const {
		data: coursePage,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery(publishedCourseListQuery(searchParams));

	const courses = coursePage?.data ?? [];

	const handleSearchChange = (search: string) => {
		navigate({
			to: "/catalog",
			search: {
				...searchParams,
				search: search.trim() ? search.trim() : undefined,
				page: 1,
			},
		});
	};

	const handleEnrollmentOpenChange = (open: boolean) => {
		navigate({
			to: "/catalog",
			search: {
				...searchParams,
				enrollmentOpen: open ? true : undefined,
				page: 1,
			},
		});
	};

	const handleSortChange = (
		sortBy: NonNullable<CatalogQuery["sortBy"]>,
		sortOrder: NonNullable<CatalogQuery["sortOrder"]>,
	) => {
		navigate({
			to: "/catalog",
			search: {
				...searchParams,
				sortBy,
				sortOrder,
				page: 1,
			},
		});
	};

	const handlePageChange = (page: number) => {
		navigate({
			to: "/catalog",
			search: {
				...searchParams,
				page,
			},
		});
	};

	const handleResetFilters = () => {
		navigate({
			to: "/catalog",
			search: {
				page: 1,
				limit: searchParams.limit,
			},
		});
	};

	if (isError) {
		return (
			<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
				<CatalogHero />
				<CatalogErrorState error={error} onRetry={() => refetch()} />
			</div>
		);
	}

	const totalCount = coursePage?.meta.total ?? 0;

	return (
		<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
			<CatalogHero />

			<section
				aria-label="Course catalog search and filters"
				className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5"
			>
				<CatalogSearchBar
					value={searchParams.search}
					onChange={handleSearchChange}
				/>
				<CatalogFilters
					enrollmentOpen={searchParams.enrollmentOpen}
					onEnrollmentOpenChange={handleEnrollmentOpenChange}
					sortBy={searchParams.sortBy}
					sortOrder={searchParams.sortOrder}
					onSortChange={handleSortChange}
				/>
			</section>

			<div
				aria-live="polite"
				aria-atomic="true"
				className="flex items-center justify-between text-sm text-muted"
			>
				<span>
					{isLoading ? (
						"Loading available courses..."
					) : (
						<>
							Showing{" "}
							<span className="font-semibold text-ink">{courses.length}</span>{" "}
							{courses.length === 1 ? "course" : "courses"}
							{totalCount > courses.length ? ` of ${totalCount}` : ""}
						</>
					)}
				</span>
			</div>

			{isLoading ? (
				<CourseGrid courses={[]} isLoading={true} />
			) : courses.length === 0 ? (
				<CatalogEmptyState onClearFilters={handleResetFilters} />
			) : (
				<>
					<CourseGrid courses={courses} isLoading={false} />
					{coursePage && coursePage.meta.totalPages > 1 && (
						<CoursePagination
							meta={coursePage.meta}
							onPageChange={handlePageChange}
						/>
					)}
				</>
			)}
		</div>
	);
}
