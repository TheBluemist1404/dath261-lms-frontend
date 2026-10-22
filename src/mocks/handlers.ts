import { workspaceHandlers } from "@/features/workspace/testing/handlers";
import { authHandlers } from "./auth.handlers";

export const handlers = [...authHandlers, ...workspaceHandlers];
