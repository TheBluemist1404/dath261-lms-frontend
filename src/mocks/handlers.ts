import { adminHandlers } from "@/features/admin/testing/handlers";
import { catalogHandlers } from "@/features/courses/testing/handlers";
import { workspaceHandlers } from "@/features/workspace/testing/handlers";
import { authHandlers } from "./auth.handlers";

export const handlers = [
	...authHandlers,
	...adminHandlers,
	...catalogHandlers,
	...workspaceHandlers,
];
