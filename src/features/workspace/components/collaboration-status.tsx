import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ConnectionStatus } from "../collaboration/collaboration";
import type { WorkspaceMember } from "../types";

function initials(member: WorkspaceMember) {
	const first = member.user.firstName?.[0] ?? "";
	const last = member.user.lastName?.[0] ?? "";
	return (first + last || member.user.email[0] || "?").toUpperCase();
}

function fullName(member: WorkspaceMember) {
	return (
		`${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim() ||
		member.user.email
	);
}

/**
 * Who is on the page. While connected it counts the viewer plus everyone
 * present; otherwise presence is stale, so it shows the last known people.
 */
export function PresenceIndicator({
	status,
	members,
	currentUserId,
	presentUserIds,
}: {
	status: ConnectionStatus;
	members: WorkspaceMember[];
	currentUserId: string;
	presentUserIds: string[];
}) {
	const live = status === "connected";
	const shown = live
		? members.filter(
				(member) =>
					member.userId === currentUserId ||
					presentUserIds.includes(member.userId),
			)
		: members;
	const label = live
		? shown.length === 1
			? "Only you are editing"
			: `${shown.length} people editing`
		: "Last seen collaborators";

	return (
		<div className="flex w-fit items-center gap-3 rounded-lg border border-border bg-white px-4 py-2">
			<ul className="flex -space-x-2" aria-label={label}>
				{shown.slice(0, 4).map((member) => (
					<li
						key={member.userId}
						title={fullName(member)}
						className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary-subtle text-xs font-semibold text-primary"
					>
						<span aria-hidden="true">{initials(member)}</span>
						<span className="sr-only">{fullName(member)}</span>
					</li>
				))}
				{shown.length > 4 && (
					<li className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-subtle text-xs font-semibold text-muted">
						+{shown.length - 4}
					</li>
				)}
			</ul>
			<span className="text-sm text-muted" aria-hidden="true">
				{label}
			</span>
		</div>
	);
}

const bannerCopy: Partial<
	Record<ConnectionStatus, { title: string; detail: string }>
> = {
	connecting: {
		title: "Connecting",
		detail: "Editing starts once the page is synchronized",
	},
	reconnecting: { title: "Reconnecting", detail: "Editing paused" },
	disconnected: { title: "Disconnected", detail: "Edits retained" },
};

/** Status and banner for every state in which editing is paused. */
export function ConnectionBanner({
	status,
	onRetry,
}: {
	status: ConnectionStatus;
	onRetry: () => void;
}) {
	const copy = bannerCopy[status];
	if (!copy) return null;

	return (
		<div aria-live="polite" className="space-y-3">
			<div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
				<p className="font-semibold">
					{copy.title} · {copy.detail}
				</p>
				<p className="mt-1">
					The visible page and your pending edits are kept. Editing resumes
					after the page synchronizes again.
				</p>
			</div>
			{status === "disconnected" && (
				<Button onClick={onRetry}>Retry synchronization</Button>
			)}
		</div>
	);
}

export function AccessEnded() {
	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-border bg-white p-6">
				<span className="text-muted">
					<Icon name="lock" />
				</span>
				<h2 className="mt-3 font-heading text-2xl font-semibold">
					Workspace access has ended.
				</h2>
				<p className="mt-2 text-sm text-muted">
					Editing and shared content are unavailable. Your own personal
					workspace remains accessible.
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
