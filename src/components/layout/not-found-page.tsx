import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-16 text-ink">
			<div className="max-w-lg text-center">
				<p className="font-heading text-7xl font-bold tracking-tight text-primary sm:text-8xl">
					404
				</p>
				<h1 className="mt-6 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
					Page not found
				</h1>
				<p className="mt-4 text-base leading-7 text-muted">
					We couldn’t find this page. The link may be incorrect, or the page may
					have moved.
				</p>
				<Link
					to="/"
					className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
				>
					Back to home
				</Link>
			</div>
		</main>
	);
}
