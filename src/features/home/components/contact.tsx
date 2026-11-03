// Placeholder address on the reserved .example domain, so no mail reaches a
// stranger. Swap in a real inbox if the team sets one up.
export const contactEmail = "hello@nodus.example";

const repos = [
	{
		label: "Frontend on GitHub",
		href: "https://github.com/TheBluemist1404/dath261-lms-frontend",
	},
	{
		label: "Backend on GitHub",
		href: "https://github.com/TheBluemist1404/dath261-lms-backend",
	},
];

export function Contact() {
	return (
		<section
			id="contact"
			aria-labelledby="contact-title"
			className="grid scroll-mt-28 gap-6 rounded-2xl bg-white p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center lg:scroll-mt-20"
		>
			<div>
				<h2 id="contact-title" className="font-heading text-2xl font-bold">
					Get in touch
				</h2>
				<p className="mt-3 max-w-xl text-base leading-7 text-muted">
					Nodus is built by Team 2 of CO3103 (class CC03) at Ho Chi Minh City
					University of Technology. Questions, feedback or a bug to report?
					Write to us.
				</p>
			</div>
			<div className="flex flex-col gap-3 md:items-end">
				<a
					href={`mailto:${contactEmail}`}
					className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
				>
					{contactEmail}
				</a>
				<ul className="flex flex-wrap gap-x-4 gap-y-1">
					{repos.map((repo) => (
						<li key={repo.href}>
							<a
								href={repo.href}
								target="_blank"
								rel="noreferrer"
								className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-primary hover:underline"
							>
								{repo.label}
							</a>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
