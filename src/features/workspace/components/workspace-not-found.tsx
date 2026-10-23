import { Link } from "@tanstack/react-router";

export function WorkspaceNotFound() {
	return (
		<div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-white p-6">
			<h1 className="font-heading text-2xl font-bold">Workspace not found</h1>
			<p className="text-sm leading-6 text-muted">
				It may not exist, or you may not be a member of it.
			</p>
			<Link
				to="/workspace"
				className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
			>
				Go to workspaces
			</Link>
		</div>
	);
}
