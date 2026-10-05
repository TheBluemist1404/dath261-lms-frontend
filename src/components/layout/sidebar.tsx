import { Link } from "@tanstack/react-router";
import { Icon, type IconName } from "@/components/ui/icon";
import { type UserRole, useAuthStore } from "@/stores/auth.store";

const menus: Record<UserRole, { label: string; icon: IconName }[]> = {
	student: [
		{ label: "Dashboard", icon: "dashboard" },
		{ label: "My Courses", icon: "courses" },
		{ label: "Catalog", icon: "book" },
		{ label: "Workspaces", icon: "workspace" },
		{ label: "Calendar", icon: "calendar" },
		{ label: "Notifications", icon: "bell" },
	],
	lecturer: [
		{ label: "My Courses", icon: "courses" },
		{ label: "Workspaces", icon: "workspace" },
		{ label: "Calendar", icon: "calendar" },
		{ label: "Notifications", icon: "bell" },
	],
	admin: [
		{ label: "Overview", icon: "dashboard" },
		{ label: "Users", icon: "users" },
		{ label: "Courses", icon: "courses" },
		{ label: "Reports", icon: "reports" },
	],
};

export default function Sidebar() {
	const role = useAuthStore((state) => state.user?.role);
	const items = role
		? menus[role]
		: [{ label: "Catalog", icon: "book" } as const];
	const caption = role === "admin" ? "Administration" : (role ?? "Explore");

	return (
		<aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col overflow-y-auto bg-white p-6 min-[1200px]:flex">
			<p className="mb-2 text-xs font-medium uppercase leading-[18px] text-muted">
				{caption}
			</p>
			<nav aria-label="Primary navigation" className="flex flex-col gap-2">
				{/* Use the homepage until each feature has its own route. */}
				{items.map((item, index) => (
					<Link
						key={item.label}
						to="/"
						activeProps={{ "aria-current": index === 0 ? "page" : undefined }}
						className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${index === 0 ? "bg-primary-subtle text-primary" : "text-muted hover:bg-subtle hover:text-ink"}`}
					>
						<Icon name={item.icon} />
						{item.label}
					</Link>
				))}
			</nav>
		</aside>
	);
}
