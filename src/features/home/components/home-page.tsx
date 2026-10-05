const plannedCapabilities = [
	"Course learning and progress",
	"Personal study workspace",
	"Contextual course references",
	"Real-time study collaboration",
];

export function HomePage() {
	return (
		<section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
			<p className="text-sm font-semibold uppercase tracking-[0.2em]">
				DATN 261
			</p>
			<h1 className="mt-4 max-w-3xl text-5xl font-bold tracking-tight">
				Learner-Oriented LMS
			</h1>
			<p className="mt-6 max-w-2xl text-lg leading-8">
				A learning platform that keeps official course material, personal
				knowledge, collaboration, assessments, and progress connected in one
				permission-aware experience.
			</p>

			<ul className="mt-10 grid gap-4 sm:grid-cols-2">
				{plannedCapabilities.map((capability) => (
					<li
						className="rounded-xl border border-black/10 p-5 font-medium"
						key={capability}
					>
						{capability}
					</li>
				))}
			</ul>
		</section>
	);
}
