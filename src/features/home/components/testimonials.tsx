// Sample voices for the course project; the people are fictional.
const testimonials = [
	{
		quote:
			"My notes finally live next to the lesson they came from. Revising for the final took half the time.",
		name: "Khánh Vy",
		role: "Computer Science student",
	},
	{
		quote:
			"I publish the course once and students build on it in their own workspaces. Questions got a lot more specific.",
		name: "Dr. Thu Hà",
		role: "Lecturer, Operating Systems",
	},
	{
		quote:
			"Our group wrote the lab report on one page at the same time. No more merging five copies the night before.",
		name: "Tuấn Phạm",
		role: "Software Engineering student",
	},
];

function initials(name: string) {
	return name
		.replace(/^Dr\.\s*/, "")
		.split(/\s+/)
		.map((part) => part[0])
		.slice(0, 2)
		.join("");
}

export function Testimonials() {
	return (
		<section
			id="testimonials"
			aria-labelledby="testimonials-title"
			className="scroll-mt-28 lg:scroll-mt-20"
		>
			<h2 id="testimonials-title" className="font-heading text-2xl font-bold">
				What learners say
			</h2>
			<ul className="mt-6 grid gap-4 md:grid-cols-3">
				{testimonials.map((item) => (
					<li key={item.name}>
						<figure className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-white p-6">
							<blockquote className="text-base leading-7 text-ink">
								“{item.quote}”
							</blockquote>
							<figcaption className="flex items-center gap-3">
								<span
									aria-hidden="true"
									className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary"
								>
									{initials(item.name)}
								</span>
								<span className="flex flex-col">
									<span className="text-sm font-semibold">{item.name}</span>
									<span className="text-xs text-muted">{item.role}</span>
								</span>
							</figcaption>
						</figure>
					</li>
				))}
			</ul>
		</section>
	);
}
