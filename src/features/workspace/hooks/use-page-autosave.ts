import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { updatePage } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace.queries";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "failed";

const defaultDelayMs = 800;

/**
 * Debounced content saving for one page. The editor keeps its own state; this
 * hook only sends the latest document and reports status for the save banner.
 * Pending edits are flushed when the page changes or unmounts.
 */
export function usePageAutosave(pageId: string, delayMs = defaultDelayMs) {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<SaveStatus>("idle");
	const latest = useRef<{ content: unknown } | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const save = useMutation({
		mutationFn: (content: unknown) => updatePage(pageId, { content }),
		onSuccess: (page, content) => {
			queryClient.setQueryData(workspaceKeys.page(page.id), page);
			// Only clear the queue if nothing newer arrived during the request.
			if (latest.current?.content === content) {
				latest.current = null;
				setStatus("saved");
			}
		},
		onError: () => setStatus("failed"),
	});
	const { mutate } = save;

	const flush = useCallback(() => {
		clearTimeout(timer.current);
		if (!latest.current) return;
		setStatus("saving");
		mutate(latest.current.content);
	}, [mutate]);

	const queue = useCallback(
		(content: unknown) => {
			latest.current = { content };
			setStatus("pending");
			clearTimeout(timer.current);
			timer.current = setTimeout(flush, delayMs);
		},
		[flush, delayMs],
	);

	useEffect(() => flush, [flush]);

	return { status, queue, retry: flush, error: save.error };
}
