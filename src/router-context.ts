import type { QueryClient } from "@tanstack/react-query";
import type { RouterAuthContext } from "@/features/auth/types";

export interface AppRouterContext {
	queryClient: QueryClient;
	auth?: RouterAuthContext;
}
