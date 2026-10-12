import type { RequestHandler } from "msw";
import { authHandlers } from "@/features/auth/testing/handlers";

export const handlers: RequestHandler[] = [...authHandlers];
