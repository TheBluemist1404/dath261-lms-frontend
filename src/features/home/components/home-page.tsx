import { Link } from "@tanstack/react-router";
import { Icon, type IconName } from "@/components/ui/icon";
import { CoursePreview } from "./course-preview";

const features: { icon: IconName; title: string; body: string }[] = [
	{
		icon: "book",
		title: "Guided courses",
		body: "Follow structured lessons from your lecturers, in order, and pick up where you left off.",
	},
	{
		icon: "workspace",
		title: "A workspace that is yours",
		body: "Keep notes next to the course and reference the exact lesson they came from.",
	},
	{
		icon: "users",
		title: "Study together, live",
		body: "Invite classmates to a workspace and edit the same page at the same time.",
	},
];

const ctaBase =
	"inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors";

export function HomePage() {
	return (
		<div className="mx-auto flex w-full max-w-[1050px] flex-col gap-12">
			<section
				aria-labelledby="landing-title"
				className="grid items-center gap-8 rounded-2xl bg-primary-subtle px-6 py-10 sm:px-10 md:grid-cols-[1fr_auto]"
			>
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-primary">
						Learn · Connect · Make it yours
					</p>
					<h1
						id="landing-title"
						className="mt-3 max-w-xl font-heading text-4xl leading-tight font-bold tracking-tight sm:text-5xl"
					>
						Build knowledge that stays with you.
					</h1>
					<p className="mt-4 max-w-xl text-base leading-7 text-muted">
						Discover a course. Connect it to your notes. Build understanding
						together.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Link
							to="/register"
							className={`${ctaBase} bg-primary text-white hover:bg-primary-hover`}
						>
							Get started
						</Link>
						<Link
							to="/login"
							className={`${ctaBase} bg-white text-ink hover:bg-subtle`}
						>
							Log in
						</Link>
					</div>
				</div>
				<HeroIllustration />
			</section>

			<section aria-labelledby="features-title">
				<h2 id="features-title" className="font-heading text-2xl font-bold">
					Everything for a course, in one place
				</h2>
				<ul className="mt-6 grid gap-4 md:grid-cols-3">
					{features.map((feature) => (
						<li key={feature.title} className="rounded-2xl bg-white p-6">
							<span className="flex size-11 items-center justify-center rounded-xl bg-primary-subtle text-primary">
								<Icon name={feature.icon} />
							</span>
							<h3 className="mt-4 font-heading text-lg font-bold">
								{feature.title}
							</h3>
							<p className="mt-2 text-sm leading-6 text-muted">
								{feature.body}
							</p>
						</li>
					))}
				</ul>
			</section>

			<CoursePreview />
		</div>
	);
}

function HeroIllustration() {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 240 150"
			className="hidden h-auto w-60 sm:block"
		>
			<rect x="10" y="30" width="105" height="90" rx="6" fill="white" />
			<rect x="22" y="42" width="81" height="30" rx="4" fill="#ece8f7" />
			<path d="M57 50v14l12-7z" fill="#5b4b8a" />
			<rect x="22" y="82" width="70" height="4" rx="2" fill="#556560" />
			<rect x="22" y="92" width="81" height="3" rx="1.5" fill="#dde5df" />
			<rect x="22" y="100" width="60" height="3" rx="1.5" fill="#dde5df" />
			<path
				d="M118 75h22"
				stroke="#0f766e"
				strokeWidth="2.5"
				strokeDasharray="5 4"
			/>
			<rect x="140" y="45" width="92" height="88" rx="6" fill="white" />
			<rect x="152" y="58" width="52" height="4" rx="2" fill="#182522" />
			<rect x="152" y="68" width="68" height="3" rx="1.5" fill="#dde5df" />
			<rect x="152" y="76" width="50" height="3" rx="1.5" fill="#dde5df" />
			<rect x="150" y="90" width="72" height="30" rx="4" fill="#e7f3ef" />
			<rect
				x="158"
				y="98"
				width="8"
				height="14"
				rx="1.5"
				fill="none"
				stroke="#0f766e"
				strokeWidth="1.5"
			/>
			<rect x="172" y="101" width="40" height="2.5" rx="1.25" fill="#0f766e" />
			<rect x="172" y="107" width="30" height="2.5" rx="1.25" fill="#0f766e" />
			<rect x="88" y="10" width="70" height="24" rx="5" fill="#0f766e" />
			<path
				d="M98 22l4 4 7-8"
				fill="none"
				stroke="white"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect x="116" y="21" width="32" height="2.5" rx="1.25" fill="white" />
		</svg>
	);
}
