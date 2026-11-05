import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function CourseNotFoundState() {
	return (
		<main className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
			<div className="flex size-14 items-center justify-center rounded-2xl bg-subtle text-muted">
				<Icon name="alertCircle" className="size-7" />
			</div>

			<h1 className="mt-6 font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
				Course Not Found
			</h1>

			<p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
				The course you are looking for does not exist, has been archived, or is
				not currently accessible to the public.
			</p>

			<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
				<Link to="/catalog" className={buttonVariants({ variant: "primary" })}>
					Browse Catalog
				</Link>
				<Link to="/" className={buttonVariants({ variant: "outline" })}>
					Return Home
				</Link>
			</div>
		</main>
	);
}
