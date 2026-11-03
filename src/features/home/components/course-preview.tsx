import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { publishedCourseListQuery } from "@/features/courses/api/course.queries";

// The catalog route belongs to FE #19 and is not registered yet, so this is a
// plain link. The section only renders once the catalog API answers, which
// lands alongside that route.
const catalogPath = "/catalog";
const previewSize = 3;
const tints = ["bg-primary-subtle", "bg-[#ece8f7]", "bg-[#e6eef6]"];

export function CoursePreview() {
	const { data } = useQuery(publishedCourseListQuery());
	const courses = data?.slice(0, previewSize) ?? [];

	// Loading, failure and an empty catalog all hide the section.
	if (courses.length === 0) return null;

	return (
		<section aria-labelledby="preview-title">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<h2 id="preview-title" className="font-heading text-2xl font-bold">
					Explore courses
				</h2>
				<a
					href={catalogPath}
					className="rounded-lg text-sm font-semibold text-primary hover:underline"
				>
					Browse the catalog
				</a>
			</div>
			<ul className="mt-6 grid gap-4 md:grid-cols-3">
				{courses.map((course, index) => (
					<li key={course.id}>
						<a
							href={catalogPath}
							className="flex h-full flex-col rounded-2xl bg-white p-4 hover:shadow-sm"
						>
							<span
								className={`flex h-32 items-center justify-center rounded-xl text-primary ${tints[index % tints.length]}`}
							>
								<Icon name="courses" />
							</span>
							<span className="mt-4 font-heading text-lg font-bold">
								{course.title}
							</span>
							{course.description && (
								<span className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
									{course.description}
								</span>
							)}
						</a>
					</li>
				))}
			</ul>
		</section>
	);
}
