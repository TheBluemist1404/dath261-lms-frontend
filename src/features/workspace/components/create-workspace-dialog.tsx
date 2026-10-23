import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/http/errors";
import { useCreateWorkspace } from "../hooks/use-workspace-mutations";

export function CreateWorkspaceDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [name, setName] = useState("");
	const createWorkspace = useCreateWorkspace();

	function close() {
		setName("");
		createWorkspace.reset();
		onClose();
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		createWorkspace.mutate({ name: trimmed }, { onSuccess: close });
	}

	return (
		<Dialog
			open={open}
			onClose={close}
			title="Create a workspace"
			description="Your new workspace starts with just you. Add collaborators when you are ready."
		>
			<form onSubmit={submit} className="space-y-5">
				<div>
					<label htmlFor="workspace-name" className="text-sm font-semibold">
						Workspace name
					</label>
					<input
						id="workspace-name"
						name="workspaceName"
						required
						maxLength={100}
						value={name}
						onChange={(event) => setName(event.target.value)}
						className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					/>
				</div>
				{createWorkspace.isError && (
					<p role="alert" className="text-sm text-error">
						{getApiErrorMessage(createWorkspace.error)}
					</p>
				)}
				<div className="flex justify-end gap-3">
					<Button variant="secondary" onClick={close}>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={!name.trim() || createWorkspace.isPending}
					>
						{createWorkspace.isPending ? "Creating…" : "Create workspace"}
					</Button>
				</div>
			</form>
		</Dialog>
	);
}
