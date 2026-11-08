import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getApiErrorMessage } from "@/lib/http/errors";
import { updateCourseSuspension } from "../api/moderation.api";
import { adminCourseListQuery, adminKey } from "../api/moderation.queries";
import type { AdminCourse } from "../types";
import {
	ActionButton,
	AdminPage,
	AdminTabs,
	cardClass,
	ErrorState,
	LoadingState,
	SearchField,
} from "./admin-page";
import { dialogCopy } from "./moderation-copy";
import { ModerationDialog } from "./moderation-dialog";

type CourseFilter = "PUBLISHED" | "DRAFT" | "SUSPENDED";
const tabs = [
	{ label: "Published", value: "PUBLISHED" },
	{ label: "Draft", value: "DRAFT" },
	{ label: "Suspended", value: "SUSPENDED" },
] as const;

const matchesFilter = (course: AdminCourse, filter: CourseFilter) =>
	filter === "SUSPENDED" ? course.isSuspended : course.status === filter;

function CourseStateBadge({ course }: { course: AdminCourse }) {
	if (course.isSuspended) {
		return (
			<span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
				Suspended
			</span>
		);
	}
	return (
		<span
			className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${course.status === "PUBLISHED" ? "bg-primary-subtle text-primary" : "bg-subtle text-muted"}`}
		>
			{course.status === "PUBLISHED" ? "Published" : "Draft"}
		</span>
	);
}

/** Figma AD-03 Courses: publication and moderation status are independent. */
export function CoursesPage() {
	const queryClient = useQueryClient();
	const coursesQuery = useQuery(adminCourseListQuery());
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<CourseFilter>("PUBLISHED");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const courses = coursesQuery.data?.items ?? [];
	const visible = useMemo(() => {
		const term = search.trim().toLocaleLowerCase();
		return courses.filter(
			(course) =>
				matchesFilter(course, filter) &&
				`${course.title} ${course.lecturer.name}`
					.toLocaleLowerCase()
					.includes(term),
		);
	}, [courses, filter, search]);
	const selected =
		visible.find((course) => course.id === selectedId) ?? visible[0] ?? null;

	const mutation = useMutation({
		mutationFn: ({ course, reason }: { course: AdminCourse; reason: string }) =>
			updateCourseSuspension(course.id, {
				suspended: !course.isSuspended,
				reason,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: adminKey });
			setDialogOpen(false);
		},
	});

	const copy = selected
		? selected.isSuspended
			? dialogCopy.restoreCourse(selected.title)
			: dialogCopy.suspendCourse(selected.title)
		: null;

	return (
		<AdminPage
			title="Courses"
			description="Publication status and moderation status are independent."
		>
			<SearchField
				label="Find course"
				placeholder="Search course or lecturer"
				value={search}
				onChange={setSearch}
			/>
			<AdminTabs
				label="Filter courses"
				tabs={tabs}
				value={filter}
				onChange={setFilter}
			/>

			{coursesQuery.isPending ? (
				<LoadingState label="Loading courses…" />
			) : coursesQuery.isError ? (
				<ErrorState
					message={getApiErrorMessage(
						coursesQuery.error,
						"Unable to load courses.",
					)}
					onRetry={() => void coursesQuery.refetch()}
				/>
			) : (
				<>
					<div className={`${cardClass} overflow-x-auto`}>
						<table className="w-full min-w-[720px] border-collapse text-left text-xs">
							<thead className="bg-subtle font-semibold">
								<tr>
									<th scope="col" className="px-4 py-3.5">
										Course / Lecturer
									</th>
									<th scope="col" className="px-4 py-3.5">
										Publication
									</th>
									<th scope="col" className="px-4 py-3.5">
										Moderation
									</th>
									<th scope="col" className="px-4 py-3.5">
										Enrollments
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{visible.map((course) => (
									<tr
										key={course.id}
										className={
											course.id === selected?.id ? "bg-canvas" : undefined
										}
									>
										<td className="px-4 py-3.5">
											<button
												type="button"
												aria-pressed={course.id === selected?.id}
												onClick={() => setSelectedId(course.id)}
												className="text-left hover:underline"
											>
												{course.title} · {course.lecturer.name}
											</button>
										</td>
										<td className="px-4 py-3.5 text-muted">
											{course.status === "PUBLISHED" ? "Published" : "Draft"}
										</td>
										<td className="px-4 py-3.5 text-muted">
											{course.isSuspended ? "Suspended" : "Available"}
										</td>
										<td className="px-4 py-3.5 text-muted">
											{course.enrollmentCount ?? 0}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{selected && copy && (
						<section
							aria-label="Operational summary"
							className={`${cardClass} flex max-w-3xl flex-col items-start gap-3 p-4`}
						>
							<h2 className="text-sm font-semibold">
								{selected.title} · Operational summary
							</h2>
							<p className="text-xs text-muted">
								Course owner: {selected.lecturer.name} ·{" "}
								{selected.enrollmentCount ?? 0} retained enrollments
							</p>
							<p className="text-xs text-muted">
								Suspension blocks learning access and canonical reference
								resolution. Restoration respects publication and enrollment
								status.
							</p>
							<CourseStateBadge course={selected} />
							<ActionButton
								tone={selected.isSuspended ? "primary" : "danger"}
								onClick={() => {
									mutation.reset();
									setDialogOpen(true);
								}}
							>
								{selected.isSuspended ? "Restore course" : "Suspend course"}
							</ActionButton>
						</section>
					)}
				</>
			)}

			{selected && copy && (
				<ModerationDialog
					open={dialogOpen}
					{...copy}
					busy={mutation.isPending}
					error={
						mutation.isError
							? getApiErrorMessage(
									mutation.error,
									"Unable to update the course. Try again.",
								)
							: null
					}
					onClose={() => setDialogOpen(false)}
					onConfirm={(reason) => mutation.mutate({ course: selected, reason })}
				/>
			)}
		</AdminPage>
	);
}
