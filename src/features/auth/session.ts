import { bootstrapSessionSafe } from "@/lib/auth/session-barrier";
import type { RouterAuthContext } from "./types";

export function bootstrapSession(): Promise<RouterAuthContext> {
	return bootstrapSessionSafe();
}
