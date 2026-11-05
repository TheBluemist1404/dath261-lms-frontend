import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getApiErrorMessage } from "@/lib/http/errors";
import { useMyCourses } from "../api/enrollment.queries";
import type { LearnerCourseState } from "../types/enrollment.types";
import { MyCourseCard } from "./my-course-card";
import { MyCoursesTabs } from "./my-courses-tabs";

export interface MyCoursesViewProps {
	page?: number;
	state?: LearnerCourseState;
	onFilterChange?: (filters: {
		page?: number;
		state?: LearnerCourseState;
	}) => void;
}

export function MyCoursesView({
	page: pageProp = 1,
	state: stateProp = "IN_PROGRESS",
	onFilterChange,
}: MyCoursesViewProps) {
	const [internalTab, setInternalTab] = useState<LearnerCourseState>(stateProp);
	const [internalPage, setInternalPage] = useState<number>(pageProp);

	const activeTab = onFilterChange ? stateProp : internalTab;
	const currentPage = onFilterChange ? pageProp : internalPage;

	const { data, isLoading, isError, error, refetch } = useMyCourses({
		state: activeTab,
		page: currentPage,
		limit: 9,
	});

	function handleTabChange(tab: LearnerCourseState) {
		setInternalTab(tab);
		setInternalPage(1);
		onFilterChange?.({ state: tab, page: 1 });
	}

	function handlePageChange(newPage: number) {
		setInternalPage(newPage);
		onFilterChange?.({ state: activeTab, page: newPage });
	}

	const courses = data?.data ?? [];
	const meta = data?.meta;

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
			<header className="flex flex-col gap-2">
				<h1 className="font-heading text-3xl font-bold text-ink">My Courses</h1>
				<p className="text-sm text-muted">
					Continue where you left off or review past achievements.
				</p>
			</header>

			<MyCoursesTabs activeState={activeTab} onChange={handleTabChange} />

			{isLoading ? (
				<section
					aria-label="Loading enrolled courses"
					className="flex h-64 items-center justify-center"
				>
					<p className="animate-pulse text-sm text-muted">
						Loading your courses...
					</p>
				</section>
			) : isError ? (
				<div
					role="alert"
					className="flex flex-col items-center justify-center rounded-2xl border border-error/20 bg-error/5 p-12 text-center text-error"
				>
					<Icon name="alertCircle" className="mb-3 size-8 text-error" />
					<h3 className="font-heading text-lg font-bold text-ink">
						Failed to load courses
					</h3>
					<p className="mt-1 max-w-md text-sm text-muted">
						{getApiErrorMessage(
							error,
							"We encountered an issue retrieving your enrolled courses. Please check your connection and try again.",
						)}
					</p>
					<Button
						variant="primary"
						size="sm"
						onClick={() => refetch()}
						className="mt-4"
					>
						Retry
					</Button>
				</div>
			) : courses.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-canvas p-12 text-center">
					<Icon name="courses" className="mb-3 size-8 text-muted" />
					<h3 className="font-heading text-lg font-bold text-ink">
						{activeTab === "IN_PROGRESS" && "No active courses"}
						{activeTab === "UNAVAILABLE" && "No unavailable courses"}
						{activeTab === "COMPLETED" && "No completed courses"}
					</h3>
					<p className="mt-1 max-w-md text-sm text-muted">
						{activeTab === "IN_PROGRESS" &&
							"You are not currently enrolled in any courses. Explore the catalog to find your next course."}
						{activeTab === "UNAVAILABLE" &&
							"None of your enrolled courses are currently unavailable."}
						{activeTab === "COMPLETED" &&
							"You haven't completed any courses yet. Keep learning to achieve your first certificate."}
					</p>
					{activeTab === "IN_PROGRESS" && (
						<div className="mt-6">
							<Link
								to="/catalog"
								className={buttonVariants({
									variant: "primary",
									size: "md",
								})}
							>
								Explore Catalog
							</Link>
						</div>
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{courses.map((item) => (
						<MyCourseCard key={item.enrollmentId} item={item} />
					))}
				</div>
			)}

			{meta && meta.totalPages > 1 && (
				<nav
					aria-label="Pagination"
					className="mt-6 flex items-center justify-between border-t border-border pt-4"
				>
					<Button
						variant="outline"
						size="sm"
						disabled={!meta.hasPrevPage && !meta.hasPreviousPage}
						onClick={() => handlePageChange(currentPage - 1)}
						className="gap-1"
					>
						<Icon name="chevronLeft" className="size-4" />
						<span>Previous</span>
					</Button>
					<span className="text-xs text-muted">
						Page {meta.page} of {meta.totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={!meta.hasNextPage}
						onClick={() => handlePageChange(currentPage + 1)}
						className="gap-1"
					>
						<span>Next</span>
						<Icon name="chevronRight" className="size-4" />
					</Button>
				</nav>
			)}
		</main>
	);
}
