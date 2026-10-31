import { type FormEvent, useEffect, useState } from "react";
import type {
	CourseBlock,
	CourseBlockInput,
	CourseBlockType,
} from "../../types/course-block.types";

interface CourseBlockFormProps {
	courseId: string;
	mode: "create" | "edit";
	initialBlock?: CourseBlock | null;
	parentModuleId?: string | null;
	position: number;
	busy?: boolean;
	onSubmit: (
		input:
			| CourseBlockInput
			| (Partial<Omit<CourseBlockInput, "courseId">> & { courseId?: string }),
	) => Promise<void> | void;
	onCancel: () => void;
}

const blockTypes: Array<{ value: CourseBlockType; label: string }> = [
	{ value: "MODULE", label: "Module" },
	{ value: "TEXT", label: "Text" },
	{ value: "FILE", label: "File" },
	{ value: "VIDEO", label: "Video" },
	{ value: "QUIZ", label: "Quiz" },
	{ value: "ASSIGNMENT", label: "Assignment" },
];

export function CourseBlockForm({
	courseId,
	mode,
	initialBlock,
	parentModuleId = null,
	position,
	busy = false,
	onSubmit,
	onCancel,
}: CourseBlockFormProps) {
	const [title, setTitle] = useState(initialBlock?.title ?? "");
	const [type, setType] = useState<CourseBlockType>(
		initialBlock?.type ?? (parentModuleId ? "TEXT" : "MODULE"),
	);
	const [contentText, setContentText] = useState(
		initialBlock?.content
			? JSON.stringify(initialBlock.content, null, 2)
			: "{}",
	);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		setTitle(initialBlock?.title ?? "");
		setType(initialBlock?.type ?? (parentModuleId ? "TEXT" : "MODULE"));
		setContentText(
			initialBlock?.content
				? JSON.stringify(initialBlock.content, null, 2)
				: "{}",
		);
		setError(null);
	}, [initialBlock, parentModuleId]);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!title.trim()) {
			setError("Title is required.");
			return;
		}
		let content: Record<string, unknown> | null = null;
		if (type !== "MODULE" && contentText.trim()) {
			try {
				const parsed: unknown = JSON.parse(contentText);
				if (
					parsed === null ||
					Array.isArray(parsed) ||
					typeof parsed !== "object"
				)
					throw new Error();
				content = parsed as Record<string, unknown>;
			} catch {
				setError("Content must be a valid JSON object.");
				return;
			}
		}
		setError(null);
		if (mode === "edit" && initialBlock)
			await onSubmit({ title: title.trim(), type, content });
		else
			await onSubmit({
				courseId,
				title: title.trim(),
				type,
				content,
				parentModuleId,
				position,
			});
	}

	return (
		<form
			onSubmit={submit}
			className="flex flex-col gap-3 rounded-lg border border-border bg-canvas p-4"
		>
			<div>
				<label htmlFor="block-title" className="block text-sm font-semibold">
					Title *
				</label>
				<input
					id="block-title"
					className="mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
					maxLength={150}
					disabled={busy}
				/>
			</div>
			<div>
				<label htmlFor="block-type" className="block text-sm font-semibold">
					Block type
				</label>
				<select
					id="block-type"
					className="mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3"
					value={type}
					onChange={(e) => setType(e.target.value as CourseBlockType)}
					disabled={busy || Boolean(initialBlock)}
				>
					{(initialBlock
						? blockTypes
						: parentModuleId
							? blockTypes.filter((item) => item.value !== "MODULE")
							: blockTypes.filter((item) => item.value === "MODULE")
					).map((item) => (
						<option key={item.value} value={item.value}>
							{item.label}
						</option>
					))}
				</select>
				{initialBlock && (
					<p className="mt-1 text-xs text-muted">
						Block type cannot be changed after creation.
					</p>
				)}
			</div>
			{type !== "MODULE" && (
				<div>
					<label
						htmlFor="block-content"
						className="block text-sm font-semibold"
					>
						Content payload (JSON object)
					</label>
					<textarea
						id="block-content"
						rows={5}
						className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-mono text-xs"
						value={contentText}
						onChange={(e) => setContentText(e.target.value)}
						disabled={busy}
						spellCheck={false}
					/>
					<p className="mt-1 text-xs text-muted">
						Use the payload fields expected for the selected block type.
					</p>
				</div>
			)}
			{error && (
				<p role="alert" className="text-sm text-error">
					{error}
				</p>
			)}
			<div className="flex gap-2">
				<button
					type="submit"
					disabled={busy}
					className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
				>
					{mode === "create" ? "Add block" : "Save block"}
				</button>
				<button
					type="button"
					onClick={onCancel}
					disabled={busy}
					className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}
