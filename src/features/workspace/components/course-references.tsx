import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getApiErrorMessage } from "@/lib/http/errors";
import { pageReferencesQuery } from "../api/workspace.queries";
import { useDeleteReference } from "../hooks/use-reference-mutations";
import { formatTimestamp } from "../timestamp";
import type { CourseReference, ReferencedBlock } from "../types";
import { ErrorState } from "./query-state";
import { ReferencePickerDialog } from "./reference-picker-dialog";

/**
 * Where "Open source" leads. The course player does not exist yet, so this is the
 * agreed URL shape for it; `t` is the start time in seconds for videos.
 */
export function courseBlockHref(
	block: Pick<ReferencedBlock, "id" | "courseId">,
	timestampSeconds: number | null,
) {
	const params = new URLSearchParams({ block: block.id });
	if (timestampSeconds !== null) params.set("t", String(timestampSeconds));
	return `/courses/${block.courseId}?${params}`;
}

export function CourseReferences({
	pageId,
	destination,
	canEdit,
}: {
	pageId: string;
	destination: string;
	canEdit: boolean;
}) {
	const references = useQuery(pageReferencesQuery(pageId));
	const remove = useDeleteReference(pageId);
	const [picking, setPicking] = useState(false);

	return (
		<section
			aria-labelledby={`references-${pageId}`}
			className="space-y-3 border-t border-border pt-5"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h3
					id={`references-${pageId}`}
					className="font-heading text-lg font-semibold"
				>
					Course references
				</h3>
				{canEdit && (
					<Button variant="secondary" onClick={() => setPicking(true)}>
						Insert course reference
					</Button>
				)}
			</div>

			{references.isPending ? (
				<output className="block text-sm text-muted">
					Loading references…
				</output>
			) : references.isError ? (
				<ErrorState
					title="References could not be loaded"
					error={references.error}
					onRetry={() => references.refetch()}
				/>
			) : references.data.length === 0 ? (
				<p className="text-sm text-muted">
					No course files or videos are linked to this page yet.
				</p>
			) : (
				<ul className="space-y-3">
					{references.data.map((reference) => (
						<li key={reference.id}>
							<ReferenceCard
								reference={reference}
								onRemove={
									canEdit ? () => remove.mutate(reference.id) : undefined
								}
								removing={remove.isPending && remove.variables === reference.id}
							/>
						</li>
					))}
				</ul>
			)}
			{remove.isError && (
				<p role="alert" className="text-sm text-error">
					{getApiErrorMessage(remove.error)}
				</p>
			)}

			{canEdit && (
				<ReferencePickerDialog
					open={picking}
					onClose={() => setPicking(false)}
					pageId={pageId}
					destination={destination}
				/>
			)}
		</section>
	);
}

export function ReferenceCard({
	reference,
	onRemove,
	removing = false,
}: {
	reference: CourseReference;
	onRemove?: () => void;
	removing?: boolean;
}) {
	const available = reference.status === "AVAILABLE";
	const label = available
		? `Remove reference to ${reference.block.title}`
		: "Remove protected reference";

	return (
		<div className="flex items-start gap-3 rounded-lg border border-border p-4">
			<span className="mt-0.5 text-muted">
				<Icon
					name={
						!available
							? "lock"
							: reference.block.type === "VIDEO"
								? "play"
								: "file"
					}
				/>
			</span>
			<div className="min-w-0 flex-1 space-y-1">
				{available ? (
					<>
						<p className="font-semibold [overflow-wrap:anywhere]">
							{reference.block.title}
						</p>
						<p className="text-sm text-muted">
							{reference.block.type === "VIDEO"
								? "Course video reference"
								: "Course file reference"}{" "}
							· {reference.block.courseTitle}
							{reference.timestampSeconds !== null &&
								` · Starts at ${formatTimestamp(reference.timestampSeconds)}`}
						</p>
						<a
							href={courseBlockHref(
								reference.block,
								reference.timestampSeconds,
							)}
							className="inline-block text-sm font-semibold text-primary hover:underline"
						>
							Open source &rarr;
						</a>
					</>
				) : (
					<>
						<p className="font-semibold">Protected reference</p>
						<p className="text-sm text-muted">
							This resource is unavailable. Your own notes remain visible.
						</p>
						<p className="text-sm font-semibold">
							{reference.status === "LOCKED"
								? "Locked · Course access required"
								: "Source no longer available"}
						</p>
					</>
				)}
			</div>
			{onRemove && (
				<Button
					variant="ghost"
					aria-label={label}
					disabled={removing}
					onClick={onRemove}
				>
					{removing ? "Removing…" : "Remove"}
				</Button>
			)}
		</div>
	);
}
