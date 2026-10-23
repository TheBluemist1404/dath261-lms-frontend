import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/http/errors";
import { useCreatePage, useUpdatePage } from "../hooks/use-page-mutations";
import { buildPageTree, flattenPageTree, getDescendantIds } from "../page-tree";
import type { PageSummary } from "../types";

const rootValue = "";
const fieldClass =
	"mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

interface DialogBaseProps {
	open: boolean;
	onClose: () => void;
}

function ParentSelect({
	id,
	label,
	pages,
	value,
	onChange,
}: {
	id: string;
	label: string;
	pages: PageSummary[];
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div>
			<label htmlFor={id} className="text-sm font-semibold">
				{label}
			</label>
			<select
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className={fieldClass}
			>
				<option value={rootValue}>Workspace root</option>
				{flattenPageTree(buildPageTree(pages)).map(({ page, depth }) => (
					<option key={page.id} value={page.id}>
						{`${"  ".repeat(depth)}${page.title}`}
					</option>
				))}
			</select>
		</div>
	);
}

function DialogActions({
	pending,
	disabled,
	submitLabel,
	pendingLabel,
	onCancel,
}: {
	pending: boolean;
	disabled: boolean;
	submitLabel: string;
	pendingLabel: string;
	onCancel: () => void;
}) {
	return (
		<div className="flex justify-end gap-3">
			<Button variant="secondary" onClick={onCancel}>
				Cancel
			</Button>
			<Button type="submit" disabled={disabled || pending}>
				{pending ? pendingLabel : submitLabel}
			</Button>
		</div>
	);
}

function MutationError({ error }: { error: unknown }) {
	return error ? (
		<p role="alert" className="text-sm text-error">
			{getApiErrorMessage(error)}
		</p>
	) : null;
}

export function NewPageDialog({
	open,
	onClose,
	workspaceId,
	pages,
	defaultParentId = null,
}: DialogBaseProps & {
	workspaceId: string;
	pages: PageSummary[];
	defaultParentId?: string | null;
}) {
	const navigate = useNavigate();
	const [title, setTitle] = useState("");
	const [parentId, setParentId] = useState(defaultParentId ?? rootValue);
	const create = useCreatePage(workspaceId);
	const titleId = useId();
	const parentSelectId = useId();

	function close() {
		setTitle("");
		setParentId(defaultParentId ?? rootValue);
		create.reset();
		onClose();
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = title.trim();
		if (!trimmed) return;
		create.mutate(
			{ title: trimmed, parentPageId: parentId || null },
			{
				onSuccess: (page) => {
					close();
					navigate({
						to: "/workspace/$id/pages/$pageId",
						params: { id: workspaceId, pageId: page.id },
					});
				},
			},
		);
	}

	return (
		<Dialog
			open={open}
			onClose={close}
			title="Create a page"
			description="Choose a parent page or create it at the workspace root."
		>
			<form onSubmit={submit} className="space-y-5">
				<div>
					<label htmlFor={titleId} className="text-sm font-semibold">
						Page title
					</label>
					<input
						id={titleId}
						required
						maxLength={200}
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						className={fieldClass}
					/>
				</div>
				<ParentSelect
					id={parentSelectId}
					label="Parent page"
					pages={pages}
					value={parentId}
					onChange={setParentId}
				/>
				<MutationError error={create.error} />
				<DialogActions
					pending={create.isPending}
					disabled={!title.trim()}
					submitLabel="Create page"
					pendingLabel="Creating…"
					onCancel={close}
				/>
			</form>
		</Dialog>
	);
}

export function RenamePageDialog({
	open,
	onClose,
	page,
}: DialogBaseProps & { page: PageSummary }) {
	const [title, setTitle] = useState(page.title);
	const update = useUpdatePage(page.id);
	const titleId = useId();
	const trimmed = title.trim();

	function close() {
		setTitle(page.title);
		update.reset();
		onClose();
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!trimmed || trimmed === page.title) return;
		update.mutate({ title: trimmed }, { onSuccess: onClose });
	}

	return (
		<Dialog open={open} onClose={close} title="Rename page">
			<form onSubmit={submit} className="space-y-5">
				<div>
					<label htmlFor={titleId} className="text-sm font-semibold">
						Page title
					</label>
					<input
						id={titleId}
						required
						maxLength={200}
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						className={fieldClass}
					/>
				</div>
				<MutationError error={update.error} />
				<DialogActions
					pending={update.isPending}
					disabled={!trimmed || trimmed === page.title}
					submitLabel="Rename page"
					pendingLabel="Renaming…"
					onCancel={close}
				/>
			</form>
		</Dialog>
	);
}

export function MovePageDialog({
	open,
	onClose,
	page,
	pages,
}: DialogBaseProps & { page: PageSummary; pages: PageSummary[] }) {
	const current = page.parentPageId ?? rootValue;
	const [parentId, setParentId] = useState(current);
	const update = useUpdatePage(page.id);
	const parentSelectId = useId();
	// A page cannot move under itself or its own subtree.
	const excluded = getDescendantIds(pages, page.id).add(page.id);
	const destinations = pages.filter((candidate) => !excluded.has(candidate.id));

	function close() {
		setParentId(current);
		update.reset();
		onClose();
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (parentId === current) return;
		update.mutate({ parentPageId: parentId || null }, { onSuccess: onClose });
	}

	return (
		<Dialog
			open={open}
			onClose={close}
			title="Move this page"
			description="Choose a page in this workspace. A page cannot move into its own subpages."
		>
			<form onSubmit={submit} className="space-y-5">
				<ParentSelect
					id={parentSelectId}
					label="Destination page"
					pages={destinations}
					value={parentId}
					onChange={setParentId}
				/>
				<MutationError error={update.error} />
				<DialogActions
					pending={update.isPending}
					disabled={parentId === current}
					submitLabel="Move page"
					pendingLabel="Moving…"
					onCancel={close}
				/>
			</form>
		</Dialog>
	);
}
