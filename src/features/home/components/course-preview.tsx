import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { publishedCourseListQuery } from "@/features/courses/api/course.queries";

// Cards link nowhere yet: the catalog and course detail routes belong to FE #19.
const previewSize = 3;
const tints = ["bg-primary-subtle", "bg-[#ece8f7]", "bg-[#e6eef6]"];

export function CoursePreview() {
	const { data } = useQuery(publishedCourseListQuery());
	const courses = data?.slice(0, previewSize) ?? [];

	// Loading, failure and an empty catalog all hide the section.
	if (courses.length === 0) return null;

	return (
		<section aria-labelledby="preview-title">
			<h2 id="preview-title" className="font-heading text-2xl font-bold">
				Explore courses
			</h2>
			<ul className="mt-6 grid gap-4 md:grid-cols-3">
				{courses.map((course, index) => (
					<li key={course.id}>
						<article className="flex h-full flex-col rounded-2xl bg-white p-4">
							<span
								className={`flex h-32 items-center justify-center rounded-xl text-primary ${tints[index % tints.length]}`}
							>
								<Icon name="courses" />
							</span>
							<h3 className="mt-4 font-heading text-lg font-bold">
								{course.title}
							</h3>
							{course.description && (
								<p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
									{course.description}
								</p>
							)}
						</article>
					</li>
				))}
			</ul>
		</section>
	);
}
