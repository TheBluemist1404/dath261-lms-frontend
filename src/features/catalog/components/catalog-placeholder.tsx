import { Link } from "@tanstack/react-router";

// Placeholder for Figma PA-01 Catalog until FE #19 builds the real page.
export function CatalogPlaceholder() {
	return (
		<section className="mx-auto flex w-full max-w-[1050px] flex-col items-start gap-4 rounded-2xl bg-white px-6 py-10 sm:px-10">
			<h1 className="font-heading text-3xl font-bold tracking-tight">
				Explore courses
			</h1>
			<p className="max-w-xl text-base leading-7 text-muted">
				The course catalog is on its way. Soon you will be able to browse every
				published course here.
			</p>
			<Link
				to="/"
				className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary-subtle"
			>
				← Back to home
			</Link>
		</section>
	);
}
