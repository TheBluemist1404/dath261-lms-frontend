import { workspaceHandlers } from "@/features/workspace/testing/handlers";
import { authHandlers } from "./auth.handlers";
import { coursesHandlers } from "./courses.handlers";

export const handlers = [
	...authHandlers,
	...coursesHandlers,
	...workspaceHandlers,
];
