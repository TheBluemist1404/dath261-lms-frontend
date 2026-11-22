import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	openReportCountQuery,
	platformStatsQuery,
} from "../api/moderation.queries";
import type { PlatformStats } from "../types";
import { AdminPage, cardClass, EmptyState } from "./admin-page";

// Figma AD-01 Operational overview (Populated, No data, Loading, Failure).
// Data: GET /admin/stats (BE PR #51) and the open report count from
// GET /admin/reports?status=PENDING. The Figma "Released result summary" also
// shows a released result count and a score distribution; GET /admin/stats
// has neither, so only the average score is shown.

const count = new Intl.NumberFormat("en-US");
const percent = new Intl.NumberFormat("en-US", {
	style: "percent",
	maximumFractionDigits: 0,
});
const score = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

/** Figma "No data": no courses and no enrollments to aggregate yet. */
function hasNoActivity(stats: PlatformStats) {
	return stats.courses.total === 0 && stats.enrollments.total === 0;
}

function StatTile({ value, detail }: { value: string; detail: string }) {
	return (
		<li className={`${cardClass} flex flex-col gap-1 p-4`}>
			<p className="text-xl font-semibold leading-7 text-ink">{value}</p>
			<p className="text-xs text-muted">{detail}</p>
		</li>
	);
}

function ProgressRow({ label, value }: { label: string; value: number }) {
	const text = percent.format(value);
	return (
		<div className="flex flex-col gap-1">
			<div className="flex justify-between text-[10px] text-muted">
				<span>{label}</span>
				<span className="text-primary">{text}</span>
			</div>
			<div
				role="progressbar"
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(value * 100)}
				className="h-1 rounded-full bg-subtle"
			>
				<div className="h-1 rounded-full bg-primary" style={{ width: text }} />
			</div>
		</div>
	);
}

function OverviewCard({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className={`${cardClass} flex flex-col gap-3 p-4`}>
			<h2 className="text-sm">{title}</h2>
			{children}
		</section>
	);
}

function Populated({
	stats,
	openReports,
}: {
	stats: PlatformStats;
	openReports: number;
}) {
	const { users, courses, enrollments } = stats;
	return (
		<>
			<ul
				aria-label="Platform statistics"
				className="grid gap-4 min-[900px]:grid-cols-3"
			>
				<StatTile
					value={count.format(users.total)}
					detail={`Registered users · ${count.format(users.students)} Students / ${count.format(users.lecturers)} Lecturers`}
				/>
				<StatTile
					value={count.format(courses.published)}
					detail={`Published courses · ${count.format(courses.draft)} Draft / ${count.format(courses.suspended)} Suspended`}
				/>
				<StatTile
					value={count.format(enrollments.active)}
					detail="Active enrollments across available courses"
				/>
			</ul>

			<div className="grid items-start gap-4 min-[900px]:grid-cols-2">
				<OverviewCard title="Course completion">
					<p className="text-2xl font-semibold text-primary">
						{percent.format(stats.completionRate)}
					</p>
					<p className="text-xs text-muted">
						Lecturer-confirmed completion among retained enrollment records.
					</p>
					<ProgressRow
						label="Confirmed Completed"
						value={stats.completionRate}
					/>
				</OverviewCard>
				<OverviewCard title="Released result summary">
					<p className="text-2xl font-semibold text-ink">
						{stats.averageQuizScore === null
							? "—"
							: `${score.format(stats.averageQuizScore * 10)} / 10`}
					</p>
					<p className="text-xs text-muted">Aggregate normalized score</p>
				</OverviewCard>
			</div>

			<OverviewCard title="Moderation queue">
				<p className="text-xs text-muted">
					{count.format(openReports)} open{" "}
					{openReports === 1 ? "report requires" : "reports require"} review.
					Report context is limited to the target and the permitted moderation
					action.
				</p>
			</OverviewCard>
			<nav aria-label="Admin shortcuts" className="flex flex-wrap gap-3">
				<Link
					to="/admin/reports"
					className="inline-flex min-h-10 min-w-[160px] items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover"
				>
					Review reports
				</Link>
				<Link
					to="/admin/users"
					className="inline-flex min-h-10 min-w-[160px] items-center justify-center rounded-lg border border-border px-4 text-xs font-semibold text-ink hover:bg-subtle"
				>
					Manage users
				</Link>
				<Link
					to="/admin/courses"
					className="inline-flex min-h-10 min-w-[160px] items-center justify-center rounded-lg border border-border px-4 text-xs font-semibold text-ink hover:bg-subtle"
				>
					Manage courses
				</Link>
			</nav>
		</>
	);
}

/** Figma "Loading": two placeholder cards. */
function LoadingCards() {
	return (
		<output aria-label="Loading overview" className="flex flex-col gap-4">
			{[0, 1].map((key) => (
				<div
					key={key}
					aria-hidden="true"
					className={`${cardClass} flex flex-col gap-2 p-4`}
				>
					<span className="h-2 w-36 rounded bg-subtle" />
					<span className="h-2 w-28 rounded bg-subtle" />
					<span className="h-2 w-20 rounded bg-subtle" />
				</div>
			))}
		</output>
	);
}

/** Figma "Failure". */
function Failure({ onRetry }: { onRetry: () => void }) {
	return (
		<div role="alert" className="flex flex-col items-start gap-4">
			<div className="w-full">
				<EmptyState
					title="We could not load this view."
					body="Your existing data is safe. Check your connection and try again."
				/>
			</div>
			<button
				type="button"
				onClick={onRetry}
				className="inline-flex min-h-10 min-w-[160px] items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover"
			>
				Retry
			</button>
		</div>
	);
}

/** Figma AD-01: replaces the week 41 AdminOverviewPlaceholder on /admin. */
export function AdminOverviewPage() {
	const statsQuery = useQuery(platformStatsQuery());
	const reportsQuery = useQuery(openReportCountQuery());

	let content: ReactNode;
	if (statsQuery.isError || reportsQuery.isError) {
		content = (
			<Failure
				onRetry={() => {
					if (statsQuery.isError) void statsQuery.refetch();
					if (reportsQuery.isError) void reportsQuery.refetch();
				}}
			/>
		);
	} else if (statsQuery.isPending || reportsQuery.isPending) {
		content = <LoadingCards />;
	} else if (hasNoActivity(statsQuery.data)) {
		content = (
			<EmptyState
				title="No platform activity yet."
				body="Aggregate metrics will appear as users enroll and courses publish."
			/>
		);
	} else {
		content = (
			<Populated stats={statsQuery.data} openReports={reportsQuery.data} />
		);
	}

	return (
		<AdminPage
			title="Operational overview"
			description="Aggregate activity across Nodus. Private learning records remain scoped to their owners and lecturers."
		>
			{content}
		</AdminPage>
	);
}
