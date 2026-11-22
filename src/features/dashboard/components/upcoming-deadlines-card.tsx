import { Link } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";
import { Icon } from "@/components/ui/icon";
import { useMyDeadlines } from "@/features/courses/api/deadline.queries";
import {
	ErrorState,
	LoadingState,
} from "@/features/workspace/components/query-state";
import { formatDeadlineDateTime } from "@/lib/format/date";
import {
	formatDeadlineUrgency,
	sortDeadlinesSoonestFirst,
} from "../utils/dashboard-domain";

const DEADLINE_WINDOW_DAYS = 14;

export interface UpcomingDeadlinesCardProps {
	className?: string;
}

export function UpcomingDeadlinesCard({
	className,
}: UpcomingDeadlinesCardProps) {
	const { data, isPending, isError, error, refetch } =
		useMyDeadlines(DEADLINE_WINDOW_DAYS);

	const deadlines = data ? sortDeadlinesSoonestFirst(data) : [];

	return (
		<section
			aria-labelledby="coming-up-heading"
			className={twMerge(
				"min-w-0 rounded-xl border border-border bg-white p-5 sm:p-6",
				className,
			)}
		>
			<h2
				id="coming-up-heading"
				className="font-heading text-xl font-semibold text-ink"
			>
				Coming up
			</h2>

			<div className="mt-4">
				{isPending ? (
					<LoadingState label="Loading upcoming deadlines…" />
				) : isError ? (
					<ErrorState
						title="Could not load deadlines"
						error={error}
						onRetry={() => void refetch()}
					/>
				) : deadlines.length === 0 ? (
					<p className="text-sm text-muted">
						No deadlines due in the next 14 days.
					</p>
				) : (
					<ul className="divide-y divide-border">
						{deadlines.map((item) => {
							const urgency = formatDeadlineUrgency(item.deadline);
							const formattedDate = formatDeadlineDateTime(item.deadline);
							const noAttemptsLeft = item.attemptsUsed >= item.maxAttempts;

							return (
								<li key={`${item.courseId}-${item.blockId}`}>
									<Link
										to="/courses/$courseId/learn"
										params={{ courseId: item.courseId }}
										search={{ blockId: item.blockId }}
										className="group flex min-h-11 items-start gap-3 py-3.5 transition-colors first:pt-0 last:pb-0 hover:text-primary"
									>
										<span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
											<Icon name="calendar" className="size-4" />
										</span>

										<span className="min-w-0 flex-1 space-y-1">
											<span className="block break-words text-sm font-semibold text-ink group-hover:text-primary">
												{item.title}
											</span>
											<span className="block break-words text-xs text-muted">
												{item.courseTitle}
											</span>
											<span className="block text-xs font-medium text-ink">
												{formattedDate}
												{urgency ? ` · ${urgency}` : ""}
											</span>
											<span className="flex flex-wrap items-center gap-2 pt-0.5">
												<span className="text-xs text-muted">
													Attempts: {item.attemptsUsed}/{item.maxAttempts}
												</span>
												{item.allowLate && (
													<span className="inline-flex items-center rounded-full bg-primary-subtle px-2 py-0.5 text-[11px] font-medium text-primary">
														Late allowed
													</span>
												)}
												{noAttemptsLeft && (
													<span className="inline-flex items-center rounded-full bg-warning-subtle px-2 py-0.5 text-[11px] font-medium text-warning">
														No attempts left
													</span>
												)}
											</span>
										</span>

										<Icon
											name="chevronRight"
											className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
										/>
									</Link>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</section>
	);
}
