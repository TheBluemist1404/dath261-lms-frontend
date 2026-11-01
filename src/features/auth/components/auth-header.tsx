import { Link } from "@tanstack/react-router";

export interface AuthHeaderProps {
	className?: string;
}

export function AuthHeader({ className = "" }: AuthHeaderProps) {
	return (
		<header
			className={`sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-white px-5 sm:px-8 lg:px-12 ${className}`}
		>
			<div className="flex items-center gap-6 sm:gap-8">
				<Link
					to="/"
					aria-label="Learner LMS home"
					className="flex items-center gap-2.5 text-primary transition-opacity hover:opacity-90"
				>
					<svg
						aria-hidden="true"
						className="size-6 shrink-0"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M12 5v16" />
						<path d="M20.001 19A2 2 0 0 0 22 17V5a2 2 0 0 0-1.999-2L16 3.002A5 5 0 0 0 12 5a5 5 0 0 0-4-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 1.999 2H8a5 5 0 0 1 4 2 5 5 0 0 1 4-2z" />
					</svg>
					<span className="font-heading text-lg font-bold tracking-tight text-primary">
						Learner LMS
					</span>
				</Link>

				<Link
					to="/"
					className="hidden text-sm font-medium text-muted transition-colors hover:text-ink sm:inline-block"
				>
					Explore courses
				</Link>
			</div>

			<div className="flex items-center gap-3">
				<Link
					to="/login"
					className="inline-flex h-10 items-center justify-center rounded-lg bg-subtle px-4 text-sm font-semibold text-ink transition-colors hover:bg-border/60 sm:px-5"
				>
					Log in
				</Link>
				<Link
					to="/register"
					className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:px-5"
				>
					Get started
				</Link>
			</div>
		</header>
	);
}
