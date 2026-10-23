import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "@/test/mocks/server";

// Route tests render the whole app; its first render can pass the 1s default
// when test files run in parallel.
configure({ asyncUtilTimeout: 3000 });

// jsdom does not implement the native dialog methods.
if (!HTMLDialogElement.prototype.showModal) {
	HTMLDialogElement.prototype.showModal = function showModal() {
		this.setAttribute("open", "");
	};
}
if (!HTMLDialogElement.prototype.close) {
	HTMLDialogElement.prototype.close = function close() {
		if (!this.hasAttribute("open")) return;
		this.removeAttribute("open");
		this.dispatchEvent(new Event("close"));
	};
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
	cleanup();
	server.resetHandlers();
});

afterAll(() => server.close());
