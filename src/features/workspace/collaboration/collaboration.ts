import { useEffect, useState, useSyncExternalStore } from "react";
import type { WorkspaceMember } from "../types";

// Boundary between the page UI and the real-time layer. The UI only reads this
// state; the Yjs provider adapter (Phase 6 backend) implements `connect` later.

export type ConnectionStatus =
	| "connecting"
	| "connected"
	| "reconnecting"
	| "disconnected"
	/** Membership ended mid-session; the server closed the document. */
	| "revoked";

export interface CollaborationState {
	status: ConnectionStatus;
	/** Other members currently on this page, by user id. */
	presentUserIds: string[];
}

export interface CollaborationConnection {
	getState(): CollaborationState;
	subscribe(listener: () => void): () => void;
	/** Asks for a fresh synchronization after a disconnect. */
	retry(): void;
	destroy(): void;
}

export interface ConnectOptions {
	pageId: string;
	userId: string;
	members: WorkspaceMember[];
}

export type CollaborationAdapter = (
	options: ConnectOptions,
) => CollaborationConnection;

/** A connection whose state is driven by hand, for the mock adapter and tests. */
export interface ControllableConnection extends CollaborationConnection {
	set(state: Partial<CollaborationState>): void;
}

export function createControllableConnection(
	initial: CollaborationState,
	onRetry?: (connection: ControllableConnection) => void,
): ControllableConnection {
	let state = initial;
	const listeners = new Set<() => void>();
	const connection: ControllableConnection = {
		getState: () => state,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		set(next) {
			state = { ...state, ...next };
			for (const listener of listeners) listener();
		},
		retry() {
			onRetry?.(connection);
		},
		destroy() {
			listeners.clear();
		},
	};
	return connection;
}

const simulatedStatuses = new Set<ConnectionStatus>([
	"reconnecting",
	"disconnected",
	"revoked",
]);

/**
 * Stand-in until the collaboration server exists: every other member is shown
 * as present. In development, `?collab=reconnecting|disconnected|revoked` on the
 * page URL starts in that state so each banner can be reviewed.
 */
export const mockCollaborationAdapter: CollaborationAdapter = ({
	userId,
	members,
}) => {
	const requested = import.meta.env.DEV
		? new URLSearchParams(window.location.search).get("collab")
		: null;
	const status =
		requested && simulatedStatuses.has(requested as ConnectionStatus)
			? (requested as ConnectionStatus)
			: "connected";
	const others = members
		.map((member) => member.userId)
		.filter((id) => id !== userId);

	return createControllableConnection(
		{ status, presentUserIds: status === "connected" ? others : [] },
		(connection) => {
			connection.set({ status: "reconnecting" });
			window.setTimeout(
				() => connection.set({ status: "connected", presentUserIds: others }),
				800,
			);
		},
	);
};

let adapter: CollaborationAdapter = mockCollaborationAdapter;

/** Swaps the real-time adapter, e.g. for the Yjs provider or in tests. */
export function setCollaborationAdapter(next: CollaborationAdapter) {
	adapter = next;
}

export function resetCollaborationAdapter() {
	adapter = mockCollaborationAdapter;
}

const offline: CollaborationState = {
	status: "connecting",
	presentUserIds: [],
};
const noopConnection = createControllableConnection(offline);

/**
 * Connects to the page's shared document while `options` is non-null; pass null
 * for pages that are not collaborative.
 */
export function useCollaboration(options: ConnectOptions | null) {
	const [connection, setConnection] = useState<CollaborationConnection | null>(
		null,
	);
	const pageId = options?.pageId;
	const userId = options?.userId;
	const members = options?.members;

	useEffect(() => {
		if (!pageId || !userId || !members) return;
		const next = adapter({ pageId, userId, members });
		setConnection(next);
		return () => {
			next.destroy();
			setConnection(null);
		};
	}, [pageId, userId, members]);

	const active = connection ?? noopConnection;
	const state = useSyncExternalStore(active.subscribe, active.getState);
	return { ...state, retry: () => active.retry() };
}
