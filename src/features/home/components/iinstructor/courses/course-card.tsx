import type { Course } from "./course-types.ts";

interface CourseCardProps {
	course: Course;
	onEdit: (course: Course) => void;
	onDelete: (courseId: string) => void;
	onToggleStatus: (courseId: string) => void;
}

export function CourseCard({
	course,
	onEdit,
	onDelete,
	onToggleStatus,
}: CourseCardProps) {
	return (
		<article className="course-card">
			<h3>{course.title}</h3>

			<p>{course.courseCode}</p>
			<p>{course.description}</p>

			<p>School year: {course.schoolYear}</p>

			<p>Semester: {course.semester}</p>

			<p>Status: {course.published ? "Published" : "Draft"}</p>

			<div className="course-card__actions">
				<button type="button" onClick={() => onEdit(course)}>
					Edit
				</button>

				<button type="button" onClick={() => onDelete(course.id)}>
					Delete
				</button>

				<button type="button" onClick={() => onToggleStatus(course.id)}>
					{course.published ? "Hide" : "Publish"}
				</button>
			</div>
		</article>
	);
}

export default CourseCard;
