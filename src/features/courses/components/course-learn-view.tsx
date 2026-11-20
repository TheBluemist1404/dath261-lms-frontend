import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/errors";
import { courseBlocksQuery, courseDetailQuery } from "../api/course.queries";
import { useStudentProgress } from "../api/enrollment.queries";
import type { CourseBlock, CourseBlockType } from "../types/course-block.types";
import {
	flattenLearnContentBlocks,
	organizeCourseOutlineBlocks,
} from "../utils/student-quiz-domain";
import { StudentQuizPlayer } from "./quiz-player/student-quiz-player";

export interface CourseLearnViewProps {
	courseId: string;
	initialBlockId?: string;
	positionSeconds?: number;
	onSelectBlock?: (blockId: string) => void;
}

function getBlockIcon(type: CourseBlockType): IconName {
	switch (type) {
		case "VIDEO":
			return "play";
		case "QUIZ":
			return "checkCircle";
		case "ASSIGNMENT":
			return "book";
		case "TEXT":
		case "FILE":
			return "file";
		case "MODULE":
			return "workspace";
		default: {
			const _exhaustive: never = type;
			return _exhaustive;
		}
	}
}

function formatDurationSeconds(totalSeconds: number): string {
	const rounded = Math.max(0, Math.floor(totalSeconds));
	const minutes = Math.floor(rounded / 60);
	const seconds = rounded % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${Math.round(kb)} KB`;
	return `${(kb / 1024).toFixed(1)} MB`;
}

function readStringField(
	content: Record<string, unknown> | null,
	key: string,
): string | null {
	if (!content) return null;
	const value = content[key];
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumberField(
	content: Record<string, unknown> | null,
	key: string,
): number | null {
	if (!content) return null;
	const value = content[key];
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function CourseLearnView({
	courseId,
	initialBlockId,
	positionSeconds,
	onSelectBlock,
}: CourseLearnViewProps) {
	const courseQuery = useQuery(courseDetailQuery(courseId));
	const blocksQuery = useQuery(courseBlocksQuery(courseId));
	const progressQuery = useStudentProgress(courseId);

	const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>(
		initialBlockId,
	);
	const [prevInitialBlockId, setPrevInitialBlockId] = useState<
		string | undefined
	>(initialBlockId);

	if (initialBlockId !== prevInitialBlockId) {
		setPrevInitialBlockId(initialBlockId);
		setSelectedBlockId(initialBlockId);
	}

	function handleSelectBlock(blockId: string) {
		setSelectedBlockId(blockId);
		onSelectBlock?.(blockId);
	}

	function handleRetryAll() {
		void courseQuery.refetch();
		void blocksQuery.refetch();
		void progressQuery.refetch();
	}

	if (courseQuery.isLoading || blocksQuery.isLoading) {
		return (
			<output
				aria-label="Loading course reader"
				className="mx-auto flex w-full max-w-7xl flex-col gap-6"
			>
				<div className="h-24 w-full animate-pulse rounded-2xl bg-subtle" />
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
					<div className="h-96 animate-pulse rounded-2xl bg-subtle lg:col-span-4" />
					<div className="h-96 animate-pulse rounded-2xl bg-subtle lg:col-span-8" />
				</div>
			</output>
		);
	}

	if (
		courseQuery.isError ||
		!courseQuery.data ||
		blocksQuery.isError ||
		!blocksQuery.data
	) {
		const primaryError = courseQuery.error ?? blocksQuery.error;
		const status = getApiErrorStatus(primaryError);
		const message = getApiErrorMessage(
			primaryError,
			"Unable to load course content. Please try again.",
		);

		if (status === 403 || status === 404) {
			return (
				<section className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 text-center">
					<div className="flex size-12 items-center justify-center rounded-xl bg-warning-subtle text-warning">
						<Icon name="lock" className="size-6" />
					</div>
					<h1 className="font-heading text-2xl font-bold text-ink">
						{status === 403 ? "Course Access Restricted" : "Course Unavailable"}
					</h1>
					<p className="text-sm text-muted">{message}</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/my-courses"
							search={{ page: 1 }}
							className={buttonVariants({ variant: "primary", size: "sm" })}
						>
							My Courses
						</Link>
						<Link
							to="/courses/$courseId"
							params={{ courseId }}
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							Course overview
						</Link>
						<Button variant="ghost" size="sm" onClick={handleRetryAll}>
							Retry
						</Button>
					</div>
				</section>
			);
		}

		return (
			<section
				role="alert"
				className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-error/20 bg-error-subtle p-8 text-center text-error"
			>
				<Icon name="alertCircle" className="size-8" />
				<h1 className="font-heading text-xl font-bold">
					Failed to load course reader
				</h1>
				<p className="text-sm">{message}</p>
				<div className="flex items-center gap-3">
					<Button variant="primary" size="sm" onClick={handleRetryAll}>
						Retry
					</Button>
					<Link
						to="/my-courses"
						search={{ page: 1 }}
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						My Courses
					</Link>
				</div>
			</section>
		);
	}

	const course = courseQuery.data;
	const blocks = blocksQuery.data;
	const outline = organizeCourseOutlineBlocks(blocks);
	const flattenedBlocks = flattenLearnContentBlocks(blocks);

	const completedBlockIds = new Set<string>();
	for (const item of progressQuery.data?.items ?? []) {
		if (item.completed) {
			completedBlockIds.add(item.courseBlockId);
		}
	}

	const activeIndex = selectedBlockId
		? flattenedBlocks.findIndex((block) => block.id === selectedBlockId)
		: -1;
	const resolvedIndex = activeIndex >= 0 ? activeIndex : 0;
	const activeBlock: CourseBlock | undefined = flattenedBlocks[resolvedIndex];

	function renderProgressPanel() {
		if (progressQuery.isLoading) {
			return (
				<output className="block rounded-xl border border-border bg-subtle px-4 py-3 text-xs text-muted">
					Loading course progress...
				</output>
			);
		}

		if (progressQuery.isError || !progressQuery.data) {
			return (
				<div
					role="alert"
					className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/20 bg-error-subtle px-4 py-3 text-xs text-error"
				>
					<span>
						{getApiErrorMessage(
							progressQuery.error,
							"Unable to load course progress.",
						)}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => void progressQuery.refetch()}
					>
						Retry
					</Button>
				</div>
			);
		}

		const { progress } = progressQuery.data;

		return (
			<section
				aria-label="Course progress"
				className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-canvas p-4 sm:grid-cols-2"
			>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2 text-xs">
						<span className="font-medium text-muted">Learning progress</span>
						<span className="font-semibold text-ink">
							{progress.learningProgressPercentage}% ({progress.completedItems}/
							{progress.totalItems} items)
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
						<div
							role="progressbar"
							aria-label="Learning progress"
							aria-valuenow={progress.learningProgressPercentage}
							aria-valuemin={0}
							aria-valuemax={100}
							className="h-full bg-primary transition-all"
							style={{
								width: `${Math.min(100, Math.max(0, progress.learningProgressPercentage))}%`,
							}}
						/>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2 text-xs">
						<span className="font-medium text-muted">Quiz completion</span>
						<span className="font-semibold text-ink">
							{progress.quizCompletionPercentage}% ({progress.completedQuizzes}/
							{progress.totalQuizzes} quizzes)
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
						<div
							role="progressbar"
							aria-label="Quiz completion"
							aria-valuenow={progress.quizCompletionPercentage}
							aria-valuemin={0}
							aria-valuemax={100}
							className="h-full bg-success transition-all"
							style={{
								width: `${Math.min(100, Math.max(0, progress.quizCompletionPercentage))}%`,
							}}
						/>
					</div>
				</div>
			</section>
		);
	}

	function renderOutlineItem(block: CourseBlock) {
		const isActive = activeBlock?.id === block.id;
		const isCompleted = completedBlockIds.has(block.id);

		return (
			<li key={block.id}>
				<button
					type="button"
					onClick={() => handleSelectBlock(block.id)}
					aria-current={isActive ? "step" : undefined}
					className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
						isActive
							? "border-primary bg-primary-subtle text-ink"
							: "border-transparent bg-white text-ink hover:bg-subtle"
					}`}
				>
					<div className="flex min-w-0 items-start gap-2.5">
						<Icon
							name={getBlockIcon(block.type)}
							className="mt-0.5 size-4 shrink-0 text-primary"
						/>
						<span className="font-medium leading-snug">{block.title}</span>
					</div>
					<div className="flex shrink-0 items-center gap-1.5">
						{isCompleted ? (
							<span className="rounded-full bg-success-subtle px-2 py-0.5 text-xs font-semibold text-success">
								Completed
							</span>
						) : null}
						<span className="rounded bg-subtle px-1.5 py-0.5 text-xs uppercase text-muted">
							{block.type}
						</span>
					</div>
				</button>
			</li>
		);
	}

	function renderNonQuizContent(block: CourseBlock) {
		const showResumeTimestamp =
			positionSeconds !== undefined &&
			(initialBlockId === undefined
				? resolvedIndex === 0
				: block.id === initialBlockId);

		switch (block.type) {
			case "TEXT": {
				const textBody =
					readStringField(block.content, "text") ??
					readStringField(block.content, "body") ??
					readStringField(block.content, "description");
				return (
					<div className="mt-4 text-sm leading-relaxed text-ink">
						{textBody ? (
							<p>{textBody}</p>
						) : (
							<p className="text-muted">No lesson text provided yet.</p>
						)}
					</div>
				);
			}

			case "VIDEO": {
				const durationSeconds = readNumberField(
					block.content,
					"durationSeconds",
				);
				const videoUrl =
					readStringField(block.content, "videoUrl") ??
					readStringField(block.content, "url");

				return (
					<div className="mt-4 flex flex-col gap-3 text-sm">
						{showResumeTimestamp ? (
							<div className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary-subtle px-3 py-1.5 text-xs font-semibold text-primary">
								<Icon name="play" className="size-4" />
								<span>
									Resume at {formatDurationSeconds(positionSeconds)} (
									{positionSeconds}s)
								</span>
							</div>
						) : null}
						{durationSeconds !== null ? (
							<p className="text-muted">
								Duration: {formatDurationSeconds(durationSeconds)}
							</p>
						) : null}
						{videoUrl ? (
							<p className="break-all text-primary">{videoUrl}</p>
						) : (
							<p className="text-muted">
								Video lesson metadata is ready for playback.
							</p>
						)}
					</div>
				);
			}

			case "FILE": {
				const fileName = readStringField(block.content, "fileName");
				const fileSize = readNumberField(block.content, "fileSize");

				return (
					<div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-canvas p-4 text-sm">
						<div className="flex items-center gap-2.5">
							<Icon name="file" className="size-5 text-primary" />
							<span className="font-medium text-ink">
								{fileName ?? "Course resource"}
							</span>
						</div>
						{fileSize !== null ? (
							<span className="text-xs text-muted">
								{formatFileSize(fileSize)}
							</span>
						) : null}
					</div>
				);
			}

			case "ASSIGNMENT": {
				const instructions =
					readStringField(block.content, "instructions") ??
					readStringField(block.content, "description");
				return (
					<div className="mt-4 text-sm text-ink">
						{instructions ? (
							<p>{instructions}</p>
						) : (
							<p className="text-muted">
								Review the assignment instructions from your lecturer.
							</p>
						)}
					</div>
				);
			}

			case "QUIZ":
			case "MODULE":
				return null;

			default: {
				const _exhaustive: never = block.type;
				return _exhaustive;
			}
		}
	}

	return (
		<section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
			<header className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<h1 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
						{course.title}
					</h1>

					<div className="flex flex-wrap items-center gap-2">
						<Link
							to="/courses/$courseId"
							params={{ courseId }}
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							Course overview
						</Link>
						<Link
							to="/my-courses"
							search={{ page: 1 }}
							className={buttonVariants({ variant: "outline", size: "sm" })}
						>
							My Courses
						</Link>
					</div>
				</div>

				{renderProgressPanel()}
			</header>

			{!activeBlock ? (
				<section className="rounded-2xl border border-border bg-white p-8 text-center">
					<h2 className="font-heading text-lg font-bold text-ink">
						No learning content yet
					</h2>
					<p className="mt-2 text-sm text-muted">
						This course does not have any published lessons or quizzes yet.
					</p>
				</section>
			) : (
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
					<aside aria-label="Course outline" className="lg:col-span-4">
						<nav
							aria-label="Course syllabus"
							className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4"
						>
							<h2 className="px-2 font-heading text-base font-bold text-ink">
								Course Outline
							</h2>

							<div className="flex flex-col gap-4">
								{outline.map((node) => {
									switch (node.kind) {
										case "module": {
											const contentChildren = node.children.filter(
												(child) => child.type !== "MODULE",
											);
											return (
												<div
													key={node.block.id}
													className="flex flex-col gap-2 rounded-xl border border-border bg-subtle p-3"
												>
													<h3 className="px-1 font-heading text-xs font-bold uppercase tracking-wider text-muted">
														{node.block.title}
													</h3>
													{contentChildren.length === 0 ? (
														<p className="px-1 text-xs text-muted">
															No lessons in this module.
														</p>
													) : (
														<ul className="flex flex-col gap-1.5">
															{contentChildren.map(renderOutlineItem)}
														</ul>
													)}
												</div>
											);
										}

										case "block":
											return (
												<ul
													key={node.block.id}
													className="flex flex-col gap-1.5"
												>
													{renderOutlineItem(node.block)}
												</ul>
											);

										default: {
											const _exhaustive: never = node;
											return _exhaustive;
										}
									}
								})}
							</div>
						</nav>
					</aside>

					<section
						aria-label="Lesson content"
						className="flex flex-col gap-5 lg:col-span-8"
					>
						{activeBlock.type === "QUIZ" ? (
							<StudentQuizPlayer
								key={`${courseId}:${activeBlock.id}`}
								courseId={courseId}
								blockId={activeBlock.id}
								blockTitle={activeBlock.title}
							/>
						) : (
							<article className="rounded-2xl border border-border bg-white p-6">
								<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
									<Icon
										name={getBlockIcon(activeBlock.type)}
										className="size-4"
									/>
									<span>{activeBlock.type}</span>
								</div>
								<h2 className="mt-2 font-heading text-2xl font-bold text-ink">
									{activeBlock.title}
								</h2>
								{renderNonQuizContent(activeBlock)}
							</article>
						)}

						<div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
							<Button
								variant="outline"
								size="sm"
								disabled={resolvedIndex <= 0}
								onClick={() => {
									const prevBlock = flattenedBlocks[resolvedIndex - 1];
									if (prevBlock) {
										handleSelectBlock(prevBlock.id);
									}
								}}
							>
								<Icon name="chevronLeft" className="size-4" />
								<span>Previous lesson</span>
							</Button>

							<span className="text-xs text-muted">
								{resolvedIndex + 1} of {flattenedBlocks.length}
							</span>

							<Button
								variant="outline"
								size="sm"
								disabled={resolvedIndex >= flattenedBlocks.length - 1}
								onClick={() => {
									const nextBlock = flattenedBlocks[resolvedIndex + 1];
									if (nextBlock) {
										handleSelectBlock(nextBlock.id);
									}
								}}
							>
								<span>Next lesson</span>
								<Icon name="chevronRight" className="size-4" />
							</Button>
						</div>
					</section>
				</div>
			)}
		</section>
	);
}
