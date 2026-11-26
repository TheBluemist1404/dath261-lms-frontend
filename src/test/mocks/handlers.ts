import type { RequestHandler } from "msw";
import { authHandlers } from "@/mocks/auth.handlers";
import { coursesHandlers } from "@/mocks/courses.handlers";
import { enrollmentsHandlers } from "@/mocks/enrollments.handlers";
import { notificationsHandlers } from "@/mocks/notifications.handlers";
import { quizzesHandlers } from "@/mocks/quizzes.handlers";

export const handlers: RequestHandler[] = [
	...authHandlers,
	...coursesHandlers,
	...enrollmentsHandlers,
	...notificationsHandlers,
	...quizzesHandlers,
];
