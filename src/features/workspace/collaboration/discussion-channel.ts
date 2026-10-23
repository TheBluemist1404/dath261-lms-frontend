import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { workspaceKeys } from "../api/workspace.queries";
import type { PageMessage } from "../types";

export interface DiscussionListeners {
	onMessage: (message: PageMessage) => void;
	/** The server ended access (member removed, page deleted). */
	onAccessEnded: () => void;
}

/** Subscribes to new messages on a page's discussion; returns the unsubscribe. */
export type DiscussionChannel = (
	pageId: string,
	listeners: DiscussionListeners,
) => () => void;

/** Without a server (mocks, tests) there is nothing to receive. */
const noDiscussionChannel: DiscussionChannel = () => () => {};

let channel: DiscussionChannel = noDiscussionChannel;

export function setDiscussionChannel(next: DiscussionChannel) {
	channel = next;
}

export function resetDiscussionChannel() {
	channel = noDiscussionChannel;
}

/** Appends a message unless it is already listed (own post vs. its broadcast). */
export function withMessage(
	messages: PageMessage[] = [],
	message: PageMessage,
) {
	return messages.some((entry) => entry.id === message.id)
		? messages
		: [...messages, message];
}

/** Keeps the page's message list current while the discussion is open. */
export function useLiveMessages(pageId: string, enabled: boolean) {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!enabled) return;
		const key = workspaceKeys.messages(pageId);
		return channel(pageId, {
			onMessage: (message) =>
				queryClient.setQueryData<PageMessage[]>(key, (current) =>
					withMessage(current, message),
				),
			// Refetching returns 404, which the discussion shows as access ended.
			onAccessEnded: () =>
				void queryClient.invalidateQueries({ queryKey: key }),
		});
	}, [pageId, enabled, queryClient]);
}
