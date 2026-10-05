import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { useAuthStore } from "@/stores/auth.store";
import { Brand } from "./brand";

export default function Header() {
	const user = useAuthStore((state) => state.user);
	const status = useAuthStore((state) => state.status);
	const initials = user?.name
		.trim()
		.split(/\s+/)
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-white px-5 text-ink sm:px-8">
			<Link to="/" aria-label="Nodus home" className="rounded-lg">
				<Brand audience={user?.role} />
			</Link>
			<div className="flex items-center gap-2">
				{user ? (
					<>
						{/* Use the homepage until these feature routes are implemented. */}
						<Link
							to="/"
							aria-label="Notifications"
							className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle"
						>
							<Icon name="bell" />
						</Link>
						<Link
							to="/"
							aria-label={`Profile for ${user.name}`}
							className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary"
						>
							<span aria-hidden="true">{initials || "N"}</span>
						</Link>
					</>
				) : status === "unauthenticated" ? (
					<Link
						to="/"
						className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary-subtle"
					>
						Sign in
					</Link>
				) : null}
			</div>
		</header>
	);
}
