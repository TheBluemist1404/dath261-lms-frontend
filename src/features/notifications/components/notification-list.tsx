import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useMarkNotificationRead } from "../api/notification.queries";
import type { AppNotification } from "../types";
import { getNotificationTarget } from "../utils/notification-target";

/** Marks an unread item read, then opens its target (if it has one). */
export function useOpenNotification(onOpened?: () => void) {
	const navigate = useNavigate();
	const markRead = useMarkNotificationRead();

	return (notification: AppNotification) => {
		if (!notification.readAt) markRead.mutate(notification.id);
		const target = getNotificationTarget(notification);
		onOpened?.();
		if (!target) return;
		void navigate({
			to: "/courses/$courseId/learn",
			params: { courseId: target.courseId },
			search: target.blockId ? { blockId: target.blockId } : {},
		});
	};
}

export function NotificationList({
	notifications,
	onOpen,
}: {
	notifications: AppNotification[];
	onOpen: (notification: AppNotification) => void;
}) {
	return (
		<ul className="flex flex-col gap-3">
			{notifications.map((notification) => {
				const unread = !notification.readAt;
				return (
					<li key={notification.id}>
						<button
							type="button"
							onClick={() => onOpen(notification)}
							className={`flex w-full items-start gap-2 rounded-lg px-2 py-4 text-left hover:bg-subtle ${unread ? "bg-primary-subtle/40" : "bg-white"}`}
						>
							<span className="mt-0.5 text-ink">
								<Icon name="bell" className="size-5" />
							</span>
							<span className="flex min-w-0 flex-1 flex-col gap-1">
								<span className="text-sm font-semibold text-ink">
									{notification.title}
									{unread ? <span className="sr-only"> (unread)</span> : null}
								</span>
								<span className="text-sm text-muted">
									{notification.message}
								</span>
							</span>
							{unread ? (
								<span
									aria-hidden="true"
									data-testid="unread-dot"
									className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
								/>
							) : null}
						</button>
					</li>
				);
			})}
		</ul>
	);
}

export function NotificationsLoading() {
	return (
		<output
			aria-label="Loading notifications"
			className="block p-6 text-center text-sm text-muted"
		>
			Loading notifications...
		</output>
	);
}

export function NotificationsError({ onRetry }: { onRetry: () => void }) {
	return (
		<div role="alert" className="flex flex-col items-start gap-3 p-4">
			<p className="text-sm text-error">We could not load notifications.</p>
			<Button variant="secondary" size="sm" onClick={onRetry}>
				Retry
			</Button>
		</div>
	);
}

export function NotificationsEmpty({ unreadOnly }: { unreadOnly?: boolean }) {
	return (
		<div className="flex flex-col gap-1 p-4">
			<p className="text-sm font-semibold text-ink">
				{unreadOnly ? "No unread notifications." : "No notifications yet."}
			</p>
			<p className="text-sm text-muted">
				New course content and released results will appear here.
			</p>
		</div>
	);
}
