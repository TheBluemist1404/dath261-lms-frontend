import { create } from "zustand";

export type UserRole = "student" | "lecturer" | "admin";

// Frontend identity shape; map the agreed current-user API response into this type.
export interface AuthUser {
	id: string;
	name: string;
	email: string;
	role: UserRole;
}

export type AuthState =
	| { status: "loading"; user: null }
	| { status: "unauthenticated"; user: null }
	| { status: "authenticated"; user: AuthUser };

export interface AuthActions {
	setUser: (user: AuthUser | null) => void;
	/** Clears frontend state; terminating the server session is the caller's job. */
	clearAuth: () => void;
	/** Returns to the unresolved state before checking the current session. */
	reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

// Keep session credentials in secure cookies, outside this in-memory UI store.
export const useAuthStore = create<AuthStore>()((set) => ({
	status: "loading",
	user: null,
	setUser: (user) =>
		set(
			user
				? { status: "authenticated", user }
				: { status: "unauthenticated", user: null },
		),
	clearAuth: () => set({ status: "unauthenticated", user: null }),
	reset: () => set({ status: "loading", user: null }),
}));
