import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import type { CourseBlock, CourseBlockType } from "../types/course-block.types";

export interface CourseSyllabusAccordionProps {
	blocks: CourseBlock[];
}

interface ModuleGroup {
	id: string;
	title: string;
	lessons: CourseBlock[];
}

function getBlockIcon(type: CourseBlockType): IconName {
	switch (type) {
		case "VIDEO":
			return "play";
		case "QUIZ":
			return "checkCircle";
		case "ASSIGNMENT":
			return "book";
		default:
			return "file";
	}
}

function formatBlockMeta(block: CourseBlock): string | null {
	if (!block.content) return null;
	const content = block.content;
	if (typeof content.durationSeconds === "number") {
		const minutes = Math.round(content.durationSeconds / 60);
		return `${minutes} min`;
	}
	if (typeof content.questionCount === "number") {
		return `${content.questionCount} questions`;
	}
	return null;
}

function organizeBlocks(blocks: CourseBlock[]): ModuleGroup[] {
	const moduleBlocks = blocks.filter((b) => b.type === "MODULE");

	if (moduleBlocks.length === 0) {
		if (blocks.length === 0) return [];
		return [
			{
				id: "module-root",
				title: "Course Content",
				lessons: blocks,
			},
		];
	}

	return moduleBlocks.map((mod) => {
		let lessons = mod.children ?? [];
		if (lessons.length === 0) {
			lessons = blocks.filter((b) => b.parentModuleId === mod.id);
		}
		return {
			id: mod.id,
			title: mod.title,
			lessons,
		};
	});
}

export function CourseSyllabusAccordion({
	blocks,
}: CourseSyllabusAccordionProps) {
	const modules = organizeBlocks(blocks);
	const totalLessons = modules.reduce(
		(sum, mod) => sum + mod.lessons.length,
		0,
	);

	const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(() =>
		modules.length > 0 ? new Set([modules[0].id]) : new Set(),
	);

	const allExpanded =
		modules.length > 0 && expandedModuleIds.size === modules.length;

	function toggleModule(moduleId: string) {
		setExpandedModuleIds((prev) => {
			const next = new Set(prev);
			if (next.has(moduleId)) {
				next.delete(moduleId);
			} else {
				next.add(moduleId);
			}
			return next;
		});
	}

	function toggleAll() {
		if (allExpanded) {
			setExpandedModuleIds(new Set());
		} else {
			setExpandedModuleIds(new Set(modules.map((m) => m.id)));
		}
	}

	if (modules.length === 0) {
		return (
			<section
				aria-labelledby="course-syllabus-heading"
				className="rounded-2xl border border-border bg-white p-6"
			>
				<h2
					id="course-syllabus-heading"
					className="font-heading text-lg font-bold text-ink"
				>
					Course Syllabus
				</h2>
				<p className="mt-3 text-sm text-muted">
					The detailed syllabus for this course is being assembled by the
					lecturer.
				</p>
			</section>
		);
	}

	return (
		<section
			aria-labelledby="course-syllabus-heading"
			className="rounded-2xl border border-border bg-white p-6"
		>
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
				<div className="flex flex-col gap-1">
					<h2
						id="course-syllabus-heading"
						className="font-heading text-lg font-bold text-ink"
					>
						Course Syllabus
					</h2>
					<p className="text-xs text-muted">
						{modules.length} {modules.length === 1 ? "module" : "modules"} •{" "}
						{totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={toggleAll}>
					{allExpanded ? "Collapse all" : "Expand all"}
				</Button>
			</div>

			<div className="mt-4 flex flex-col gap-3">
				{modules.map((mod) => {
					const isExpanded = expandedModuleIds.has(mod.id);
					const contentId = `module-content-${mod.id}`;

					return (
						<div
							key={mod.id}
							className="overflow-hidden rounded-xl border border-border bg-subtle"
						>
							<Button
								variant="ghost"
								onClick={() => toggleModule(mod.id)}
								aria-expanded={isExpanded}
								aria-controls={contentId}
								className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-ink hover:bg-border/40"
							>
								<div className="flex items-center gap-2.5">
									<Icon
										name={isExpanded ? "chevronDown" : "chevronRight"}
										className="size-4 shrink-0 text-muted"
									/>
									<span className="font-heading text-sm font-semibold text-ink">
										{mod.title}
									</span>
								</div>
								<span className="text-xs font-medium text-muted">
									{mod.lessons.length}{" "}
									{mod.lessons.length === 1 ? "item" : "items"}
								</span>
							</Button>

							{isExpanded ? (
								<div
									id={contentId}
									className="border-t border-border bg-white px-4 py-2"
								>
									{mod.lessons.length === 0 ? (
										<p className="py-2 text-xs text-muted">
											No lessons listed in this module yet.
										</p>
									) : (
										<ul className="flex flex-col divide-y divide-border/60">
											{mod.lessons.map((lesson) => {
												const meta = formatBlockMeta(lesson);
												return (
													<li
														key={lesson.id}
														className="flex items-center justify-between gap-3 py-2.5 text-sm"
													>
														<div className="flex items-center gap-2.5">
															<Icon
																name={getBlockIcon(lesson.type)}
																className="size-4 shrink-0 text-primary"
															/>
															<span className="font-medium text-ink">
																{lesson.title}
															</span>
														</div>
														<div className="flex items-center gap-2 text-xs text-muted">
															{meta ? <span>{meta}</span> : null}
															<span className="rounded bg-subtle px-1.5 py-0.5 uppercase tracking-wide">
																{lesson.type.toLowerCase()}
															</span>
														</div>
													</li>
												);
											})}
										</ul>
									)}
								</div>
							) : null}
						</div>
					);
				})}
			</div>
		</section>
	);
}
