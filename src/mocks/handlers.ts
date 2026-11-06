import { catalogHandlers } from "@/features/courses/testing/handlers";
import { workspaceHandlers } from "@/features/workspace/testing/handlers";
import { authHandlers } from "./auth.handlers";

export const handlers = [
	...authHandlers,
	...catalogHandlers,
	...workspaceHandlers,
];
