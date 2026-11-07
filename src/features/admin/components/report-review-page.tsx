import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getApiErrorMessage } from "@/lib/http/errors";
import {
	dismissReport,
	setCourseSuspended,
	setUserSuspended,
} from "../api/moderation.api";
import { adminKey, reportQuery } from "../api/moderation.queries";
import { formatLongDateTime, formatShortDateTime } from "../format";
import type { AdminReport, ReportHistoryAction } from "../types";
import {
	ActionButton,
	AdminPage,
	cardClass,
	ErrorState,
	LoadingState,
	Notice,
} from "./admin-page";
import { dialogCopy } from "./moderation-copy";
import { ModerationDialog } from "./moderation-dialog";

const historyTitles: Record<ReportHistoryAction, string> = {
	RECEIVED: "Report received",
	DISMISSED: "Report dismissed",
	COURSE_SUSPENDED: "Course suspended",
	USER_SUSPENDED: "Account suspended",
};

const targetSubtitles: Partial<Record<AdminReport["target"]["type"], string>> =
	{
		COURSE: "Course target",
		MESSAGE: "Reported discussion message",
	};

/** The account or course a suspension from this report applies to. */
function suspensionTarget(report: AdminReport) {
	if (report.target.type === "COURSE") {
		return {
			kind: "course" as const,
			id: report.target.id,
			label: "Suspend course",
			copy: dialogCopy.suspendCourse(report.target.name),
		};
	}
	if (report.target.type === "MESSAGE" && report.message) {
		return {
			kind: "user" as const,
			id: report.message.author.id,
			label: "Suspend related user",
			copy: dialogCopy.suspendUser(report.message.author.name),
		};
	}
	return null;
}

function ReviewOutcome({ report }: { report: AdminReport }) {
	if (report.status === "DISMISSED") {
		return (
			<Notice tone="info" title="Report dismissed">
				The review decision and reason are recorded.
			</Notice>
		);
	}
	if (report.status === "ACTION_TAKEN") {
		const action = [...report.history]
			.reverse()
			.find(
				(entry) =>
					entry.action === "COURSE_SUSPENDED" ||
					entry.action === "USER_SUSPENDED",
			);
		return (
			<Notice tone="success" title="Report resolved · Action taken">
				{action ? `${historyTitles[action.action]}. ` : ""}The action is
				recorded with the reviewer and timestamp.
			</Notice>
		);
	}
	return null;
}

function ActionHistory({ report }: { report: AdminReport }) {
	return (
		<section className={`${cardClass} flex flex-col gap-3 p-3`}>
			<h2 className="text-sm">Action history</h2>
			<ol className="flex flex-col gap-3">
				{report.history.map((entry) => (
					<li key={entry.id} className="flex items-start gap-2">
						<span className="mt-0.5 flex size-4 items-center justify-center text-muted">
							{entry.action === "RECEIVED" ? (
								<span className="scale-[0.67]">
									<Icon name="reports" />
								</span>
							) : (
								<span aria-hidden="true">✓</span>
							)}
						</span>
						<div>
							<p className="text-[10px] font-semibold">
								{historyTitles[entry.action]}
							</p>
							<p className="text-[10px] text-muted">
								{entry.actor.name} · {formatShortDateTime(entry.createdAt)} ICT
								{entry.reasonRecorded ? " · Reason recorded" : ""}
							</p>
						</div>
					</li>
				))}
			</ol>
		</section>
	);
}

/** Figma AD-05 Report review: scoped target context, decision and history. */
export function ReportReviewPage({ reportId }: { reportId: string }) {
	const queryClient = useQueryClient();
	const query = useQuery(reportQuery(reportId));
	const [dialog, setDialog] = useState<"dismiss" | "suspend" | null>(null);

	const mutation = useMutation({
		mutationFn: async ({
			report,
			action,
			reason,
		}: {
			report: AdminReport;
			action: "dismiss" | "suspend";
			reason: string;
		}) => {
			if (action === "dismiss") return dismissReport(report.id, reason);
			const target = suspensionTarget(report);
			if (!target) throw new Error("This report has no suspension target.");
			const input = { reason, reportId: report.id };
			return target.kind === "course"
				? setCourseSuspended(target.id, true, input)
				: setUserSuspended(target.id, true, input);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: adminKey });
			setDialog(null);
		},
	});

	const backLink = (
		<Link
			to="/admin/reports"
			className="self-start px-3 text-xs font-semibold text-primary hover:underline"
		>
			Back to reports
		</Link>
	);

	if (query.isPending) {
		return (
			<AdminPage title="Report review" description={`Report #${reportId}`}>
				<LoadingState label="Loading report…" />
			</AdminPage>
		);
	}
	if (query.isError) {
		return (
			<AdminPage title="Report review" description={`Report #${reportId}`}>
				<ErrorState
					message={getApiErrorMessage(query.error, "Unable to load report.")}
					onRetry={() => void query.refetch()}
				/>
				{backLink}
			</AdminPage>
		);
	}

	const report = query.data;
	const isMessage = report.target.type === "MESSAGE";
	const pending = report.status === "PENDING";
	const target = suspensionTarget(report);
	const copy =
		dialog === "suspend" && target
			? target.copy
			: dialogCopy.dismissReport(report.id);
	const subtitle = targetSubtitles[report.target.type];

	return (
		<AdminPage
			title={isMessage ? "Review shared-content report" : "Report review"}
			description={
				subtitle ? `Report #${report.id} · ${subtitle}` : `Report #${report.id}`
			}
		>
			<section
				className={`${cardClass} flex max-w-[680px] flex-col gap-3 p-3 text-ink`}
			>
				<h2 className="text-sm">
					{isMessage ? "Scoped reported context" : "Reported concern"}
				</h2>
				<p className="text-xl leading-7">{report.target.name}</p>
				{isMessage && report.message ? (
					<>
						<p className="text-xs text-muted">
							Reporter: {report.reporter.name} · Author:{" "}
							{report.message.author.name}
							<br />
							{formatLongDateTime(report.createdAt)} · Reason: {report.reason}
						</p>
						<div className="rounded-lg border border-border p-3">
							<h3 className="text-sm">Reported message</h3>
							<p className="mt-2 text-xs text-muted">
								“{report.message.content}”
							</p>
						</div>
						<p className="text-xs text-muted">
							Only the reported message and operational target metadata are
							exposed. Unrelated shared pages and private notes are unavailable.
						</p>
					</>
				) : (
					<>
						<p className="text-xs text-muted">
							{report.reason} · Reported by {report.reporter.name}
							<br />
							{formatLongDateTime(report.createdAt)}
						</p>
						{report.description && (
							<p className="text-sm">{report.description}</p>
						)}
						{report.target.available ? (
							<div className="rounded-lg border border-border p-3">
								<h3 className="text-sm">Scoped target context</h3>
								<p className="mt-2 text-xs text-muted">
									Public course title, description, lecturer, publication status
									and moderation status. Private notes and learner records are
									excluded.
								</p>
							</div>
						) : (
							<Notice tone="warning" title="Target is unavailable">
								The report remains reviewable from retained operational
								metadata. No inaccessible content is exposed.
							</Notice>
						)}
					</>
				)}
				<ReviewOutcome report={report} />
				{pending && (
					<div className="flex flex-wrap gap-2">
						<ActionButton
							tone="outline"
							onClick={() => {
								mutation.reset();
								setDialog("dismiss");
							}}
						>
							Dismiss report
						</ActionButton>
						{target && (
							<ActionButton
								tone="danger"
								onClick={() => {
									mutation.reset();
									setDialog("suspend");
								}}
							>
								{target.label}
							</ActionButton>
						)}
					</div>
				)}
			</section>

			{!isMessage && (
				<div className="max-w-[680px]">
					<ActionHistory report={report} />
				</div>
			)}

			{backLink}

			<ModerationDialog
				open={dialog !== null}
				{...copy}
				busy={mutation.isPending}
				error={
					mutation.isError
						? getApiErrorMessage(
								mutation.error,
								"Unable to record the decision. Try again.",
							)
						: null
				}
				onClose={() => setDialog(null)}
				onConfirm={(reason) => {
					if (dialog) mutation.mutate({ report, action: dialog, reason });
				}}
			/>
		</AdminPage>
	);
}
