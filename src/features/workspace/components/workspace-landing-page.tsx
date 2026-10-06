import { Link } from "@tanstack/react-router";
import { type FormEvent, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
	previewRecentPages,
	previewWorkspaces,
	type WorkspaceSummary,
} from "../workspace-preview-data";
import { WorkspaceCard } from "./workspace-card";

export function WorkspaceLandingPage({
	initialWorkspaces = previewWorkspaces,
}: {
	initialWorkspaces?: WorkspaceSummary[];
}) {
	const [workspaces, setWorkspaces] = useState(() => [...initialWorkspaces]);
	const [workspaceName, setWorkspaceName] = useState("");
	const createDialog = useRef<HTMLDialogElement>(null);

	function createWorkspace(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const title = workspaceName.trim();
		if (!title) return;

		setWorkspaces((current) => [
			...current,
			{ id: crypto.randomUUID(), title, pageCount: 0, collaboratorCount: 0 },
		]);
		createDialog.current?.close();
		setWorkspaceName("");
	}

	return (
		<div className="mx-auto max-w-6xl space-y-10">
			<header>
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
					Your study space
				</p>
				<h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
					Workspaces
				</h1>
				<p className="mt-3 max-w-2xl text-base leading-7 text-muted">
					A home for your notes, ideas, and shared learning. Pick up where you
					left off, or make space for something new.
				</p>
			</header>

			<section aria-labelledby="personal-workspace-heading">
				<div className="grid overflow-hidden rounded-2xl border border-border bg-white lg:grid-cols-[1.4fr_1fr]">
					<div className="bg-primary-subtle p-6 sm:p-8">
						<span className="flex size-12 items-center justify-center rounded-xl bg-white text-primary">
							<Icon name="workspace" />
						</span>
						<h2
							id="personal-workspace-heading"
							className="mt-6 font-heading text-2xl font-bold tracking-tight"
						>
							My workspace
						</h2>
						<p className="mt-3 max-w-lg text-sm leading-6 text-muted">
							Your personal corner of Nodus. Organize study notes, collect
							ideas, and turn what you learn into knowledge you can return to.
						</p>
						<Link
							to="/workspace/me"
							className="mt-6 inline-flex min-h-11 items-center justify-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
						>
							Open my workspace
							<span aria-hidden="true">&rarr;</span>
						</Link>
					</div>
					<div className="p-6 sm:p-8">
						<h3 className="font-heading text-base font-bold">Recently used</h3>
						<ul className="mt-4 space-y-2">
							{previewRecentPages.map((page) => (
								<li key={page.id}>
									<Link
										to="/workspace/me"
										hash={page.id}
										className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-subtle hover:text-primary"
									>
										<span className="text-muted">
											<Icon name="book" />
										</span>
										<span className="min-w-0 flex-1">{page.title}</span>
										<span aria-hidden="true">&rarr;</span>
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<section aria-labelledby="additional-workspaces-heading">
				<div className="flex flex-row items-center justify-between gap-4">
					<h2
						id="additional-workspaces-heading"
						className="min-w-0 font-heading text-xl font-bold tracking-tight"
					>
						Additional workspaces
					</h2>
					<button
						type="button"
						onClick={() => createDialog.current?.showModal()}
						className="min-h-11 shrink-0 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
					>
						Create workspace
					</button>
				</div>
				{workspaces.length > 0 ? (
					<div className="mt-5 grid gap-6 sm:grid-cols-2">
						{workspaces.map((workspace) => (
							<WorkspaceCard key={workspace.id} workspace={workspace} />
						))}
					</div>
				) : (
					<div className="mt-5 flex gap-4 rounded-xl border border-dashed border-border bg-white p-6">
						<span className="mt-1 text-muted">
							<Icon name="workspace" />
						</span>
						<div>
							<h3 className="font-heading text-base font-semibold">
								No additional workspaces yet
							</h3>
							<p className="mt-1 text-sm leading-6 text-muted">
								Create a workspace for a project or study group. Add
								collaborators whenever you need them.
							</p>
						</div>
					</div>
				)}
			</section>

			<dialog
				ref={createDialog}
				aria-labelledby="create-workspace-heading"
				aria-describedby="create-workspace-description"
				onClose={() => setWorkspaceName("")}
				className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
			>
				<form onSubmit={createWorkspace} className="space-y-5">
					<h2
						id="create-workspace-heading"
						className="font-heading text-2xl font-semibold"
					>
						Create a workspace
					</h2>
					<p
						id="create-workspace-description"
						className="text-sm leading-6 text-muted"
					>
						Your new workspace starts with just you. Add collaborators when you
						are ready.
					</p>
					<div>
						<label htmlFor="workspace-name" className="text-sm font-semibold">
							Workspace name
						</label>
						<input
							id="workspace-name"
							name="workspaceName"
							required
							maxLength={100}
							value={workspaceName}
							onChange={(event) => setWorkspaceName(event.target.value)}
							className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
						/>
					</div>
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={() => createDialog.current?.close()}
							className="min-h-11 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-subtle"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!workspaceName.trim()}
							className="min-h-11 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
						>
							Create workspace
						</button>
					</div>
				</form>
			</dialog>
		</div>
	);
}
