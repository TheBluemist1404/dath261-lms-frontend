import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function DashboardEmptyState() {
	return (
		<div className="min-w-0 space-y-6">
			<section className="min-w-0 rounded-xl border border-border bg-white p-6">
				<Icon name="book" className="size-8 text-ink" />
				<h2 className="mt-4 font-heading text-xl font-bold text-ink">
					Your learning journey starts here.
				</h2>
				<p className="mt-2 max-w-xl text-sm leading-6 text-muted">
					Explore a course, enroll instantly, and start building your personal
					knowledge.
				</p>
				<div className="mt-5">
					<Link
						to="/catalog"
						className={buttonVariants({ variant: "primary", size: "md" })}
					>
						Explore courses
					</Link>
				</div>
			</section>

			<Link
				to="/workspace"
				className="block w-full min-w-0 rounded-xl border border-border bg-white p-6 transition-colors hover:border-primary"
			>
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-1.5">
						<h2 className="font-heading text-lg font-semibold text-ink">
							Your private workspace is ready
						</h2>
						<p className="max-w-2xl text-sm leading-6 text-muted">
							Only you can access your default personal workspace. Create your
							first study page whenever inspiration arrives.
						</p>
					</div>
					<Icon
						name="chevronRight"
						className="mt-1 size-5 shrink-0 text-muted"
					/>
				</div>
			</Link>
		</div>
	);
}
