import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import type { WorkspaceMember } from "../types";
import { DOCUMENT_FRAGMENT, seedSharedDocument } from "./shared-document";

// Boundary between the page UI and the real-time layer. The UI reads this state
// and binds the editor to `shared`; adapters own the transport.

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
	/** The server only allows reading, e.g. in an archived workspace. */
	readOnly: boolean;
	/** Local edits the server has not confirmed yet. */
	unsyncedChanges: number;
}

/** Shown to other members next to this user's cursor and in presence. */
export interface CollaborationUser {
	id: string;
	name: string;
	color: string;
}

/** What the editor binds to: the shared document and its presence channel. */
export interface SharedDocument {
	fragment: Y.XmlFragment;
	awareness: Awareness;
	user: CollaborationUser;
}

export interface CollaborationConnection {
	getState(): CollaborationState;
	subscribe(listener: () => void): () => void;
	/** Asks for a fresh synchronization after a disconnect. */
	retry(): void;
	destroy(): void;
	/** Absent for connections that only drive the status UI (tests). */
	shared?: SharedDocument;
}

export interface ConnectOptions {
	pageId: string;
	userId: string;
	members: WorkspaceMember[];
	/** Stored page content, for adapters without a server to seed from. */
	initialContent?: unknown;
}

export type CollaborationAdapter = (
	options: ConnectOptions,
) => CollaborationConnection;

/** A connection whose state is driven by hand, for the mock adapter and tests. */
export interface ControllableConnection extends CollaborationConnection {
	set(state: Partial<CollaborationState>): void;
}

export function createControllableConnection(
	initial: Pick<CollaborationState, "status" | "presentUserIds"> &
		Partial<CollaborationState>,
	onRetry?: (connection: ControllableConnection) => void,
	shared?: SharedDocument,
): ControllableConnection {
	let state: CollaborationState = {
		readOnly: false,
		unsyncedChanges: 0,
		...initial,
	};
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
		shared,
	};
	return connection;
}

const cursorColors = [
	"#0f766e",
	"#7c3aed",
	"#c2410c",
	"#1d4ed8",
	"#be185d",
	"#4d7c0f",
];

/** Stable per-user cursor color. */
export function collaboratorColor(userId: string) {
	let hash = 0;
	for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return cursorColors[hash % cursorColors.length];
}

export function collaborationUser(
	userId: string,
	members: WorkspaceMember[],
): CollaborationUser {
	const member = members.find((entry) => entry.userId === userId);
	const name = member
		? `${member.user.firstName} ${member.user.lastName}`.trim() ||
			member.user.email
		: "Workspace member";
	return { id: userId, name, color: collaboratorColor(userId) };
}

function plainText(content: unknown) {
	const candidate = content as { type?: unknown; text?: unknown } | null;
	return candidate?.type === "plain-text" && typeof candidate.text === "string"
		? candidate.text
		: "";
}

const simulatedStatuses = new Set<ConnectionStatus>([
	"reconnecting",
	"disconnected",
	"revoked",
]);

/**
 * Offline stand-in for development mocks and tests: a local document seeded from
 * the page content, with every other member shown as present. In development,
 * `?collab=reconnecting|disconnected|revoked` on the page URL starts in that
 * state so each banner can be reviewed.
 */
export const mockCollaborationAdapter: CollaborationAdapter = ({
	userId,
	members,
	initialContent,
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

	const doc = seedSharedDocument(plainText(initialContent));
	const shared: SharedDocument = {
		fragment: doc.getXmlFragment(DOCUMENT_FRAGMENT),
		awareness: new Awareness(doc),
		user: collaborationUser(userId, members),
	};

	const connection = createControllableConnection(
		{ status, presentUserIds: status === "connected" ? others : [] },
		(connection) => {
			connection.set({ status: "reconnecting" });
			window.setTimeout(
				() => connection.set({ status: "connected", presentUserIds: others }),
				800,
			);
		},
		shared,
	);
	const destroy = connection.destroy;
	connection.destroy = () => {
		destroy();
		shared.awareness.destroy();
		doc.destroy();
	};
	return connection;
};

let defaultAdapter: CollaborationAdapter = mockCollaborationAdapter;
let adapter: CollaborationAdapter = mockCollaborationAdapter;

/** Picks the adapter used unless a test overrides it; set once at startup. */
export function setDefaultCollaborationAdapter(next: CollaborationAdapter) {
	defaultAdapter = next;
	adapter = next;
}

/** Swaps the real-time adapter, e.g. in tests. */
export function setCollaborationAdapter(next: CollaborationAdapter) {
	adapter = next;
}

export function resetCollaborationAdapter() {
	adapter = defaultAdapter;
}

const offline: CollaborationState = {
	status: "connecting",
	presentUserIds: [],
	readOnly: false,
	unsyncedChanges: 0,
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
	// Membership changes must not reconnect the page, so it is read through a ref.
	const members = useRef(options?.members);
	members.current = options?.members;
	const ready = Boolean(options?.members);
	// Only the first value matters: the server seeds from storage after that.
	const [initialContent] = useState(() => options?.initialContent);

	useEffect(() => {
		const current = members.current;
		if (!pageId || !userId || !ready || !current) return;
		const next = adapter({ pageId, userId, members: current, initialContent });
		setConnection(next);
		return () => {
			next.destroy();
			setConnection(null);
		};
	}, [pageId, userId, ready, initialContent]);

	const active = connection ?? noopConnection;
	const state = useSyncExternalStore(active.subscribe, active.getState);
	return { ...state, shared: active.shared, retry: () => active.retry() };
}
