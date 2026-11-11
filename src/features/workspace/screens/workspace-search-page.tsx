import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { minSearchLength, pageSearchQuery } from "../api/workspace.queries";
import type { PageHit } from "../types";

const searchDelayMs = 300;

export function pageHitLocation(hit: PageHit) {
	return [hit.workspace.name, ...hit.path].join(" / ");
}

/** Searches every workspace page the user can access; `q` lives in the URL. */
export function WorkspaceSearchPage({ query }: { query: string }) {
	const inputId = useId();
	const navigate = useNavigate();
	const [draft, setDraft] = useState(query);
	const trimmed = query.trim();
	const results = useQuery(pageSearchQuery(trimmed));

	useEffect(() => {
		const next = draft.trim();
		if (next === query) return;
		const timer = window.setTimeout(() => {
			navigate({
				to: "/workspace/search",
				search: next ? { q: next } : {},
				replace: true,
			});
		}, searchDelayMs);
		return () => window.clearTimeout(timer);
	}, [draft, query, navigate]);

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<header>
				<Link
					to="/workspace"
					className="text-sm font-semibold text-primary hover:underline"
				>
					&larr; All workspaces
				</Link>
				<h1 className="mt-3 font-heading text-3xl font-bold tracking-tight">
					Search your workspaces
				</h1>
				<p className="mt-3 text-sm text-muted">
					Search is limited to pages you can access. Archived workspaces are not
					included.
				</p>
			</header>

			<search>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						const next = draft.trim();
						navigate({
							to: "/workspace/search",
							search: next ? { q: next } : {},
							replace: true,
						});
					}}
				>
					<label htmlFor={inputId} className="text-sm font-semibold">
						Search pages
					</label>
					<input
						id={inputId}
						type="search"
						value={draft}
						autoComplete="off"
						placeholder="Page title or note text"
						onChange={(event) => setDraft(event.target.value)}
						className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					/>
				</form>
			</search>

			{trimmed.length < minSearchLength ? (
				<p className="text-sm text-muted">
					{`Type at least ${minSearchLength} characters to search page titles and notes.`}
				</p>
			) : results.isPending ? (
				<output className="block text-sm text-muted">
					Searching for “{trimmed}”…
				</output>
			) : results.isError ? (
				<div
					role="alert"
					className="space-y-3 rounded-xl border border-border bg-white p-6"
				>
					<h2 className="font-heading text-xl font-semibold">
						Search could not be completed.
					</h2>
					<p className="text-sm text-muted">
						Try again after checking your connection.
					</p>
					<Button onClick={() => results.refetch()}>Retry</Button>
				</div>
			) : results.data.length === 0 ? (
				<div className="space-y-2 rounded-xl border border-border bg-white p-6">
					<h2 className="font-heading text-xl font-semibold">
						No matching pages.
					</h2>
					<p className="text-sm text-muted">
						Try another term. Results never include workspace content you cannot
						access.
					</p>
				</div>
			) : (
				<section
					aria-labelledby="search-results-heading"
					className="rounded-xl border border-border bg-white p-6"
				>
					<h2
						id="search-results-heading"
						className="font-heading text-xl font-semibold"
					>
						{results.data.length}{" "}
						{results.data.length === 1 ? "result" : "results"}
					</h2>
					<ul className="mt-3 divide-y divide-border">
						{results.data.map((hit) => (
							<li key={hit.page.id}>
								<PageHitLink hit={hit} />
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}

export function PageHitLink({ hit }: { hit: PageHit }) {
	return (
		<Link
			to="/workspace/$id/pages/$pageId"
			params={{ id: hit.workspace.id, pageId: hit.page.id }}
			className="flex min-h-11 items-start gap-3 rounded-lg px-2 py-3 hover:bg-subtle"
		>
			<span className="mt-0.5 text-muted">
				<Icon name="file" />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block font-semibold [overflow-wrap:anywhere]">
					{hit.page.title}
				</span>
				<span className="block text-sm text-muted [overflow-wrap:anywhere]">
					{pageHitLocation(hit)}
				</span>
				{hit.snippet && (
					<span className="mt-1 block text-sm [overflow-wrap:anywhere]">
						{hit.snippet}
					</span>
				)}
			</span>
			<span aria-hidden="true" className="mt-0.5 text-muted">
				&rarr;
			</span>
		</Link>
	);
}
