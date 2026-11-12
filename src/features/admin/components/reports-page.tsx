import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getApiErrorMessage } from "@/lib/http/errors";
import { reportListQuery } from "../api/moderation.queries";
import { formatShortDateTime } from "../format";
import type { AdminReportItem, ReportStatus } from "../types";
import {
	AdminPage,
	AdminTabs,
	cardClass,
	EmptyState,
	ErrorState,
	LoadingState,
} from "./admin-page";

const tabs = [
	{ label: "Open", value: "PENDING" },
	{ label: "Dismissed", value: "DISMISSED" },
	{ label: "Action taken", value: "ACTION_TAKEN" },
] as const;

export const reportStatusLabels: Record<ReportStatus, string> = {
	PENDING: "Open",
	DISMISSED: "Dismissed",
	ACTION_TAKEN: "Action taken",
};

export function reportTargetLabel(report: AdminReportItem) {
	switch (report.target.type) {
		case "COURSE":
			return `${report.target.name} · Course`;
		case "USER":
			return `User account · ${report.target.name}`;
		default:
			return report.target.name;
	}
}

/** Figma AD-04 Reports: the moderation queue, filtered by review status. */
export function ReportsPage() {
	const reportsQuery = useQuery(reportListQuery());
	const [filter, setFilter] = useState<ReportStatus>("PENDING");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const visible = useMemo(
		() =>
			(reportsQuery.data?.items ?? []).filter(
				(report) => report.status === filter,
			),
		[reportsQuery.data, filter],
	);
	const selected =
		visible.find((report) => report.id === selectedId) ?? visible[0] ?? null;

	return (
		<AdminPage
			title="Reports"
			description="Review submitted concerns with scoped target context and an action history."
		>
			<AdminTabs
				label="Filter reports"
				tabs={tabs}
				value={filter}
				onChange={setFilter}
			/>

			{reportsQuery.isPending ? (
				<LoadingState label="Loading reports…" />
			) : reportsQuery.isError ? (
				<ErrorState
					message={getApiErrorMessage(
						reportsQuery.error,
						"Unable to load reports.",
					)}
					onRetry={() => void reportsQuery.refetch()}
				/>
			) : visible.length === 0 ? (
				<EmptyState
					title="No reports to review."
					body="New reports will appear in this queue."
				/>
			) : (
				<>
					<div className={`${cardClass} overflow-x-auto`}>
						<table className="w-full min-w-[720px] border-collapse text-left text-xs">
							<thead className="bg-subtle font-semibold">
								<tr>
									<th scope="col" className="px-4 py-4">
										Target
									</th>
									<th scope="col" className="px-4 py-4">
										Reason
									</th>
									<th scope="col" className="px-4 py-4">
										Reported by / Time
									</th>
									<th scope="col" className="px-4 py-4">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{visible.map((report) => (
									<tr
										key={report.id}
										className={
											report.id === selected?.id ? "bg-canvas" : undefined
										}
									>
										<td className="px-4 py-3.5">
											<button
												type="button"
												aria-pressed={report.id === selected?.id}
												onClick={() => setSelectedId(report.id)}
												className="text-left hover:underline"
											>
												{reportTargetLabel(report)}
											</button>
										</td>
										<td className="px-4 py-3.5 text-muted">{report.reason}</td>
										<td className="px-4 py-3.5 text-muted">
											{report.reporter.name} ·{" "}
											{formatShortDateTime(report.createdAt)}
										</td>
										<td className="px-4 py-3.5 text-muted">
											{reportStatusLabels[report.status]}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{selected?.target.type === "COURSE" && (
						<div>
							<Link
								to="/admin/reports/$reportId"
								params={{ reportId: selected.id }}
								className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-hover"
							>
								Review course report
							</Link>
						</div>
					)}
				</>
			)}
		</AdminPage>
	);
}
