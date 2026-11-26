import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
	latestNotificationsQuery,
	useMarkAllNotificationsRead,
} from "../api/notification.queries";
import { formatUnreadBadge } from "../utils/notification-target";
import {
	NotificationList,
	NotificationsEmpty,
	NotificationsError,
	NotificationsLoading,
	useOpenNotification,
} from "./notification-list";

/** Header bell: unread badge, plus a dropdown (a bottom sheet at phone width). */
export function NotificationBell() {
	const [open, setOpen] = useState(false);
	const panelId = useId();
	const containerRef = useRef<HTMLDivElement>(null);
	const latest = useQuery(latestNotificationsQuery());
	const markAll = useMarkAllNotificationsRead();
	const openNotification = useOpenNotification(() => setOpen(false));

	const unreadCount = latest.data?.meta.unreadCount ?? 0;
	const badge = formatUnreadBadge(unreadCount);
	const items = latest.data?.data ?? [];

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				aria-label={
					unreadCount > 0
						? `Notifications, ${unreadCount} unread`
						: "Notifications"
				}
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => setOpen((value) => !value)}
				className="relative flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle"
			>
				<Icon name="bell" />
				{badge ? (
					<span
						aria-hidden="true"
						data-testid="notification-badge"
						className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[11px] font-semibold leading-none text-white"
					>
						{badge}
					</span>
				) : null}
			</button>

			{open ? (
				<>
					<div
						aria-hidden="true"
						className="fixed inset-0 z-30 bg-ink/30 sm:hidden"
					/>
					<div
						id={panelId}
						role="dialog"
						aria-label="Notifications"
						className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80dvh] flex-col rounded-t-2xl border border-border bg-white shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[480px] sm:w-[360px] sm:rounded-xl"
					>
						<div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
							<h2 className="text-base font-semibold text-ink">
								Notifications
							</h2>
							{unreadCount > 0 ? (
								<button
									type="button"
									onClick={() => markAll.mutate()}
									disabled={markAll.isPending}
									className="min-h-9 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary-subtle disabled:opacity-60"
								>
									Mark all as read
								</button>
							) : null}
						</div>
						<div className="flex-1 overflow-y-auto p-2">
							{latest.isPending ? (
								<NotificationsLoading />
							) : latest.isError ? (
								<NotificationsError onRetry={() => void latest.refetch()} />
							) : items.length === 0 ? (
								<NotificationsEmpty />
							) : (
								<NotificationList
									notifications={items}
									onOpen={openNotification}
								/>
							)}
						</div>
						<div className="border-t border-border px-4 py-3">
							<Link
								to="/notifications"
								onClick={() => setOpen(false)}
								className="text-xs font-semibold text-primary hover:underline"
							>
								View all notifications
							</Link>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
