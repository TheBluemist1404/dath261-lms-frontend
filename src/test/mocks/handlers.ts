import type { RequestHandler } from "msw";
import { authHandlers } from "@/mocks/auth.handlers";

export const handlers: RequestHandler[] = [...authHandlers];
