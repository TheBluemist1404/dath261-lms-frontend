import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { useMyCourses } from "@/features/courses/api/enrollment.queries";
import { MyCourseCard } from "@/features/courses/components/my-course-card";
import { recentPagesQuery } from "@/features/workspace/api/workspace.queries";
import {
	ErrorState,
	LoadingState,
} from "@/features/workspace/components/query-state";
import { useAuthStore } from "@/stores/auth.store";
import {
	type DashboardViewState,
	getDashboardGreeting,
	resolveDashboardViewState,
} from "../utils/dashboard-domain";
import { ContinueLearningCard } from "./continue-learning-card";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { UpcomingDeadlinesCard } from "./upcoming-deadlines-card";

const DASHBOARD_COURSE_LIMIT = 50;
const RECENT_PAGE_LIMIT = 3;

type LoadedDashboardState = Extract<DashboardViewState, { kind: "loaded" }>;

export function StudentDashboardView() {
	const userName = useAuthStore((state) => state.user?.name);
	const greeting = getDashboardGreeting(userName);

	const coursesQuery = useMyCourses({ limit: DASHBOARD_COURSE_LIMIT });

	function renderContent() {
		if (coursesQuery.isPending) {
			return <LoadingState label="Loading your dashboard…" />;
		}

		if (coursesQuery.isError) {
			return (
				<ErrorState
					title="Could not load your dashboard"
					error={coursesQuery.error}
					onRetry={() => void coursesQuery.refetch()}
				/>
			);
		}

		const viewState = resolveDashboardViewState(coursesQuery.data.data);

		switch (viewState.kind) {
			case "empty":
				return <DashboardEmptyState />;
			case "loaded":
				return <LoadedDashboardContent viewState={viewState} />;
			default: {
				const _exhaustive: never = viewState;
				return _exhaustive;
			}
		}
	}

	return (
		<div className="mx-auto w-full max-w-6xl min-w-0 space-y-6">
			<header className="space-y-2">
				<h1 className="font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
					{greeting}
				</h1>
				<p className="text-base text-muted">
					A little progress, a clearer understanding.
				</p>
			</header>

			{renderContent()}
		</div>
	);
}

function LoadedDashboardContent({
	viewState,
}: {
	viewState: LoadedDashboardState;
}) {
	const displayedCourses =
		viewState.inProgressCourses.length > 0
			? viewState.inProgressCourses
			: viewState.completedCourses;

	const coursesRowClass = viewState.featuredCourse
		? "lg:col-start-1 lg:row-start-2"
		: "lg:col-start-1 lg:row-start-1";

	return (
		<div className="min-w-0 space-y-6">
			{viewState.unavailableCount > 0 && (
				<UnavailableNotice count={viewState.unavailableCount} />
			)}

			<div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]">
				{viewState.featuredCourse && (
					<ContinueLearningCard
						course={viewState.featuredCourse}
						className="lg:col-start-1 lg:row-start-1"
					/>
				)}

				<UpcomingDeadlinesCard className="lg:col-start-2 lg:row-start-1" />

				<section
					aria-labelledby="your-courses-heading"
					className={`min-w-0 space-y-4 ${coursesRowClass}`}
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2
							id="your-courses-heading"
							className="font-heading text-xl font-semibold text-ink"
						>
							Your courses
						</h2>
						<Link
							to="/my-courses"
							search={{ page: 1 }}
							className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
						>
							View all courses
						</Link>
					</div>

					{displayedCourses.length > 0 ? (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{displayedCourses.map((course) => (
								<MyCourseCard key={course.enrollmentId} item={course} />
							))}
						</div>
					) : (
						<div className="rounded-xl border border-border bg-white p-6 text-sm text-muted">
							Your active courses are currently unavailable. You can review{" "}
							<Link
								to="/my-courses"
								search={{ page: 1, state: "UNAVAILABLE" }}
								className="font-semibold text-primary hover:underline"
							>
								unavailable courses
							</Link>{" "}
							or explore new courses in the catalog.
						</div>
					)}
				</section>

				<RecentPagesCard className="lg:col-start-2 lg:row-start-2" />
			</div>
		</div>
	);
}

function UnavailableNotice({ count }: { count: number }) {
	const title =
		count === 1
			? "One course is unavailable"
			: `${count} courses are unavailable`;

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-warning/25 bg-warning-subtle p-4 text-warning sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			<div className="flex min-w-0 items-start gap-3 sm:flex-1">
				<Icon
					name="alertTriangle"
					className="mt-0.5 size-5 shrink-0 text-warning"
				/>
				<div className="min-w-0 flex-1 space-y-1">
					<p className="text-sm font-semibold text-warning">{title}</p>
					<p className="text-xs leading-5 text-ink">
						Your enrollment history and completed progress are safely retained
						while access is paused.
					</p>
				</div>
			</div>
			<Link
				to="/my-courses"
				search={{ page: 1, state: "UNAVAILABLE" }}
				className="inline-flex min-h-11 shrink-0 items-center self-start rounded-lg px-3 text-sm font-semibold text-warning underline-offset-4 hover:underline sm:self-center"
			>
				View unavailable courses
			</Link>
		</div>
	);
}

function RecentPagesCard({ className }: { className?: string }) {
	const recentPages = useQuery(recentPagesQuery(RECENT_PAGE_LIMIT));

	return (
		<section
			aria-labelledby="recent-pages-heading"
			className={`min-w-0 rounded-xl border border-border bg-white p-5 sm:p-6 ${className ?? ""}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2
					id="recent-pages-heading"
					className="font-heading text-xl font-semibold text-ink"
				>
					Recent pages
				</h2>
				<Link
					to="/workspace"
					className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
				>
					Open workspace
				</Link>
			</div>

			<div className="mt-4">
				{recentPages.isPending ? (
					<LoadingState label="Loading recent pages…" />
				) : recentPages.isError ? (
					<ErrorState
						title="Could not load recent pages"
						error={recentPages.error}
						onRetry={() => void recentPages.refetch()}
					/>
				) : recentPages.data.length === 0 ? (
					<p className="text-sm text-muted">
						Pages you edit in your workspaces will appear here.
					</p>
				) : (
					<ul className="divide-y divide-border">
						{recentPages.data.map((hit) => (
							<li key={hit.page.id}>
								<Link
									to="/workspace/$id/pages/$pageId"
									params={{ id: hit.workspace.id, pageId: hit.page.id }}
									className="group flex min-h-11 items-center gap-3 py-3 transition-colors first:pt-0 last:pb-0 hover:text-primary"
								>
									<Icon
										name="file"
										className="size-4 shrink-0 text-muted group-hover:text-primary"
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium text-ink group-hover:text-primary">
											{hit.page.title}
										</span>
										<span className="block truncate text-xs text-muted">
											{hit.workspace.name}
										</span>
									</span>
									<Icon
										name="chevronRight"
										className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
									/>
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
