import axios from "axios";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/mocks/server";
import { createMockAdapter } from "./axios-adapter";

const client = axios.create({
	baseURL: "/api",
	adapter: createMockAdapter([
		http.get("*/api/items", ({ request }) =>
			HttpResponse.json({
				query: new URL(request.url).searchParams.get("q"),
				auth: request.headers.get("Authorization"),
			}),
		),
		http.post("*/api/items", async ({ request }) =>
			HttpResponse.json(await request.json(), { status: 201 }),
		),
		http.delete("*/api/items/:id", () =>
			HttpResponse.json({ statusCode: 403, message: "Nope" }, { status: 403 }),
		),
	]),
});

describe("createMockAdapter", () => {
	it("resolves handled requests in the page with params, headers and body", async () => {
		const read = await client.get("/items", {
			params: { q: "os" },
			headers: { Authorization: "Bearer t" },
		});
		expect(read.data).toEqual({ query: "os", auth: "Bearer t" });

		const created = await client.post("/items", { title: "Notes" });
		expect(created.status).toBe(201);
		expect(created.data).toEqual({ title: "Notes" });
	});

	it("rejects error statuses like the real adapter", async () => {
		await expect(client.delete("/items/1")).rejects.toMatchObject({
			response: { status: 403, data: { message: "Nope" } },
		});
	});

	it("falls back to the network for unhandled requests", async () => {
		server.use(
			http.get("*/api/other", () => HttpResponse.json({ from: "network" })),
		);
		expect((await client.get("/other")).data).toEqual({ from: "network" });
	});
});
