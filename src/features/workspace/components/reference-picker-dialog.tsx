import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type FormEvent, useDeferredValue, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/http/errors";
import { referenceSourcesQuery } from "../api/workspace.queries";
import { useCreateReference } from "../hooks/use-reference-mutations";
import { formatTimestamp, parseTimestamp } from "../timestamp";
import type { ReferenceBlockType, ReferencedBlock } from "../types";

const fieldClass =
	"mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-error";

const typeLabels: Record<ReferenceBlockType, { tab: string; plural: string }> =
	{
		FILE: { tab: "File", plural: "files" },
		VIDEO: { tab: "Video", plural: "videos" },
	};

export function ReferencePickerDialog({
	open,
	onClose,
	pageId,
	destination,
}: {
	open: boolean;
	onClose: () => void;
	pageId: string;
	/** "Workspace / Page" shown so the user knows where the reference lands. */
	destination: string;
}) {
	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Insert a course reference"
			description="Choose a course file or video you can access. Access is checked again every time the reference is opened."
		>
			{open && (
				<PickerForm
					pageId={pageId}
					destination={destination}
					onDone={onClose}
				/>
			)}
		</Dialog>
	);
}

function PickerForm({
	pageId,
	destination,
	onDone,
}: {
	pageId: string;
	destination: string;
	onDone: () => void;
}) {
	const searchId = useId();
	const timestampId = useId();
	const timestampHintId = useId();
	const timestampErrorId = useId();
	const [type, setType] = useState<ReferenceBlockType>("FILE");
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [timestamp, setTimestamp] = useState("");
	const [timestampError, setTimestampError] = useState<string | null>(null);
	const q = useDeferredValue(search.trim());
	const sources = useQuery({
		...referenceSourcesQuery({ type, q }),
		placeholderData: keepPreviousData,
	});
	const create = useCreateReference(pageId);
	const selected = sources.data?.find((block) => block.id === selectedId);

	function chooseType(next: ReferenceBlockType) {
		setType(next);
		setSelectedId(null);
		setTimestamp("");
		setTimestampError(null);
		create.reset();
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selected) return;

		let timestampSeconds: number | null = null;
		if (selected.type === "VIDEO" && timestamp.trim()) {
			timestampSeconds = parseTimestamp(timestamp);
			const duration = selected.durationSeconds;
			if (
				timestampSeconds === null ||
				(duration !== null && timestampSeconds > duration)
			) {
				setTimestampError(
					duration === null
						? "Enter a time like 4:32."
						: `Enter a time like 4:32, no later than ${formatTimestamp(duration)}.`,
				);
				return;
			}
		}
		setTimestampError(null);
		create.mutate(
			{ courseBlockId: selected.id, timestampSeconds },
			{ onSuccess: onDone },
		);
	}

	return (
		<form onSubmit={submit} className="space-y-4">
			<p className="text-sm">
				<span className="font-semibold">Reference destination: </span>
				{destination}
			</p>

			<div>
				<label htmlFor={searchId} className="text-sm font-semibold">
					Search course materials
				</label>
				<input
					id={searchId}
					type="search"
					value={search}
					placeholder="Course or material title"
					onChange={(event) => setSearch(event.target.value)}
					className={fieldClass}
				/>
			</div>

			<div className="flex gap-2">
				{(["FILE", "VIDEO"] as const).map((option) => (
					<button
						key={option}
						type="button"
						aria-pressed={type === option}
						onClick={() => chooseType(option)}
						className="min-h-11 flex-1 rounded-lg px-4 text-sm font-semibold text-muted hover:bg-subtle aria-pressed:bg-primary-subtle aria-pressed:text-primary"
					>
						{typeLabels[option].tab}
					</button>
				))}
			</div>

			<SourceList
				type={type}
				query={q}
				sources={sources.data}
				isPending={sources.isPending}
				error={sources.isError ? sources.error : null}
				onRetry={() => sources.refetch()}
				selectedId={selectedId}
				onSelect={(id) => {
					setSelectedId(id);
					create.reset();
				}}
			/>

			{selected?.type === "VIDEO" && (
				<div>
					<label htmlFor={timestampId} className="text-sm font-semibold">
						Start at timestamp (optional)
					</label>
					<input
						id={timestampId}
						value={timestamp}
						inputMode="numeric"
						placeholder="4:32"
						aria-invalid={timestampError !== null}
						aria-describedby={
							timestampError
								? `${timestampErrorId} ${timestampHintId}`
								: timestampHintId
						}
						onChange={(event) => setTimestamp(event.target.value)}
						className={fieldClass}
					/>
					{timestampError && (
						<p id={timestampErrorId} className="mt-2 text-sm text-error">
							{timestampError}
						</p>
					)}
					<p id={timestampHintId} className="mt-2 text-sm text-muted">
						Use m:ss or h:mm:ss. The timestamp sets where playback starts; it
						does not change who can open the video.
					</p>
				</div>
			)}

			{create.isError && (
				<p role="alert" className="text-sm text-error">
					{getApiErrorMessage(create.error)}
				</p>
			)}

			<div className="flex justify-end gap-3">
				<Button variant="secondary" onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit" disabled={!selected || create.isPending}>
					{create.isPending ? "Inserting…" : "Insert reference"}
				</Button>
			</div>
		</form>
	);
}

function SourceList({
	type,
	query,
	sources,
	isPending,
	error,
	onRetry,
	selectedId,
	onSelect,
}: {
	type: ReferenceBlockType;
	query: string;
	sources: ReferencedBlock[] | undefined;
	isPending: boolean;
	error: Error | null;
	onRetry: () => void;
	selectedId: string | null;
	onSelect: (id: string) => void;
}) {
	const plural = typeLabels[type].plural;

	if (error) {
		return (
			<div role="alert" className="space-y-2 rounded-lg bg-subtle p-4 text-sm">
				<p className="font-semibold">Course materials could not be loaded</p>
				<p className="text-muted">{getApiErrorMessage(error)}</p>
				<Button variant="secondary" onClick={onRetry}>
					Try again
				</Button>
			</div>
		);
	}
	if (isPending || !sources) {
		return (
			<output className="block text-sm text-muted">Loading {plural}…</output>
		);
	}
	if (sources.length === 0) {
		return (
			<p className="rounded-lg bg-subtle p-4 text-sm text-muted">
				{query
					? `No course ${plural} match “${query}”.`
					: `No eligible course ${plural}. Only materials from courses you are enrolled in can be referenced.`}
			</p>
		);
	}

	return (
		<fieldset className="space-y-2">
			<legend className="text-sm font-semibold">Course {plural}</legend>
			{sources.map((block) => (
				<label
					key={block.id}
					className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border p-3 has-checked:border-primary has-checked:bg-primary-subtle"
				>
					<input
						type="radio"
						name="reference-source"
						value={block.id}
						checked={selectedId === block.id}
						onChange={() => onSelect(block.id)}
						className="accent-primary"
					/>
					<span className="min-w-0">
						<span className="block font-semibold [overflow-wrap:anywhere]">
							{block.title}
						</span>
						<span className="block text-sm text-muted">
							{block.courseTitle}
							{block.durationSeconds !== null &&
								` · ${formatTimestamp(block.durationSeconds)}`}
						</span>
					</span>
				</label>
			))}
		</fieldset>
	);
}
