import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	createCourse,
	deleteCourse,
	updateCourse,
	updateCourseStatus,
} from "../api/course.api";
import { courseListQuery } from "../api/course.queries";
import type { Course, CourseInput, CourseStatus } from "../types/course.types";
import CourseForm from "./course-form";

type StatusFilter = "ALL" | CourseStatus;
const filters: Array<{ label: string; value: StatusFilter }> = [
	{ label: "All", value: "ALL" },
	{ label: "Draft", value: "DRAFT" },
	{ label: "Published", value: "PUBLISHED" },
];
const panelClass = "rounded-xl border border-border bg-white";
const buttonClass =
	"inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold text-ink hover:bg-subtle";

function updatedLabel(value?: string) {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "—"
		: new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function CourseManagementPage() {
	const queryClient = useQueryClient();
	const coursesQuery = useQuery(courseListQuery());
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<StatusFilter>("ALL");
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Course | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: ["courses"] });

	const saveMutation = useMutation({
		mutationFn: (variables: { id?: string; input: CourseInput }) =>
			variables.id
				? updateCourse(variables.id, variables.input)
				: createCourse(variables.input),
		onSuccess: async () => {
			await refresh();
			setFormOpen(false);
			setEditing(null);
			setFormError(null);
		},
		onError: (error) =>
			setFormError(
				error instanceof Error ? error.message : "Unable to save course.",
			),
	});
	const deleteMutation = useMutation({
		mutationFn: deleteCourse,
		onSuccess: refresh,
	});
	const statusMutation = useMutation({
		mutationFn: ({ id, status }: { id: string; status: CourseStatus }) =>
			updateCourseStatus(id, status),
		onSuccess: refresh,
	});

	const courses = coursesQuery.data ?? [];
	const filtered = useMemo(() => {
		const term = search.trim().toLocaleLowerCase();
		return courses.filter(
			(course) =>
				(filter === "ALL" || course.status === filter) &&
				`${course.title} ${course.description ?? ""} ${course.prerequisites ?? ""}`
					.toLocaleLowerCase()
					.includes(term),
		);
	}, [courses, filter, search]);

	function startCreate() {
		setEditing(null);
		setFormError(null);
		setFormOpen(true);
	}
	function startEdit(course: Course) {
		setEditing(course);
		setFormError(null);
		setFormOpen(true);
	}
	function cancelForm() {
		setFormOpen(false);
		setEditing(null);
		setFormError(null);
	}
	async function submit(input: CourseInput) {
		setFormError(null);
		await saveMutation.mutateAsync({ id: editing?.id, input });
	}
	async function remove(course: Course) {
		if (window.confirm(`Delete “${course.title}”? This cannot be undone.`)) {
			try {
				await deleteMutation.mutateAsync(course.id);
			} catch {
				/* The query state below provides retry/error feedback. */
			}
		}
	}
	async function toggleStatus(course: Course) {
		try {
			await statusMutation.mutateAsync({
				id: course.id,
				status: course.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
			});
		} catch {
			/* Keep server state; query error is shown below. */
		}
	}

	return (
		<main className="flex flex-col gap-6 text-ink">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-sm font-semibold text-primary">INSTRUCTOR</p>
					<h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
						Course management
					</h1>
					<p className="mt-2 text-sm text-muted">
						Create courses, manage enrollment windows, and control publication.
					</p>
				</div>
				<button
					type="button"
					onClick={startCreate}
					className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
				>
					Create course
				</button>
			</header>

			{formOpen && (
				<section className={`${panelClass} p-5 sm:p-6`}>
					<div className="mb-5">
						<h2 className="font-heading text-xl font-bold">
							{editing ? "Edit course" : "Create course"}
						</h2>
						<p className="mt-1 text-sm text-muted">
							Fields reflect the backend Course model.
						</p>
					</div>
					<CourseForm
						key={editing?.id ?? "new-course"}
						mode={editing ? "edit" : "create"}
						initialCourse={editing}
						busy={saveMutation.isPending}
						error={formError}
						onSubmit={submit}
						onCancel={cancelForm}
					/>
				</section>
			)}

			<section className={`${panelClass} overflow-hidden`}>
				<div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
					<div
						className="flex flex-wrap gap-1"
						role="tablist"
						aria-label="Filter courses"
					>
						{filters.map((item) => (
							<button
								key={item.value}
								type="button"
								role="tab"
								aria-selected={filter === item.value}
								onClick={() => setFilter(item.value)}
								className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${filter === item.value ? "bg-primary-subtle text-primary" : "text-muted hover:bg-subtle hover:text-ink"}`}
							>
								{item.label}
							</button>
						))}
					</div>
					<label className="block w-full sm:max-w-xs">
						<span className="sr-only">Search courses</span>
						<input
							type="search"
							aria-label="Search courses"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search courses…"
							className="min-h-11 w-full rounded-lg border border-border px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
						/>
					</label>
				</div>
				{coursesQuery.isPending ? (
					<p className="p-8 text-center text-sm text-muted">Loading courses…</p>
				) : coursesQuery.isError ? (
					<div className="p-6" role="alert">
						<p className="text-sm text-error">
							Unable to load courses: {coursesQuery.error.message}
						</p>
						<button
							type="button"
							className={`${buttonClass} mt-3`}
							onClick={() => void coursesQuery.refetch()}
						>
							Retry
						</button>
					</div>
				) : filtered.length === 0 ? (
					<div className="p-10 text-center">
						<h2 className="font-semibold">No courses found</h2>
						<p className="mt-1 text-sm text-muted">
							Try another search or create a course.
						</p>
						<button
							type="button"
							onClick={startCreate}
							className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"
						>
							Create course
						</button>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[720px] border-collapse text-left">
								<thead className="bg-subtle text-xs font-semibold uppercase tracking-wide text-muted">
									<tr>
										<th scope="col" className="px-5 py-3">
											Course
										</th>
										<th scope="col" className="px-4 py-3">
											Publication
										</th>
										<th scope="col" className="px-4 py-3">
											Learners
										</th>
										<th scope="col" className="px-4 py-3">
											Updated
										</th>
										<th scope="col" className="px-5 py-3">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{filtered.map((course) => (
										<tr
											key={course.id}
											className="align-middle hover:bg-canvas/60"
										>
											<td className="px-5 py-4">
												<Link
													to="/instructor/courses/$courseId"
													params={{ courseId: course.id }}
													className="font-semibold text-primary hover:underline"
												>
													{course.title}
												</Link>
												{course.description && (
													<p className="mt-1 max-w-lg truncate text-sm text-muted">
														{course.description}
													</p>
												)}
											</td>
											<td className="px-4 py-4">
												<span
													className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${course.status === "PUBLISHED" ? "bg-primary-subtle text-primary" : "bg-subtle text-muted"}`}
												>
													{course.status === "PUBLISHED"
														? "Published"
														: "Draft"}
												</span>
											</td>
											<td className="px-4 py-4 text-sm">
												{course.learnerCount ?? course._count?.enrollments ?? 0}
											</td>
											<td className="px-4 py-4 text-sm text-muted">
												{updatedLabel(course.updatedAt)}
											</td>
											<td className="px-5 py-4">
												<div className="flex justify-end gap-2">
													<button
														type="button"
														className={buttonClass}
														onClick={() => startEdit(course)}
													>
														Edit
													</button>
													<button
														type="button"
														className={buttonClass}
														disabled={statusMutation.isPending}
														onClick={() => void toggleStatus(course)}
													>
														{course.status === "PUBLISHED"
															? "Unpublish"
															: "Publish"}
													</button>
													<button
														type="button"
														className="inline-flex min-h-10 items-center rounded-lg border border-error/30 px-3 text-sm font-semibold text-error hover:bg-error/5"
														disabled={deleteMutation.isPending}
														onClick={() => void remove(course)}
													>
														Delete
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="border-t border-border px-5 py-3 text-sm text-muted">
							Showing {filtered.length} of {courses.length} courses
						</div>
					</>
				)}
				{(deleteMutation.isError || statusMutation.isError) && (
					<p
						className="border-t border-border p-4 text-sm text-error"
						role="alert"
					>
						{(deleteMutation.error ?? statusMutation.error)?.message ??
							"The action failed. Please try again."}
					</p>
				)}
			</section>
		</main>
	);
}
