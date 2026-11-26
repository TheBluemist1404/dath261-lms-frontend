import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
	NOTIFICATIONS_PAGE_LIMIT,
	notificationListQuery,
	useMarkAllNotificationsRead,
} from "../api/notification.queries";
import {
	NotificationList,
	NotificationsEmpty,
	NotificationsError,
	NotificationsLoading,
	useOpenNotification,
} from "./notification-list";

export type NotificationTab = "all" | "unread";

const tabs: ReadonlyArray<{ label: string; value: NotificationTab }> = [
	{ label: "All", value: "all" },
	{ label: "Unread", value: "unread" },
];

// Figma SL-08 · Notifications.
export function NotificationsPage({
	tab,
	page,
	onChange,
}: {
	tab: NotificationTab;
	page: number;
	onChange: (next: { tab: NotificationTab; page: number }) => void;
}) {
	const list = useQuery(
		notificationListQuery({
			unread: tab === "unread" ? true : undefined,
			page,
			limit: NOTIFICATIONS_PAGE_LIMIT,
		}),
	);
	const markAll = useMarkAllNotificationsRead();
	const openNotification = useOpenNotification();

	const items = list.data?.data ?? [];
	const meta = list.data?.meta;

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 text-ink">
			<header>
				<h1 className="font-heading text-[32px] font-semibold leading-[42px]">
					Notifications
				</h1>
				<p className="mt-3 text-sm text-muted">
					Updates that help you continue learning and collaborating.
				</p>
			</header>

			<div
				className="grid grid-cols-2 gap-1"
				role="tablist"
				aria-label="Notification filter"
			>
				{tabs.map((item) => (
					<button
						key={item.value}
						type="button"
						role="tab"
						aria-selected={tab === item.value}
						onClick={() => onChange({ tab: item.value, page: 1 })}
						className={`min-h-10 rounded-lg px-3 text-left text-sm font-semibold ${tab === item.value ? "bg-primary-subtle text-primary" : "text-ink hover:bg-subtle"}`}
					>
						{item.label}
					</button>
				))}
			</div>

			{list.isPending ? (
				<NotificationsLoading />
			) : list.isError ? (
				<NotificationsError onRetry={() => void list.refetch()} />
			) : items.length === 0 ? (
				<NotificationsEmpty unreadOnly={tab === "unread"} />
			) : (
				<>
					<NotificationList notifications={items} onOpen={openNotification} />
					<div>
						<button
							type="button"
							onClick={() => markAll.mutate()}
							disabled={markAll.isPending || (meta?.unreadCount ?? 0) === 0}
							className="min-h-9 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-subtle disabled:opacity-60"
						>
							Mark all as read
						</button>
					</div>
					{meta && meta.totalPages > 1 ? (
						<nav
							aria-label="Notifications pagination"
							className="flex items-center justify-between gap-2"
						>
							<Button
								variant="secondary"
								size="sm"
								disabled={!meta.hasPrevPage}
								onClick={() => onChange({ tab, page: page - 1 })}
							>
								Previous
							</Button>
							<span className="text-sm text-muted">
								Page {meta.page} of {meta.totalPages}
							</span>
							<Button
								variant="secondary"
								size="sm"
								disabled={!meta.hasNextPage}
								onClick={() => onChange({ tab, page: page + 1 })}
							>
								Next
							</Button>
						</nav>
					) : null}
				</>
			)}
		</section>
	);
}
