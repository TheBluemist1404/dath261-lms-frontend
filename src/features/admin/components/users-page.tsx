import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getApiErrorMessage } from "@/lib/http/errors";
import { updateUserStatus } from "../api/moderation.api";
import { adminKey, adminUserListQuery } from "../api/moderation.queries";
import { formatDate } from "../format";
import type { AdminUser, UserRoleDto } from "../types";
import {
	ActionButton,
	AdminPage,
	AdminTabs,
	cardClass,
	ErrorState,
	LoadingState,
	Notice,
	SearchField,
} from "./admin-page";
import { dialogCopy } from "./moderation-copy";
import { ModerationDialog } from "./moderation-dialog";

type UserFilter = "ALL" | "ACTIVE" | "SUSPENDED";
const tabs = [
	{ label: "All users", value: "ALL" },
	{ label: "Active", value: "ACTIVE" },
	{ label: "Suspended", value: "SUSPENDED" },
] as const;

const roleLabels: Record<UserRoleDto, string> = {
	STUDENT: "Student",
	LECTURER: "Lecturer",
	ADMIN: "Administrator",
};

// BE PR #36 allows null first and last names.
const fullName = (user: AdminUser) =>
	[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

/** Figma AD-02 Users: account availability, without changing roles. */
export function UsersPage() {
	const queryClient = useQueryClient();
	const usersQuery = useQuery(adminUserListQuery());
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<UserFilter>("ALL");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const users = usersQuery.data?.items ?? [];
	const visible = useMemo(() => {
		const term = search.trim().toLocaleLowerCase();
		return users.filter(
			(user) =>
				(filter === "ALL" || user.status === filter) &&
				`${fullName(user)} ${user.email}`.toLocaleLowerCase().includes(term),
		);
	}, [users, filter, search]);
	const selected =
		visible.find((user) => user.id === selectedId) ?? visible[0] ?? null;
	const suspended = selected?.status === "SUSPENDED";

	const mutation = useMutation({
		mutationFn: ({ user, reason }: { user: AdminUser; reason: string }) =>
			updateUserStatus(user.id, {
				status: user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
				reason,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: adminKey });
			setDialogOpen(false);
		},
	});

	const copy = selected
		? suspended
			? dialogCopy.restoreUser(fullName(selected))
			: dialogCopy.suspendUser(fullName(selected))
		: null;

	return (
		<AdminPage
			title="Users"
			description="Manage account availability without changing registered account roles."
		>
			<SearchField
				label="Find user"
				placeholder="Search name or email"
				value={search}
				onChange={setSearch}
			/>
			<AdminTabs
				label="Filter users"
				tabs={tabs}
				value={filter}
				onChange={setFilter}
			/>

			{usersQuery.isPending ? (
				<LoadingState label="Loading users…" />
			) : usersQuery.isError ? (
				<ErrorState
					message={getApiErrorMessage(
						usersQuery.error,
						"Unable to load users.",
					)}
					onRetry={() => void usersQuery.refetch()}
				/>
			) : (
				<>
					<div className={`${cardClass} overflow-x-auto`}>
						<table className="w-full min-w-[720px] border-collapse text-left text-xs">
							<thead className="bg-subtle font-semibold">
								<tr>
									<th scope="col" className="px-4 py-3.5">
										User
									</th>
									<th scope="col" className="px-4 py-3.5">
										Account role
									</th>
									<th scope="col" className="px-4 py-3.5">
										Status
									</th>
									<th scope="col" className="px-4 py-3.5">
										Registered
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{visible.map((user) => (
									<tr
										key={user.id}
										className={
											user.id === selected?.id ? "bg-canvas" : undefined
										}
									>
										<td className="px-4 py-3.5">
											<button
												type="button"
												aria-pressed={user.id === selected?.id}
												onClick={() => setSelectedId(user.id)}
												className="text-left hover:underline"
											>
												{fullName(user)} · {user.email}
											</button>
										</td>
										<td className="px-4 py-3.5 text-muted">
											{roleLabels[user.role]}
										</td>
										<td className="px-4 py-3.5 text-muted">
											{user.status === "SUSPENDED" ? "Suspended" : "Active"}
										</td>
										<td className="px-4 py-3.5 text-muted">
											{formatDate(user.createdAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{selected && copy && (
						<section
							aria-label="Account summary"
							className={`${cardClass} flex max-w-3xl flex-col items-start gap-3 p-4`}
						>
							<h2 className="text-sm font-semibold">
								{fullName(selected)} · Account summary
							</h2>
							<p className="text-xs text-muted">
								{roleLabels[selected.role]} · Registered{" "}
								{formatDate(selected.createdAt)}
							</p>
							<p className="text-xs text-muted">
								Only operational account metadata is shown. Personal notes,
								submissions and grading records are outside this view.
							</p>
							{suspended && (
								<div className="self-stretch">
									<Notice tone="warning" title="Account suspended">
										Sign-in and protected actions are unavailable. Data and
										membership history are retained.
									</Notice>
								</div>
							)}
							<ActionButton
								tone={suspended ? "primary" : "danger"}
								onClick={() => {
									mutation.reset();
									setDialogOpen(true);
								}}
							>
								{suspended ? "Restore account" : "Suspend account"}
							</ActionButton>
						</section>
					)}
				</>
			)}

			{selected && copy && (
				<ModerationDialog
					open={dialogOpen}
					{...copy}
					busy={mutation.isPending}
					error={
						mutation.isError
							? getApiErrorMessage(
									mutation.error,
									"Unable to update the account. Try again.",
								)
							: null
					}
					onClose={() => setDialogOpen(false)}
					onConfirm={(reason) => mutation.mutate({ user: selected, reason })}
				/>
			)}
		</AdminPage>
	);
}
