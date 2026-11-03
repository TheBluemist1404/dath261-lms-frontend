// Placeholder address on the reserved .example domain, so no mail reaches a
// stranger. Swap in a real inbox if the team sets one up.
export const contactEmail = "hello@nodus.example";

export function Contact() {
	return (
		<section
			id="contact"
			aria-labelledby="contact-title"
			className="scroll-mt-28 rounded-2xl bg-white p-6 sm:p-10 lg:scroll-mt-20"
		>
			<h2 id="contact-title" className="font-heading text-2xl font-bold">
				Get in touch
			</h2>
			<p className="mt-3 max-w-2xl text-base leading-7 text-muted">
				Nodus is built by Team 2 of CO3103 (class CC03) at Ho Chi Minh City
				University of Technology. Questions, feedback or a bug to report?
				Contact us at{" "}
				<a
					href={`mailto:${contactEmail}`}
					className="font-semibold text-primary underline-offset-4 hover:underline"
				>
					{contactEmail}
				</a>
				.
			</p>
		</section>
	);
}
