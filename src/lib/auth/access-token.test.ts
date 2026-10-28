import { describe, expect, it } from "vitest";
import { createMockAccessToken } from "@/mocks/auth.handlers";
import { readAccessTokenClaims } from "./access-token";

describe("readAccessTokenClaims", () => {
	it("maps the backend sub and uppercase role claims", () => {
		expect(
			readAccessTokenClaims(createMockAccessToken("user-1", "LECTURER")),
		).toEqual({ userId: "user-1", role: "lecturer" });
	});

	it("rejects tokens without a known role or a readable payload", () => {
		const unknownRole = createMockAccessToken("user-1").replace(
			/\.[^.]+\./,
			`.${btoa(JSON.stringify({ sub: "user-1", role: "OWNER" }))}.`,
		);
		expect(readAccessTokenClaims(unknownRole)).toBeNull();
		expect(readAccessTokenClaims("not-a-token")).toBeNull();
		expect(readAccessTokenClaims("a.%%%.c")).toBeNull();
	});
});
