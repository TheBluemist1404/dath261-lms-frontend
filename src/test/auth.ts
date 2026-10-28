import { setAccessToken } from "@/lib/auth/access-token";
import { installAuthInterceptors } from "@/lib/http/auth-interceptors";
import { createMockAccessToken } from "@/mocks/auth.handlers";
import { useAuthStore } from "@/stores/auth.store";

type BackendRole = Parameters<typeof createMockAccessToken>[1];

/**
 * Signs a mock user in the way main.tsx does at runtime: an in-memory token sent
 * by the auth interceptors. Returns a cleanup for afterEach.
 */
export function signInForTest(userId: string, role: BackendRole = "STUDENT") {
	const uninstall = installAuthInterceptors();
	setAccessToken(createMockAccessToken(userId, role));
	useAuthStore.getState().setUser({
		id: userId,
		name: "",
		email: "",
		role:
			role === "LECTURER" ? "lecturer" : role === "ADMIN" ? "admin" : "student",
	});

	return () => {
		uninstall();
		setAccessToken(null);
		useAuthStore.getState().reset();
	};
}
