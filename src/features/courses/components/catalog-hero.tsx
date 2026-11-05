import heroIllustration from "@/assets/illustrations/catalog-hero.svg";

export function CatalogHero() {
	return (
		<section className="relative overflow-hidden rounded-3xl bg-primary-subtle p-6 sm:p-8 lg:p-10">
			<div className="flex flex-col-reverse items-center justify-between gap-8 lg:flex-row">
				<div className="flex max-w-2xl flex-col gap-3">
					<span className="text-xs font-bold uppercase tracking-wider text-primary">
						Discover & Learn
					</span>
					<h1 className="font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
						Explore courses
					</h1>
					<p className="text-base leading-relaxed text-muted sm:text-lg">
						Discover curated courses taught by university lecturers and industry
						leaders. Build your knowledge with structured syllabi, contextual
						notes, and hands-on practice.
					</p>
				</div>
				<div className="w-full max-w-[280px] shrink-0 sm:max-w-[320px]">
					<img
						src={heroIllustration}
						alt="Illustration representing course discovery and connected learning"
						className="h-auto w-full object-contain"
						width={320}
						height={200}
					/>
				</div>
			</div>
		</section>
	);
}
