import type { ReactNode } from "react";

/**
 * The small Markdown subset lecturers write in TEXT blocks: `#`/`##`/`###` headings,
 * `- ` list items, paragraphs, **bold**, *italic* and `code`. Shared by the block form
 * preview and the student reader.
 */
export function MarkdownText({
	markdown,
	className = "space-y-3 text-sm",
}: {
	markdown: string;
	className?: string;
}) {
	const lineOccurrences = new Map<string, number>();

	return (
		<div className={className}>
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

				return <p key={`paragraph-${key}`}>{formatInlineMarkdown(trimmed)}</p>;
			})}
		</div>
	);
}

function formatInlineMarkdown(text: string): ReactNode[] {
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
