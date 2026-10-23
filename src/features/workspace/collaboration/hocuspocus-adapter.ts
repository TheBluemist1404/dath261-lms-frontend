import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { getAccessToken } from "@/lib/auth/access-token";
import { refreshAccessToken } from "@/lib/auth/session";
import {
	type CollaborationAdapter,
	type CollaborationState,
	type CollaborationUser,
	collaborationUser,
	type SharedDocument,
} from "./collaboration";
import { DOCUMENT_FRAGMENT } from "./shared-document";

/** How long a dropped connection counts as "reconnecting" before it is "disconnected". */
const reconnectGraceMs = 10_000;

/** Reasons the server ends access to a page; see the backend CollaborationService. */
const accessEndedReasons = new Set([
	"not-found",
	"not-collaborative",
	"access-revoked",
	"page-deleted",
]);

/** `/api` → `ws(s)://<host>/api/collab`, unless VITE_COLLAB_URL says otherwise. */
export function collaborationUrl() {
	const configured = import.meta.env.VITE_COLLAB_URL;
	if (configured) return configured;
	const base = new URL(
		import.meta.env.VITE_API_BASE_URL ?? "/api",
		window.location.href,
	);
	base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
	return `${base.href.replace(/\/$/, "")}/collab`;
}

interface AwarenessUserState {
	user?: Partial<CollaborationUser>;
}

/**
 * Connects a page to the backend's Yjs WebSocket server (Hocuspocus). The page
 * id is the document name and the REST access token authenticates the socket;
 * an expired token is refreshed once before giving up.
 */
export const hocuspocusAdapter: CollaborationAdapter = ({
	pageId,
	userId,
	members,
}) => {
	const doc = new Y.Doc();
	const listeners = new Set<() => void>();
	let state: CollaborationState = {
		status: "connecting",
		presentUserIds: [],
		readOnly: false,
		unsyncedChanges: 0,
	};
	let ended = false;
	let refreshedToken = false;
	let graceTimer: ReturnType<typeof setTimeout> | undefined;

	const set = (next: Partial<CollaborationState>) => {
		if (ended) return;
		state = { ...state, ...next };
		for (const listener of listeners) listener();
	};

	const provider = new HocuspocusProvider({
		url: collaborationUrl(),
		name: pageId,
		document: doc,
		token: () => getAccessToken() ?? "",
	});
	const awareness = provider.awareness;
	if (!awareness) throw new Error("Collaboration needs awareness");

	const user = collaborationUser(userId, members);
	awareness.setLocalStateField("user", user);

	// connect() is ignored while the old socket is still closing, so wait for it.
	const reconnect = () => {
		if (provider.configuration.websocketProvider.status === "disconnected") {
			void provider.connect();
			return;
		}
		const again = () => {
			provider.off("disconnect", again);
			void provider.connect();
		};
		provider.on("disconnect", again);
		provider.disconnect();
	};
	// Stop talking to the server but keep the document until the editor unmounts.
	const endAccess = () => {
		set({ status: "revoked", presentUserIds: [] });
		stopProvider();
	};
	// Every failed retry reports "disconnected" again; the grace period starts
	// at the first one and is not extended by the rest.
	const lostConnection = () => {
		if (state.status === "revoked" || state.status === "disconnected") return;
		// A first connection that fails stays "connecting" until the grace ends.
		if (state.status === "connected") set({ status: "reconnecting" });
		if (graceTimer !== undefined) return;
		graceTimer = setTimeout(() => {
			graceTimer = undefined;
			if (state.status === "reconnecting" || state.status === "connecting") {
				set({ status: "disconnected" });
			}
		}, reconnectGraceMs);
	};
	const clearGrace = () => {
		clearTimeout(graceTimer);
		graceTimer = undefined;
	};

	provider.on("authenticated", ({ scope }: { scope: string }) => {
		set({ readOnly: scope === "readonly" });
	});
	provider.on("synced", ({ state: synced }: { state: boolean }) => {
		if (!synced) return;
		clearGrace();
		refreshedToken = false;
		set({ status: "connected" });
	});
	provider.on("status", ({ status }: { status: string }) => {
		if (status === "disconnected") lostConnection();
	});
	provider.on(
		"authenticationFailed",
		async ({ reason }: { reason: string }) => {
			if (accessEndedReasons.has(reason)) return endAccess();
			if (reason === "token-invalid" && !refreshedToken) {
				refreshedToken = true;
				if (await refreshAccessToken()) return reconnect();
			}
			set({ status: "disconnected" });
		},
	);
	provider.on("close", ({ event }: { event: { reason?: string } }) => {
		const reason = event.reason ?? "";
		if (accessEndedReasons.has(reason)) return endAccess();
		// Archive or restore: reconnect to pick up the new read/write scope.
		if (reason === "workspace-changed") {
			set({ status: "reconnecting" });
			reconnect();
		}
	});
	provider.on("unsyncedChanges", ({ number }: { number: number }) => {
		set({ unsyncedChanges: number });
	});
	const updatePresence = () => {
		const ids = new Set<string>();
		for (const [clientId, value] of awareness.getStates()) {
			const id = (value as AwarenessUserState).user?.id;
			if (clientId !== doc.clientID && id && id !== userId) ids.add(id);
		}
		const presentUserIds = [...ids].sort();
		if (presentUserIds.join() !== state.presentUserIds.join()) {
			set({ presentUserIds });
		}
	};
	awareness.on("change", updatePresence);

	let providerStopped = false;
	function stopProvider() {
		if (providerStopped) return;
		providerStopped = true;
		ended = true;
		clearGrace();
		awareness?.off("change", updatePresence);
		provider.destroy();
	}

	const shared: SharedDocument = {
		fragment: doc.getXmlFragment(DOCUMENT_FRAGMENT),
		awareness,
		user,
	};

	return {
		getState: () => state,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		retry() {
			set({ status: "reconnecting" });
			refreshedToken = false;
			reconnect();
		},
		destroy() {
			listeners.clear();
			stopProvider();
			doc.destroy();
		},
		shared,
	};
};
