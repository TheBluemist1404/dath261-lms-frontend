import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "@/test/mocks/server";

if (typeof window !== "undefined") {
	window.scrollTo = () => {};
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
	cleanup();
	server.resetHandlers();
});

afterAll(() => server.close());
