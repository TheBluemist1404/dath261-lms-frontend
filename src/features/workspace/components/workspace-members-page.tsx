import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/errors";
import { useAuthStore } from "@/stores/auth.store";
import {
	workspaceMembersQuery,
	workspaceQuery,
} from "../api/workspace.queries";
import { getWorkspaceCapabilities } from "../capabilities";
import { useAddMember, useRemoveMember } from "../hooks/use-member-mutations";
import type {
	AddMemberInput,
	Workspace,
	WorkspaceMember,
	WorkspaceMemberRole,
} from "../types";
import { roleLabels } from "../workspace-labels";
import { ErrorState, LoadingState } from "./query-state";
import { WorkspaceNotFound } from "./workspace-not-found";

const fieldClass =
	"mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const roleDescriptions: Record<WorkspaceMemberRole, string> = {
	OWNER: "Immutable",
	CO_OWNER: "Can manage Members",
	MEMBER: "Can read and edit",
};

const roleOrder: Record<WorkspaceMemberRole, number> = {
	OWNER: 0,
	CO_OWNER: 1,
	MEMBER: 2,
};

function memberName(member: WorkspaceMember) {
	const name = `${member.user.firstName} ${member.user.lastName}`.trim();
	return name || member.user.email;
}

export function WorkspaceMembersPage({ workspaceId }: { workspaceId: string }) {
	const workspace = useQuery(workspaceQuery(workspaceId));
	const members = useQuery(workspaceMembersQuery(workspaceId));

	const failed = workspace.error ?? members.error;
	if (failed) {
		return getApiErrorStatus(failed) === 404 ? (
			<WorkspaceNotFound />
		) : (
			<ErrorState
				title="Members could not be loaded"
				error={failed}
				onRetry={() => {
					workspace.refetch();
					members.refetch();
				}}
			/>
		);
	}
	if (!workspace.data || !members.data) {
		return <LoadingState label="Loading members…" />;
	}

	return <WorkspaceMembers workspace={workspace.data} members={members.data} />;
}

function WorkspaceMembers({
	workspace,
	members,
}: {
	workspace: Workspace;
	members: WorkspaceMember[];
}) {
	const currentUserId = useAuthStore((state) => state.user?.id);
	const { canManageMembers, canManageCoOwners } =
		getWorkspaceCapabilities(workspace);
	const [adding, setAdding] = useState(false);
	const [removing, setRemoving] = useState<WorkspaceMember | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const isPersonal = workspace.type === "PERSONAL";

	const sorted = [...members].sort(
		(a, b) =>
			roleOrder[a.role] - roleOrder[b.role] ||
			memberName(a).localeCompare(memberName(b)),
	);

	function canRemove(member: WorkspaceMember) {
		if (member.role === "OWNER" || member.userId === currentUserId)
			return false;
		return member.role === "CO_OWNER" ? canManageCoOwners : canManageMembers;
	}

	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<header>
				<Link
					to="/workspace/$id"
					params={{ id: workspace.id }}
					className="text-sm font-semibold text-primary hover:underline"
				>
					&larr; {workspace.name}
				</Link>
				<h1 className="mt-3 font-heading text-3xl font-bold tracking-tight">
					Members
				</h1>
				<p className="mt-3 text-sm text-muted">
					{workspace.name} · Workspace membership governs access.
				</p>
				<p className="mt-3 inline-flex rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary">
					Your role: {roleLabels[workspace.currentUserRole]}
				</p>
			</header>

			{isPersonal && (
				<p className="rounded-lg bg-subtle p-4 text-sm text-muted">
					This is your personal workspace. It stays private, so collaborators
					cannot be added.
				</p>
			)}
			{workspace.archivedAt && (
				<div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
					<p className="font-semibold">Workspace archived</p>
					<p className="mt-1">
						Membership is retained but cannot change until an Owner restores the
						workspace.
					</p>
				</div>
			)}

			<section className="space-y-4 rounded-xl border border-border bg-white p-6">
				<h2 className="font-heading text-xl font-semibold">
					Workspace members
				</h2>
				<ul className="divide-y divide-border" aria-label="Workspace members">
					{sorted.map((member) => (
						<li
							key={member.userId}
							className="flex flex-wrap items-center justify-between gap-3 py-3"
						>
							<div className="min-w-0">
								<p className="font-semibold [overflow-wrap:anywhere]">
									{memberName(member)}
									{member.userId === currentUserId && (
										<span className="font-normal text-muted"> (you)</span>
									)}
								</p>
								<p className="text-sm text-muted">
									{roleLabels[member.role]} · {roleDescriptions[member.role]}
								</p>
								<p className="text-xs text-muted [overflow-wrap:anywhere]">
									{member.user.email}
								</p>
							</div>
							{canRemove(member) && (
								<Button
									variant="secondary"
									aria-label={`Remove ${memberName(member)}`}
									onClick={() => {
										setNotice(null);
										setRemoving(member);
									}}
								>
									Remove
								</Button>
							)}
						</li>
					))}
				</ul>
				<p className="text-sm text-muted">
					Owner status is immutable. Multiple Owners are supported.
				</p>
				{notice && (
					<output className="block text-sm text-primary">{notice}</output>
				)}
				{canManageMembers && (
					<div className="space-y-3 border-t border-border pt-4">
						<Button
							onClick={() => {
								setNotice(null);
								setAdding(true);
							}}
						>
							Add member
						</Button>
						<p className="text-sm text-muted">
							{canManageCoOwners
								? "Owners can add and remove Co-owners and Members."
								: "Co-owners can add and remove ordinary Members only."}
						</p>
					</div>
				)}
			</section>

			{canManageMembers && (
				<AddMemberDialog
					open={adding}
					onClose={() => setAdding(false)}
					workspaceId={workspace.id}
					canAddCoOwners={canManageCoOwners}
					onAdded={(member) => {
						setAdding(false);
						setNotice(
							`${memberName(member)} was added as ${roleLabels[member.role]}.`,
						);
					}}
				/>
			)}
			<RemoveMemberDialog
				member={removing}
				workspace={workspace}
				onClose={() => setRemoving(null)}
				onRemoved={(member) => {
					setRemoving(null);
					setNotice(`${memberName(member)} was removed.`);
				}}
			/>
		</div>
	);
}

function AddMemberDialog({
	open,
	onClose,
	workspaceId,
	canAddCoOwners,
	onAdded,
}: {
	open: boolean;
	onClose: () => void;
	workspaceId: string;
	canAddCoOwners: boolean;
	onAdded: (member: WorkspaceMember) => void;
}) {
	const emailId = useId();
	const roleId = useId();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<AddMemberInput["role"]>("MEMBER");
	const add = useAddMember(workspaceId);
	const trimmed = email.trim();

	function close() {
		setEmail("");
		setRole("MEMBER");
		add.reset();
		onClose();
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!trimmed) return;
		add.mutate(
			{ email: trimmed, role: canAddCoOwners ? role : "MEMBER" },
			{
				onSuccess: (member) => {
					setEmail("");
					setRole("MEMBER");
					add.reset();
					onAdded(member);
				},
			},
		);
	}

	return (
		<Dialog
			open={open}
			onClose={close}
			title="Add an existing user"
			description={
				canAddCoOwners
					? "They get access right away. Owners may add Co-owners or Members."
					: "They get access right away. Co-owners may add Members only."
			}
		>
			<form onSubmit={submit} className="space-y-4">
				<div>
					<label htmlFor={emailId} className="text-sm font-semibold">
						Email of an existing platform user
					</label>
					<input
						id={emailId}
						type="email"
						value={email}
						autoComplete="off"
						onChange={(event) => setEmail(event.target.value)}
						className={fieldClass}
					/>
				</div>
				{canAddCoOwners && (
					<div>
						<label htmlFor={roleId} className="text-sm font-semibold">
							Membership role
						</label>
						<select
							id={roleId}
							value={role}
							onChange={(event) =>
								setRole(event.target.value as AddMemberInput["role"])
							}
							className={fieldClass}
						>
							<option value="MEMBER">Member · Can read and edit</option>
							<option value="CO_OWNER">Co-owner · Can manage Members</option>
						</select>
					</div>
				)}
				{add.isError && (
					<p role="alert" className="text-sm text-error">
						{getApiErrorMessage(add.error)}
					</p>
				)}
				<div className="flex justify-end gap-3">
					<Button variant="secondary" onClick={close}>
						Cancel
					</Button>
					<Button type="submit" disabled={!trimmed || add.isPending}>
						{add.isPending ? "Adding…" : "Add member"}
					</Button>
				</div>
			</form>
		</Dialog>
	);
}

function RemoveMemberDialog({
	member,
	workspace,
	onClose,
	onRemoved,
}: {
	member: WorkspaceMember | null;
	workspace: Workspace;
	onClose: () => void;
	onRemoved: (member: WorkspaceMember) => void;
}) {
	const remove = useRemoveMember(workspace.id);
	const coOwner = member?.role === "CO_OWNER";
	const name = member ? memberName(member) : "";

	function close() {
		remove.reset();
		onClose();
	}

	return (
		<Dialog
			open={member !== null}
			onClose={close}
			title={
				coOwner
					? `Remove ${name} as Co-owner?`
					: `Remove ${name} from ${workspace.name}?`
			}
			description={
				coOwner
					? "Only Owners can remove Co-owners. Shared access and editing end immediately."
					: "Their access to this workspace and its pages ends immediately."
			}
		>
			{remove.isError && (
				<p role="alert" className="text-sm text-error">
					{getApiErrorMessage(remove.error)}
				</p>
			)}
			<div className="flex justify-end gap-3">
				<Button variant="secondary" onClick={close}>
					Cancel
				</Button>
				<Button
					variant="danger"
					disabled={remove.isPending}
					onClick={() => {
						if (!member) return;
						remove.mutate(member.userId, {
							onSuccess: () => {
								remove.reset();
								onRemoved(member);
							},
						});
					}}
				>
					{remove.isPending
						? "Removing…"
						: coOwner
							? "Remove Co-owner"
							: "Remove member"}
				</Button>
			</div>
		</Dialog>
	);
}
