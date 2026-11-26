import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/features/auth/routing/guards";
import {
	NotificationsPage,
	type NotificationTab,
} from "@/features/notifications/components/notifications-page";

export interface NotificationsSearch {
	tab?: NotificationTab;
	page?: number;
}

export function validateNotificationsSearch(
	search: Record<string, unknown>,
): NotificationsSearch {
	const pageNum = Number(search.page);
	return {
		tab: search.tab === "unread" ? "unread" : undefined,
		page: Number.isInteger(pageNum) && pageNum > 1 ? pageNum : undefined,
	};
}

export const Route = createFileRoute("/_layout/notifications")({
	validateSearch: validateNotificationsSearch,
	beforeLoad: requireAuth,
	component: NotificationsRouteComponent,
});

function NotificationsRouteComponent() {
	const { tab = "all", page = 1 } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<NotificationsPage
			tab={tab}
			page={page}
			onChange={(next) =>
				void navigate({
					search: {
						tab: next.tab === "unread" ? "unread" : undefined,
						page: next.page > 1 ? next.page : undefined,
					},
				})
			}
		/>
	);
}
