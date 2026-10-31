import type { Course } from "./course-form";

interface CourseListProps {
	courses: Course[];
	loading: boolean;
	error: Error | string | null;
	onEdit: (course: Course) => void;
	onDelete: (course: Course) => void;
	onToggleStatus: (courseId: string) => void;
	onCreate?: () => void;
	onRetry?: () => void;
}

export default function CourseList({
	courses,
	loading,
	error,
	onEdit,
	onDelete,
	onToggleStatus,
	onCreate,
	onRetry,
}: CourseListProps) {
	if (loading) {
		return (
			<output className="block py-8 text-center text-gray-500">
				Loading courses...
			</output>
		);
	}

	if (error) {
		const message = typeof error === "string" ? error : error.message;

		return (
			<div className="rounded-lg border border-red-200 p-4" role="alert">
				<p className="text-red-700">Unable to load courses: {message}</p>
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className="mt-3 rounded-md border px-3 py-2 hover:bg-gray-50"
					>
						Retry
					</button>
				)}
			</div>
		);
	}

	if (courses.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center">
				<p className="text-gray-600">No courses available.</p>
				{onCreate && (
					<button
						type="button"
						onClick={onCreate}
						className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
					>
						Create Course
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{courses.map((course) => (
				<article
					key={course.id}
					className="rounded-xl border border-gray-200 p-5 shadow-sm"
				>
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-sm font-medium text-gray-500">
								{course.courseCode}
							</p>
							<h2 className="text-lg font-semibold">{course.title}</h2>
						</div>
						<span
							className={
								course.published
									? "rounded-full bg-green-100 px-3 py-1 text-xs text-green-800"
									: "rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
							}
						>
							{course.published ? "Published" : "Draft"}
						</span>
					</div>

					<p className="mt-2 text-sm text-gray-600">{course.description}</p>

					{(course.schoolYear || course.semester) && (
						<p className="mt-2 text-sm text-gray-500">
							{[course.schoolYear, course.semester].filter(Boolean).join(" · ")}
						</p>
					)}

					{(course.courseStartDate || course.courseEndDate) && (
						<p className="mt-1 text-sm text-gray-500">
							{course.courseStartDate || "Start date not set"}
							{" – "}
							{course.courseEndDate || "End date not set"}
						</p>
					)}

					{course.teachingAssistants.length > 0 && (
						<p className="mt-1 text-sm text-gray-500">
							Teaching assistants: {course.teachingAssistants.join(", ")}
						</p>
					)}

					<div className="mt-5 flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => onEdit(course)}
							className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
						>
							Edit
						</button>
						<button
							type="button"
							onClick={() => onDelete(course)}
							className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
						>
							Delete
						</button>
						<button
							type="button"
							onClick={() => onToggleStatus(course.id)}
							className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
						>
							{course.published ? "Hide" : "Publish"}
						</button>
					</div>
				</article>
			))}
		</div>
	);
}
