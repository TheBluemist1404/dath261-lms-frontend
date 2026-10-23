import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/errors";
import { useAuthStore } from "@/stores/auth.store";
import { createReport, sendMessage } from "../api/workspace.api";
import {
	pageMessagesQuery,
	pageQuery,
	workspaceKeys,
	workspaceQuery,
} from "../api/workspace.queries";
import {
	useLiveMessages,
	withMessage,
} from "../collaboration/discussion-channel";
import { formatRelativeTime } from "../relative-time";
import type { PageMessage, Workspace } from "../types";
import { ErrorState, LoadingState } from "./query-state";
import { WorkspaceNotFound } from "./workspace-not-found";

const fieldClass =
	"mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const reportReasons = [
	"Inappropriate behavior",
	"Harassment or bullying",
	"Spam or advertising",
	"Other",
];

function senderName(message: PageMessage) {
	return (
		`${message.sender.firstName ?? ""} ${message.sender.lastName ?? ""}`.trim() ||
		"Former member"
	);
}

/**
 * Page-level discussion for collaborative workspaces (FR-CW-13). `passage` is
 * the text the user selected in the editor, shown as context only; messages
 * belong to the page.
 */
export function PageDiscussion({
	workspaceId,
	pageId,
	passage,
}: {
	workspaceId: string;
	pageId: string;
	passage?: string;
}) {
	const workspace = useQuery(workspaceQuery(workspaceId));
	const page = useQuery(pageQuery(pageId));
	const messages = useQuery(pageMessagesQuery(pageId));
	useLiveMessages(pageId, workspace.data?.type === "COLLABORATIVE");

	const failed = workspace.error ?? page.error ?? messages.error;
	if (failed) {
		if (getApiErrorStatus(failed) === 404) return <AccessRevoked />;
		return (
			<ErrorState
				title="Discussion could not be loaded"
				error={failed}
				onRetry={() => {
					workspace.refetch();
					page.refetch();
					messages.refetch();
				}}
			/>
		);
	}
	if (!workspace.data || !page.data || !messages.data) {
		return <LoadingState label="Loading discussion…" />;
	}
	if (workspace.data.type === "PERSONAL") return <WorkspaceNotFound />;

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<header>
				<h1 className="font-heading text-3xl font-bold tracking-tight">
					Contextual discussion
				</h1>
				<p className="mt-3 text-sm text-muted">
					{workspace.data.name} / {page.data.title}
				</p>
			</header>

			{passage && (
				<section className="rounded-xl border border-border bg-white p-6">
					<h2 className="font-heading text-lg font-semibold">
						Selected passage
					</h2>
					<blockquote className="mt-3">“{passage}”</blockquote>
				</section>
			)}

			<Discussion
				workspace={workspace.data}
				pageId={pageId}
				messages={messages.data}
			/>

			<Link
				to="/workspace/$id/pages/$pageId"
				params={{ id: workspaceId, pageId }}
				className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
			>
				Return to shared page
			</Link>
		</div>
	);
}

function Discussion({
	workspace,
	pageId,
	messages,
}: {
	workspace: Workspace;
	pageId: string;
	messages: PageMessage[];
}) {
	const messageId = useId();
	const queryClient = useQueryClient();
	const currentUserId = useAuthStore((state) => state.user?.id);
	const [draft, setDraft] = useState("");
	const [reporting, setReporting] = useState<PageMessage | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const send = useMutation({
		mutationFn: (content: string) => sendMessage(pageId, { content }),
		onSuccess: (message) => {
			queryClient.setQueryData<PageMessage[]>(
				workspaceKeys.messages(pageId),
				(current) => withMessage(current, message),
			);
			setDraft("");
		},
	});
	const archived = workspace.archivedAt !== null;
	const content = draft.trim();

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (content && !send.isPending) send.mutate(content);
	}

	return (
		<>
			<section
				aria-labelledby={`${messageId}-heading`}
				className="space-y-3 rounded-xl border border-border bg-white p-6"
			>
				<h2
					id={`${messageId}-heading`}
					className="font-heading text-lg font-semibold"
				>
					Discussion
				</h2>
				{messages.length === 0 && !send.isPending ? (
					<p className="text-sm text-muted">
						Start a discussion about this page.
					</p>
				) : (
					<ol className="space-y-4" aria-label="Messages">
						{messages.map((message) => (
							<li key={message.id} className="text-sm">
								<p className="text-muted">
									<span className="font-semibold text-ink">
										{senderName(message)}
									</span>{" "}
									·{" "}
									<time dateTime={message.createdAt}>
										{formatRelativeTime(message.createdAt)}
									</time>
								</p>
								<p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
									{message.content}
								</p>
								{message.sender.id !== currentUserId && (
									<button
										type="button"
										aria-label={`Report message from ${senderName(message)}`}
										onClick={() => {
											setNotice(null);
											setReporting(message);
										}}
										className="mt-1 text-xs font-semibold text-muted hover:text-primary hover:underline"
									>
										Report
									</button>
								)}
							</li>
						))}
						{send.isPending && (
							<li className="text-sm text-muted">
								<p>
									<span className="font-semibold">You</span> · Sending…
								</p>
								<p className="mt-1 whitespace-pre-wrap">{send.variables}</p>
							</li>
						)}
					</ol>
				)}
				{send.isError && (
					<p role="alert" className="text-sm text-error">
						Message could not be sent. {getApiErrorMessage(send.error)}
					</p>
				)}
				{notice && (
					<output className="block text-sm text-primary">{notice}</output>
				)}
			</section>

			{archived ? (
				<p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
					This workspace is archived. The discussion is read-only until an Owner
					restores it.
				</p>
			) : (
				<form onSubmit={submit} className="space-y-3">
					<div>
						<label htmlFor={messageId} className="text-sm font-semibold">
							Message
						</label>
						<textarea
							id={messageId}
							value={draft}
							rows={4}
							maxLength={2000}
							placeholder="Write a message…"
							readOnly={send.isPending}
							onChange={(event) => {
								setDraft(event.target.value);
								if (send.isError) send.reset();
							}}
							className={fieldClass}
						/>
					</div>
					<Button type="submit" disabled={!content || send.isPending}>
						{send.isPending
							? "Sending…"
							: send.isError
								? "Retry message"
								: "Send message"}
					</Button>
				</form>
			)}

			<ReportDialog
				message={reporting}
				workspaceName={workspace.name}
				onClose={() => setReporting(null)}
				onReported={() => {
					setReporting(null);
					setNotice("Report sent. An administrator will review it.");
				}}
			/>
		</>
	);
}

function ReportDialog({
	message,
	workspaceName,
	onClose,
	onReported,
}: {
	message: PageMessage | null;
	workspaceName: string;
	onClose: () => void;
	onReported: () => void;
}) {
	const reasonId = useId();
	const detailsId = useId();
	const [reason, setReason] = useState(reportReasons[0]);
	const [details, setDetails] = useState("");
	const report = useMutation({ mutationFn: createReport });

	function close() {
		setReason(reportReasons[0]);
		setDetails("");
		report.reset();
		onClose();
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!message) return;
		report.mutate(
			{
				targetType: "MESSAGE",
				targetId: message.id,
				reason,
				description: details.trim() || undefined,
			},
			{
				onSuccess: () => {
					setReason(reportReasons[0]);
					setDetails("");
					report.reset();
					onReported();
				},
			},
		);
	}

	return (
		<Dialog
			open={message !== null}
			onClose={close}
			title="Report shared content"
			description={`Target: ${workspaceName} / Discussion message. Report context is limited to this target.`}
		>
			<form onSubmit={submit} className="space-y-4">
				<div>
					<label htmlFor={reasonId} className="text-sm font-semibold">
						Reason
					</label>
					<select
						id={reasonId}
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						className={`${fieldClass} min-h-11`}
					>
						{reportReasons.map((option) => (
							<option key={option}>{option}</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor={detailsId} className="text-sm font-semibold">
						Details (optional)
					</label>
					<textarea
						id={detailsId}
						value={details}
						rows={3}
						maxLength={1000}
						onChange={(event) => setDetails(event.target.value)}
						className={fieldClass}
					/>
				</div>
				{report.isError && (
					<p role="alert" className="text-sm text-error">
						{getApiErrorMessage(report.error)}
					</p>
				)}
				<div className="flex justify-end gap-3">
					<Button variant="secondary" onClick={close}>
						Cancel
					</Button>
					<Button type="submit" disabled={report.isPending}>
						{report.isPending ? "Sending…" : "Send report"}
					</Button>
				</div>
			</form>
		</Dialog>
	);
}

function AccessRevoked() {
	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<header>
				<h1 className="font-heading text-3xl font-bold tracking-tight">
					Contextual discussion
				</h1>
				<p className="mt-3 text-sm text-muted">Workspace access ended</p>
			</header>
			<div className="rounded-xl border border-border bg-white p-6">
				<h2 className="font-heading text-lg font-semibold">Access revoked</h2>
				<p className="mt-2 text-sm">
					The protected page and discussion are no longer available. Return to
					your accessible workspaces.
				</p>
			</div>
			<Link
				to="/workspace"
				className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
			>
				Open my workspaces
			</Link>
		</div>
	);
}
