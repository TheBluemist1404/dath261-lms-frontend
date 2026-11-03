import { Link, type LinkProps } from "@tanstack/react-router";
import { Brand } from "./brand";

type Tab = { label: string } & Pick<LinkProps, "to" | "hash">;

// Testimonials and Contact are sections of the landing page.
const tabs: Tab[] = [
	{ label: "Home", to: "/" },
	{ label: "Catalog", to: "/catalog" },
	{ label: "Testimonials", to: "/", hash: "testimonials" },
	{ label: "Contact", to: "/", hash: "contact" },
];

const action =
	"inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors";

/** Top bar for signed-out visitors, after the Figma PA-01 catalog top bar. */
export function GuestHeader() {
	return (
		<header className="sticky top-0 z-20 grid grid-cols-[1fr_auto] items-center bg-white px-5 text-ink sm:px-8 lg:grid-cols-[1fr_auto_1fr]">
			<Link
				to="/"
				aria-label="Nodus home"
				className="flex h-16 items-center justify-self-start rounded-lg"
			>
				<Brand />
			</Link>
			<nav
				aria-label="Site"
				className="col-span-2 -mx-5 flex overflow-x-auto border-t border-border px-2 sm:-mx-8 sm:px-5 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:border-0 lg:px-0"
			>
				{tabs.map((tab) => (
					<Link
						key={tab.label}
						to={tab.to}
						hash={tab.hash}
						activeOptions={{ exact: true, includeHash: true }}
						activeProps={{ "aria-current": "page" }}
						className="group flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:text-ink data-[status=active]:text-ink"
					>
						<span className="relative py-1 after:absolute after:inset-x-1/2 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary after:transition-[left,right] after:duration-200 after:ease-out group-hover:after:inset-x-0 group-focus-visible:after:inset-x-0 group-data-[status=active]:after:inset-x-0">
							{tab.label}
						</span>
					</Link>
				))}
			</nav>
			<div className="col-start-2 row-start-1 flex items-center justify-end gap-2 lg:col-start-3">
				<Link
					to="/login"
					className={`${action} bg-subtle text-ink hover:bg-border`}
				>
					Log in
				</Link>
				<Link
					to="/register"
					className={`${action} bg-primary text-white hover:bg-primary-hover`}
				>
					Get started
				</Link>
			</div>
		</header>
	);
}
