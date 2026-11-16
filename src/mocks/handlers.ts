import { adminHandlers } from "@/features/admin/testing/handlers";
import { workspaceHandlers } from "@/features/workspace/testing/handlers";
import { authHandlers } from "./auth.handlers";
import { coursesHandlers } from "./courses.handlers";
import { enrollmentsHandlers } from "./enrollments.handlers";
import { quizzesHandlers } from "./quizzes.handlers";

export const handlers = [
	...authHandlers,
	...adminHandlers,
	...coursesHandlers,
	...enrollmentsHandlers,
	...quizzesHandlers,
	...workspaceHandlers,
];
