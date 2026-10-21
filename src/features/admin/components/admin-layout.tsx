import { Link, Outlet } from "@tanstack/react-router";
import Header from "@/components/layout/header";
import { Icon, type IconName } from "@/components/ui/icon";

// Figma START-01 Administrator menu. Only Overview has a route in Week 41;
// the rest stay disabled until their own issues add them.
const upcomingMenu: { label: string; icon: IconName }[] = [
	{ label: "Users", icon: "users" },
	{ label: "Courses", icon: "courses" },
	{ label: "Reports", icon: "reports" },
];

export function AdminLayout() {
	return (
		<div className="min-h-dvh bg-canvas text-ink">
			<Header />
			<div className="flex min-w-0">
				<aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col overflow-y-auto bg-white p-6 min-[1200px]:flex">
					<p className="mb-2 text-xs font-medium uppercase leading-[18px] text-muted">
						Administration
					</p>
					<nav
						aria-label="Administration navigation"
						className="flex flex-col gap-2"
					>
						<Link
							to="/admin"
							activeOptions={{ exact: true }}
							activeProps={{
								"aria-current": "page",
								className: "bg-primary-subtle text-primary",
							}}
							inactiveProps={{
								className: "text-muted hover:bg-subtle hover:text-ink",
							}}
							className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold"
						>
							<Icon name="dashboard" />
							Overview
						</Link>
						{upcomingMenu.map((item) => (
							<span
								key={item.label}
								aria-disabled="true"
								className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted opacity-60"
							>
								<Icon name={item.icon} />
								{item.label}
							</span>
						))}
					</nav>
				</aside>
				<main className="min-w-0 flex-1 px-5 py-8 sm:px-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
