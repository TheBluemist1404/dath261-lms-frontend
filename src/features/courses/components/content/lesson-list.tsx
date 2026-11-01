import type { CourseBlock } from "../../types/course-block.types";

interface CourseBlockListProps {
	blocks: CourseBlock[];
	loading?: boolean;
	error?: string | null;
	onEdit: (block: CourseBlock) => void;
	onDelete: (block: CourseBlock) => void;
	onCreateChild?: (module: CourseBlock) => void;
	onCreate?: () => void;
}

export function CourseBlockList({
	blocks,
	loading = false,
	error = null,
	onEdit,
	onDelete,
	onCreateChild,
	onCreate,
}: CourseBlockListProps) {
	if (loading)
		return <p className="p-6 text-sm text-muted">Loading course content…</p>;
	if (error)
		return (
			<p role="alert" className="p-6 text-sm text-error">
				{error}
			</p>
		);
	if (!blocks.length)
		return (
			<div className="rounded-xl border border-dashed border-border p-8 text-center">
				<p className="font-semibold">No content blocks yet</p>
				<p className="mt-1 text-sm text-muted">
					Start by adding a module, then add learning content inside it.
				</p>
				{onCreate && (
					<button
						type="button"
						onClick={onCreate}
						className="mt-4 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
					>
						Add module
					</button>
				)}
			</div>
		);
	const ordered = [...blocks].sort((a, b) => a.position - b.position);
	return (
		<div className="flex flex-col gap-3">
			{ordered.map((block) => (
				<article
					key={block.id}
					className="rounded-xl border border-border bg-white p-4"
				>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="rounded bg-primary-subtle px-2 py-1 text-xs font-bold text-primary">
									{block.type}
								</span>
								<span className="text-xs text-muted">
									Position {block.position + 1}
								</span>
							</div>
							<h3 className="mt-2 font-semibold">{block.title}</h3>
							{block.content && (
								<pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-words rounded bg-canvas p-2 text-xs text-muted">
									{JSON.stringify(block.content, null, 2)}
								</pre>
							)}
						</div>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => onEdit(block)}
								className="min-h-9 rounded-lg border border-border px-3 text-sm font-semibold"
							>
								Edit
							</button>
							{block.type === "MODULE" && onCreateChild && (
								<button
									type="button"
									onClick={() => onCreateChild(block)}
									className="min-h-9 rounded-lg border border-border px-3 text-sm font-semibold"
								>
									Add child
								</button>
							)}
							<button
								type="button"
								onClick={() => onDelete(block)}
								className="min-h-9 rounded-lg border border-error/30 px-3 text-sm font-semibold text-error"
							>
								Delete
							</button>
						</div>
					</div>
					{block.type === "MODULE" && block.children?.length ? (
						<div className="mt-4 flex flex-col gap-2 border-l-2 border-border pl-4">
							{[...block.children]
								.sort((a, b) => a.position - b.position)
								.map((child) => (
									<div
										key={child.id}
										className="flex flex-wrap items-center gap-2 rounded-lg bg-canvas px-3 py-2"
									>
										<span className="text-xs font-bold text-primary">
											{child.type}
										</span>
										<span className="min-w-0 flex-1 text-sm font-medium">
											{child.title}
										</span>
										<button
											type="button"
											onClick={() => onEdit(child)}
											className="text-sm font-semibold text-primary"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => onDelete(child)}
											className="text-sm font-semibold text-error"
										>
											Delete
										</button>
									</div>
								))}
						</div>
					) : null}
				</article>
			))}
		</div>
	);
}
