import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getCourse, updateCourseStatus } from "../api/course.api";
import {
	createCourseBlock,
	deleteCourseBlock,
	listCourseBlocks,
	updateCourseBlock,
} from "../api/course-block.api";
import type { Course, CourseStatus } from "../types/course.types";
import type {
	CourseBlock,
	CourseBlockInput,
} from "../types/course-block.types";
import { CourseBlockForm } from "./content/course-block-form";
import { CourseBlockList } from "./content/lesson-list";
import { PublicationControl } from "./content/publication-control";

function nestBlocks(blocks: CourseBlock[]): CourseBlock[] {
	const byId = new Map<string, CourseBlock>();
	for (const block of blocks) byId.set(block.id, { ...block, children: [] });
	const roots: CourseBlock[] = [];
	for (const block of byId.values()) {
		if (block.parentModuleId && byId.has(block.parentModuleId))
			byId.get(block.parentModuleId)?.children?.push(block);
		else roots.push(block);
	}
	return roots;
}

export default function CourseDetailPage() {
	const params = useParams({ strict: false }) as Record<
		string,
		string | undefined
	>;
	const courseId = params.courseId ?? params.id;
	const queryClient = useQueryClient();
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<CourseBlock | null>(null);
	const [parentModule, setParentModule] = useState<CourseBlock | null>(null);
	const courseQuery = useQuery({
		queryKey: ["courses", courseId],
		enabled: Boolean(courseId),
		queryFn: ({ signal }) => getCourse(courseId as string, signal),
	});
	const blocksQuery = useQuery({
		queryKey: ["course-blocks", courseId],
		enabled: Boolean(courseId),
		queryFn: ({ signal }) => listCourseBlocks(courseId as string, signal),
	});
	const refreshBlocks = () =>
		queryClient.invalidateQueries({ queryKey: ["course-blocks", courseId] });
	const saveBlock = useMutation({
		mutationFn: (
			input:
				| CourseBlockInput
				| (Partial<Omit<CourseBlockInput, "courseId">> & { courseId?: string }),
		) => {
			if (editing) {
				const { courseId: _courseId, ...patch } = input;
				return updateCourseBlock(editing.id, patch);
			}
			return createCourseBlock(input as CourseBlockInput);
		},
		onSuccess: async () => {
			await refreshBlocks();
			setFormOpen(false);
			setEditing(null);
			setParentModule(null);
		},
	});
	const deleteBlock = useMutation({
		mutationFn: deleteCourseBlock,
		onSuccess: refreshBlocks,
	});
	const publication = useMutation({
		mutationFn: (status: CourseStatus) =>
			updateCourseStatus(courseId as string, status),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
			await queryClient.invalidateQueries({ queryKey: ["courses"] });
		},
	});
	const blocks = useMemo(
		() => nestBlocks(blocksQuery.data ?? []),
		[blocksQuery.data],
	);

	if (!courseId)
		return (
			<p role="alert" className="text-error">
				Course ID is missing from the route.
			</p>
		);
	if (courseQuery.isPending)
		return <p className="text-sm text-muted">Loading course…</p>;
	if (courseQuery.isError)
		return (
			<div
				role="alert"
				className="rounded-xl border border-border bg-white p-6"
			>
				<p className="text-error">
					Unable to load course: {courseQuery.error.message}
				</p>
				<button
					type="button"
					onClick={() => void courseQuery.refetch()}
					className="mt-3 rounded-lg border border-border px-3 py-2"
				>
					Retry
				</button>
			</div>
		);
	const course: Course = courseQuery.data;

	function startCreate(parent: CourseBlock | null = null) {
		setEditing(null);
		setParentModule(parent);
		setFormOpen(true);
	}
	function startEdit(block: CourseBlock) {
		setEditing(block);
		setParentModule(null);
		setFormOpen(true);
	}
	async function remove(block: CourseBlock) {
		if (
			window.confirm(
				`Delete “${block.title}”${block.type === "MODULE" ? " and its child content" : ""}?`,
			)
		) {
			try {
				await deleteBlock.mutateAsync(block.id);
			} catch {
				/* Display mutation error below. */
			}
		}
	}

	return (
		<main className="flex flex-col gap-6 text-ink">
			<div>
				<Link
					to="/instructor/courses"
					className="text-sm font-semibold text-primary hover:underline"
				>
					← All courses
				</Link>
				<p className="mt-4 text-sm font-semibold text-primary">
					COURSE CONTENT
				</p>
				<h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
					{course.title}
				</h1>
				{course.description && (
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
						{course.description}
					</p>
				)}
				{course.prerequisites && (
					<p className="mt-2 text-sm text-muted">
						<strong>Prerequisites:</strong> {course.prerequisites}
					</p>
				)}
			</div>
			<PublicationControl
				status={course.status}
				busy={publication.isPending}
				onChange={(status) => publication.mutate(status)}
			/>
			{publication.isError && (
				<p role="alert" className="text-sm text-error">
					Unable to update publication: {publication.error.message}
				</p>
			)}
			<section className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="font-heading text-xl font-bold">
							Modules and learning blocks
						</h2>
						<p className="mt-1 text-sm text-muted">
							Modules contain text, file, video, quiz, or assignment blocks.
						</p>
					</div>
					<button
						type="button"
						onClick={() => startCreate()}
						className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
					>
						Add module
					</button>
				</div>
				{formOpen && (
					<section className="rounded-xl border border-border bg-white p-5">
						<h3 className="mb-4 font-semibold">
							{editing
								? "Edit block"
								: parentModule
									? `Add content to ${parentModule.title}`
									: "Add course block"}
						</h3>
						<CourseBlockForm
							key={editing?.id ?? parentModule?.id ?? "new-root"}
							courseId={course.id}
							mode={editing ? "edit" : "create"}
							initialBlock={editing}
							parentModuleId={parentModule?.id ?? null}
							position={
								parentModule
									? (parentModule.children?.length ?? 0)
									: blocks.length
							}
							busy={saveBlock.isPending}
							onSubmit={async (input) => {
								await saveBlock.mutateAsync(input);
							}}
							onCancel={() => {
								setFormOpen(false);
								setEditing(null);
								setParentModule(null);
							}}
						/>
						{saveBlock.isError && (
							<p role="alert" className="mt-3 text-sm text-error">
								Unable to save block: {saveBlock.error.message}
							</p>
						)}
					</section>
				)}
				{deleteBlock.isError && (
					<p role="alert" className="text-sm text-error">
						Unable to delete block: {deleteBlock.error.message}
					</p>
				)}
				<CourseBlockList
					blocks={blocks}
					loading={blocksQuery.isPending}
					error={blocksQuery.isError ? blocksQuery.error.message : null}
					onCreate={() => startCreate()}
					onCreateChild={(module) => startCreate(module)}
					onEdit={startEdit}
					onDelete={(block) => void remove(block)}
				/>
				{blocksQuery.isError && (
					<button
						type="button"
						className="self-start rounded-lg border border-border px-3 py-2 text-sm font-semibold"
						onClick={() => void blocksQuery.refetch()}
					>
						Retry loading content
					</button>
				)}
			</section>
		</main>
	);
}
