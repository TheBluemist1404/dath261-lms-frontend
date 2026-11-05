import type { RequestHandler } from "msw";
import { authHandlers } from "@/mocks/auth.handlers";
import { coursesHandlers } from "@/mocks/courses.handlers";

export const handlers: RequestHandler[] = [...authHandlers, ...coursesHandlers];
