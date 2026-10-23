import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { recentPagesQuery, workspaceListQuery } from "../api/workspace.queries";
import type { Workspace } from "../types";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { ErrorState, LoadingState } from "./query-state";
import { WorkspaceCard } from "./workspace-card";

const recentPageLimit = 3;

export function WorkspaceLandingPage() {
	const workspaces = useQuery(workspaceListQuery());
	const [creating, setCreating] = useState(false);

	const personal = workspaces.data?.find(
		(workspace) => workspace.type === "PERSONAL",
	);
	const additional =
		workspaces.data?.filter((workspace) => workspace.type !== "PERSONAL") ?? [];

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
				<SearchForm />
			</header>

			{workspaces.isPending ? (
				<LoadingState label="Loading workspaces…" />
			) : workspaces.isError ? (
				<ErrorState
					title="Workspaces could not be loaded"
					error={workspaces.error}
					onRetry={() => workspaces.refetch()}
				/>
			) : (
				<>
					{personal && <PersonalWorkspaceSection workspace={personal} />}

					<section aria-labelledby="additional-workspaces-heading">
						<div className="flex flex-row flex-wrap items-center justify-between gap-4">
							<h2
								id="additional-workspaces-heading"
								className="min-w-0 font-heading text-xl font-bold tracking-tight"
							>
								Additional workspaces
							</h2>
							<div className="flex items-center gap-2">
								<Link
									to="/workspace/archived"
									className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-primary hover:bg-primary-subtle"
								>
									Archived workspaces
								</Link>
								<Button onClick={() => setCreating(true)}>
									Create workspace
								</Button>
							</div>
						</div>
						{additional.length > 0 ? (
							<div className="mt-5 grid gap-6 sm:grid-cols-2">
								{additional.map((workspace) => (
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
				</>
			)}

			<CreateWorkspaceDialog
				open={creating}
				onClose={() => setCreating(false)}
			/>
		</div>
	);
}

function SearchForm() {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");

	return (
		<search>
			<form
				className="mt-6 flex max-w-xl gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					const q = query.trim();
					if (q) navigate({ to: "/workspace/search", search: { q } });
				}}
			>
				<label htmlFor="workspace-landing-search" className="sr-only">
					Search pages
				</label>
				<input
					id="workspace-landing-search"
					type="search"
					value={query}
					placeholder="Search your pages"
					onChange={(event) => setQuery(event.target.value)}
					className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
				/>
				<Button type="submit" variant="secondary">
					Search
				</Button>
			</form>
		</search>
	);
}

function PersonalWorkspaceSection({ workspace }: { workspace: Workspace }) {
	// No visit history exists yet, so "recently used" means recently updated,
	// across every active workspace the user belongs to.
	const recent = useQuery(recentPagesQuery(recentPageLimit));

	return (
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
						Your personal corner of Nodus. Organize study notes, collect ideas,
						and turn what you learn into knowledge you can return to.
					</p>
					<Link
						to="/workspace/$id"
						params={{ id: workspace.id }}
						className="mt-6 inline-flex min-h-11 items-center justify-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
					>
						Open my workspace
						<span aria-hidden="true">&rarr;</span>
					</Link>
				</div>
				<div className="p-6 sm:p-8">
					<h3 className="font-heading text-base font-bold">Recently used</h3>
					{recent.isPending ? (
						<LoadingState label="Loading recent pages…" />
					) : !recent.data?.length ? (
						<p className="mt-4 text-sm text-muted">
							{recent.isError
								? "Recent pages are unavailable right now."
								: "Pages you edit will appear here."}
						</p>
					) : (
						<ul className="mt-4 space-y-2">
							{recent.data.map((hit) => (
								<li key={hit.page.id}>
									<Link
										to="/workspace/$id/pages/$pageId"
										params={{ id: hit.workspace.id, pageId: hit.page.id }}
										className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-subtle hover:text-primary"
									>
										<span className="text-muted">
											<Icon name="book" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block">{hit.page.title}</span>
											<span className="block text-xs font-normal text-muted">
												{hit.workspace.name}
											</span>
										</span>
										<span aria-hidden="true">&rarr;</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
