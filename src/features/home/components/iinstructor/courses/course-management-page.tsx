import { useMemo, useState } from "react";
import type { Course } from "./course-form";
import CourseForm from "./course-form";
import CourseList from "./course-list";

const initialCourses: Course[] = [
	{
		id: "1",
		schoolYear: "",
		semester: "",
		title: "Introduction to Programming",
		courseCode: "CS101",
		description: "Learn programming fundamentals.",
		courseStartDate: "",
		courseEndDate: "",
		teachingAssistants: [],
		published: true,
	},
	{
		id: "2",
		schoolYear: "",
		semester: "",
		title: "Computer Networks",
		courseCode: "CS201",
		description: "Explore networking concepts and protocols.",
		courseStartDate: "",
		courseEndDate: "",
		teachingAssistants: [],
		published: false,
	},
];

export default function CourseManagementPage() {
	const [courses, setCourses] = useState<Course[]>(initialCourses);
	const [search, setSearch] = useState("");
	const [formOpen, setFormOpen] = useState(false);
	const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const filteredCourses = useMemo(() => {
		const query = search.trim().toLowerCase();

		return courses.filter(
			(course) =>
				course.title.toLowerCase().includes(query) ||
				course.courseCode.toLowerCase().includes(query),
		);
	}, [courses, search]);

	const editingCourse =
		courses.find((course) => course.id === editingCourseId) ?? null;

	function handleCreateCourse() {
		setEditingCourseId(null);
		setError(null);
		setFormOpen(true);
	}

	function handleEditCourse(course: Course) {
		setEditingCourseId(course.id);
		setError(null);
		setFormOpen(true);
	}

	function handleCancelForm() {
		setFormOpen(false);
		setEditingCourseId(null);
		setError(null);
	}

	function handleSubmit(courseData: Omit<Course, "id" | "published">) {
		const duplicateCode = courses.some(
			(course) =>
				course.courseCode.toLowerCase() ===
					courseData.courseCode.toLowerCase() && course.id !== editingCourseId,
		);

		if (duplicateCode) {
			setError("A course with this course code already exists.");
			return;
		}

		if (editingCourseId !== null) {
			setCourses((currentCourses) =>
				currentCourses.map((course) =>
					course.id === editingCourseId ? { ...course, ...courseData } : course,
				),
			);
		} else {
			const newCourse: Course = {
				id: crypto.randomUUID(),
				...courseData,
				published: false,
			};

			setCourses((currentCourses) => [...currentCourses, newCourse]);
		}

		handleCancelForm();
	}

	function handleDeleteCourse(course: Course) {
		const confirmed = window.confirm(
			`Are you sure you want to delete "${course.title}"?`,
		);

		if (!confirmed) {
			return;
		}

		setCourses((currentCourses) =>
			currentCourses.filter((item) => item.id !== course.id),
		);

		if (editingCourseId === course.id) {
			handleCancelForm();
		}
	}

	function handleTogglePublished(courseId: string) {
		setCourses((currentCourses) =>
			currentCourses.map((course) =>
				course.id === courseId
					? { ...course, published: !course.published }
					: course,
			),
		);
	}

	return (
		<main className="flex flex-col gap-6 p-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold">Course Management</h1>
					<p className="mt-1 text-sm text-gray-500">
						Create, manage, and publish your courses.
					</p>
				</div>

				<button
					type="button"
					onClick={handleCreateCourse}
					className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
				>
					Create Course
				</button>
			</header>

			{formOpen && (
				<section className="rounded-xl border border-gray-200 p-5 shadow-sm">
					<h2 className="mb-4 text-xl font-semibold">
						{editingCourseId ? "Edit Course" : "Create Course"}
					</h2>
					{error && (
						<p role="alert" className="mb-3 text-sm text-red-600">
							{error}
						</p>
					)}
					<CourseForm
						mode={editingCourseId ? "edit" : "create"}
						initialCourse={editingCourse}
						onSubmit={handleSubmit}
						onCancel={handleCancelForm}
					/>
				</section>
			)}

			<section className="flex flex-col gap-4">
				<div>
					<label htmlFor="course-search" className="mb-1 block font-medium">
						Search courses
					</label>
					<input
						id="course-search"
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search by title or course code..."
						className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<p className="text-sm text-gray-500">
					{filteredCourses.length}{" "}
					{filteredCourses.length === 1 ? "course" : "courses"} found
				</p>

				<CourseList
					courses={filteredCourses}
					loading={false}
					error={null}
					onEdit={handleEditCourse}
					onDelete={handleDeleteCourse}
					onToggleStatus={handleTogglePublished}
					onCreate={handleCreateCourse}
				/>
			</section>
		</main>
	);
}
