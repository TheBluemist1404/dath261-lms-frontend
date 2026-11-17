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

const blockTypes: Array<{
	value: CourseBlockType;
	label: string;
	disabled?: boolean;
}> = [
	{ value: "MODULE", label: "Module" },
	{ value: "TEXT", label: "Text" },
	{ value: "FILE", label: "File" },
	{ value: "VIDEO", label: "Video" },
	{ value: "QUIZ", label: "Quiz", disabled: true },
	{ value: "ASSIGNMENT", label: "Assignment", disabled: true },
];

function isValidUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

function getStringContent(
	content: Record<string, unknown> | null | undefined,
	key: string,
): string {
	const value = content?.[key];
	return typeof value === "string" ? value : "";
}

function getNumberContent(
	content: Record<string, unknown> | null | undefined,
	key: string,
): string {
	const value = content?.[key];

	return typeof value === "number" && Number.isFinite(value)
		? String(value)
		: "";
}

function getBackendErrorMessage(error: unknown): string {
	if (typeof error === "object" && error !== null) {
		const response = (
			error as {
				response?: {
					data?: {
						message?: string | string[];
						error?: string;
					};
				};
				message?: string;
			}
		).response;

		const message = response?.data?.message;

		if (Array.isArray(message) && message.length > 0) {
			return message.join(", ");
		}

		if (typeof message === "string" && message.trim()) {
			return message;
		}

		if (
			typeof response?.data?.error === "string" &&
			response.data.error.trim()
		) {
			return response.data.error;
		}

		const errorMessage = (error as { message?: string }).message;

		if (typeof errorMessage === "string" && errorMessage.trim()) {
			return errorMessage;
		}
	}

	return "Failed to save the course block.";
}

function MarkdownPreview({ markdown }: { markdown: string }) {
	if (!markdown.trim()) {
		return <p className="text-sm italic text-muted">Nothing to preview yet.</p>;
	}

	const lineOccurrences = new Map<string, number>();

	return (
		<div className="rounded-lg border border-border bg-white p-4">
			<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
				Preview
			</p>

			<div className="space-y-3 text-sm">
				{markdown.split(/\r?\n/).map((line) => {
					const trimmed = line.trim();

					const occurrence = (lineOccurrences.get(trimmed) ?? 0) + 1;

					lineOccurrences.set(trimmed, occurrence);

					const key = `${trimmed}-${occurrence}`;

					if (!trimmed) {
						return <div key={`empty-${key}`} className="h-1" />;
					}

					if (trimmed.startsWith("### ")) {
						return (
							<h4 key={`heading-3-${key}`} className="text-base font-semibold">
								{formatInlineMarkdown(trimmed.slice(4))}
							</h4>
						);
					}

					if (trimmed.startsWith("## ")) {
						return (
							<h3 key={`heading-2-${key}`} className="text-lg font-semibold">
								{formatInlineMarkdown(trimmed.slice(3))}
							</h3>
						);
					}

					if (trimmed.startsWith("# ")) {
						return (
							<h2 key={`heading-1-${key}`} className="text-xl font-bold">
								{formatInlineMarkdown(trimmed.slice(2))}
							</h2>
						);
					}

					if (trimmed.startsWith("- ")) {
						return (
							<li key={`list-${key}`} className="ml-5 list-disc">
								{formatInlineMarkdown(trimmed.slice(2))}
							</li>
						);
					}

					return (
						<p key={`paragraph-${key}`}>{formatInlineMarkdown(trimmed)}</p>
					);
				})}
			</div>
		</div>
	);
}

function formatInlineMarkdown(text: string) {
	const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
	const occurrences = new Map<string, number>();

	return parts.map((part) => {
		const occurrence = (occurrences.get(part) ?? 0) + 1;
		occurrences.set(part, occurrence);

		const key = `${part}-${occurrence}`;

		if (part.startsWith("**") && part.endsWith("**")) {
			return <strong key={`bold-${key}`}>{part.slice(2, -2)}</strong>;
		}

		if (part.startsWith("*") && part.endsWith("*")) {
			return <em key={`italic-${key}`}>{part.slice(1, -1)}</em>;
		}

		if (part.startsWith("`") && part.endsWith("`")) {
			return (
				<code
					key={`code-${key}`}
					className="rounded bg-canvas px-1 py-0.5 font-mono text-xs"
				>
					{part.slice(1, -1)}
				</code>
			);
		}

		return part;
	});
}

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

	const [text, setText] = useState(
		getStringContent(initialBlock?.content, "text"),
	);

	const [videoUrl, setVideoUrl] = useState(
		getStringContent(initialBlock?.content, "url"),
	);

	const [durationSeconds, setDurationSeconds] = useState(
		getNumberContent(initialBlock?.content, "durationSeconds"),
	);

	const [fileUrl, setFileUrl] = useState(
		getStringContent(initialBlock?.content, "url"),
	);

	const [fileName, setFileName] = useState(
		getStringContent(initialBlock?.content, "fileName"),
	);

	const [sizeBytes, setSizeBytes] = useState(
		getNumberContent(initialBlock?.content, "sizeBytes"),
	);

	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const content = initialBlock?.content;

		setTitle(initialBlock?.title ?? "");
		setType(initialBlock?.type ?? (parentModuleId ? "TEXT" : "MODULE"));

		setText(getStringContent(content, "text"));

		setVideoUrl(getStringContent(content, "url"));
		setDurationSeconds(getNumberContent(content, "durationSeconds"));

		setFileUrl(getStringContent(content, "url"));
		setFileName(getStringContent(content, "fileName"));
		setSizeBytes(getNumberContent(content, "sizeBytes"));

		setError(null);
	}, [initialBlock, parentModuleId]);

	function validateAndBuildContent(): Record<string, unknown> | null {
		if (type === "MODULE") {
			return null;
		}

		if (type === "TEXT") {
			if (!text.trim()) {
				setError("Text content is required.");
				return null;
			}

			return {
				text: text.trim(),
			};
		}

		if (type === "VIDEO") {
			if (!videoUrl.trim()) {
				setError("Video URL is required.");
				return null;
			}

			if (!isValidUrl(videoUrl.trim())) {
				setError("Video URL must be a valid HTTP or HTTPS URL.");
				return null;
			}

			if (durationSeconds.trim()) {
				const duration = Number(durationSeconds);

				if (
					!Number.isFinite(duration) ||
					duration < 0 ||
					!Number.isInteger(duration)
				) {
					setError("Duration must be a non-negative integer.");
					return null;
				}

				return {
					url: videoUrl.trim(),
					durationSeconds: duration,
				};
			}

			return {
				url: videoUrl.trim(),
			};
		}

		if (type === "FILE") {
			if (!fileUrl.trim()) {
				setError("File URL is required.");
				return null;
			}

			if (!isValidUrl(fileUrl.trim())) {
				setError("File URL must be a valid HTTP or HTTPS URL.");
				return null;
			}

			if (!fileName.trim()) {
				setError("File name is required.");
				return null;
			}

			if (sizeBytes.trim()) {
				const size = Number(sizeBytes);

				if (!Number.isFinite(size) || size < 0 || !Number.isInteger(size)) {
					setError("File size must be a non-negative integer.");
					return null;
				}

				return {
					url: fileUrl.trim(),
					fileName: fileName.trim(),
					sizeBytes: size,
				};
			}

			return {
				url: fileUrl.trim(),
				fileName: fileName.trim(),
			};
		}

		setError(
			`${type} authoring is not available yet. Please choose Module, Text, Video, or File.`,
		);
		return null;
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!title.trim()) {
			setError("Title is required.");
			return;
		}

		const content = validateAndBuildContent();

		if (type !== "MODULE" && content === null) {
			return;
		}

		setError(null);

		try {
			if (mode === "edit" && initialBlock) {
				await onSubmit({
					title: title.trim(),
					type,
					content,
				});
			} else {
				await onSubmit({
					courseId,
					title: title.trim(),
					type,
					content,
					parentModuleId,
					position,
				});
			}
		} catch (submitError) {
			setError(getBackendErrorMessage(submitError));
		}
	}

	return (
		<form
			noValidate
			onSubmit={submit}
			className="flex flex-col gap-4 rounded-lg border border-border bg-canvas p-4"
		>
			<div>
				<label htmlFor="block-title" className="block text-sm font-semibold">
					Title *
				</label>
				<input
					id="block-title"
					className="mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3"
					value={title}
					onChange={(event) => setTitle(event.target.value)}
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
					onChange={(event) => setType(event.target.value as CourseBlockType)}
					disabled={busy || Boolean(initialBlock)}
				>
					{(initialBlock
						? blockTypes
						: parentModuleId
							? blockTypes.filter((item) => item.value !== "MODULE")
							: blockTypes.filter((item) => item.value === "MODULE")
					).map((item) => (
						<option
							key={item.value}
							value={item.value}
							disabled={item.disabled}
						>
							{item.label}
							{item.disabled ? " (coming later)" : ""}
						</option>
					))}
				</select>

				{initialBlock && (
					<p className="mt-1 text-xs text-muted">
						Block type cannot be changed after creation.
					</p>
				)}
			</div>

			{type === "TEXT" && (
				<div className="space-y-3">
					<div>
						<label htmlFor="block-text" className="block text-sm font-semibold">
							Markdown content *
						</label>

						<textarea
							id="block-text"
							rows={10}
							className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-mono text-sm"
							value={text}
							onChange={(event) => setText(event.target.value)}
							disabled={busy}
							placeholder="Write the lesson content using Markdown..."
						/>
					</div>

					<MarkdownPreview markdown={text} />
				</div>
			)}

			{type === "VIDEO" && (
				<div className="grid gap-3">
					<div>
						<label htmlFor="video-url" className="block text-sm font-semibold">
							Video URL *
						</label>

						<input
							id="video-url"
							type="url"
							className="mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3"
							value={videoUrl}
							onChange={(event) => setVideoUrl(event.target.value)}
							disabled={busy}
							placeholder="https://example.com/video"
						/>
					</div>

					<div>
						<label
							htmlFor="video-duration"
							className="block text-sm font-semibold"
						>
							Duration (seconds)
						</label>

						<input
							id="video-duration"
							type="number"
							min="0"
							step="1"
							className="mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3"
							value={durationSeconds}
							onChange={(event) => setDurationSeconds(event.target.value)}
							disabled={busy}
							placeholder="Optional"
						/>
					</div>
				</div>
			)}

			{type === "FILE" && (
				<div className="grid gap-3">
					<div>
						<label htmlFor="file-url" className="block text-sm font-semibold">
							File URL *
						</label>

						<input
							id="file-url"
							type="url"
							className="mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3"
							value={fileUrl}
							onChange={(event) => setFileUrl(event.target.value)}
							disabled={busy}
							placeholder="https://example.com/lecture.pdf"
						/>

						<p className="mt-1 text-xs text-muted">
							File upload is not available yet. Provide a file link.
						</p>
					</div>

					<div>
						<label htmlFor="file-name" className="block text-sm font-semibold">
							File name *
						</label>

						<input
							id="file-name"
							className="mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3"
							value={fileName}
							onChange={(event) => setFileName(event.target.value)}
							disabled={busy}
							placeholder="Lecture slides.pdf"
						/>
					</div>

					<div>
						<label htmlFor="file-size" className="block text-sm font-semibold">
							Size (bytes)
						</label>

						<input
							id="file-size"
							type="number"
							min="0"
							step="1"
							className="mt-1 min-h-10 w-full rounded-lg border border-border bg-white px-3"
							value={sizeBytes}
							onChange={(event) => setSizeBytes(event.target.value)}
							disabled={busy}
							placeholder="Optional"
						/>
					</div>
				</div>
			)}

			{type === "MODULE" && (
				<p className="rounded-lg border border-border bg-white p-3 text-sm text-muted">
					Modules do not have a content payload. Add lessons or resources inside
					this module separately.
				</p>
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
