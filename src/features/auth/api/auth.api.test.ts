import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test/mocks/server";
import { authHandlers, resetMockAuth } from "../testing";
import { loginApi, logoutApi, refreshApi, registerApi } from "./auth.api";

describe("auth API client contracts", () => {
	beforeEach(() => {
		server.use(...authHandlers);
		resetMockAuth();
	});

	afterEach(() => {
		resetMockAuth();
	});

	describe("loginApi", () => {
		it("returns accessToken on valid credentials", async () => {
			const result = await loginApi({
				email: "alex@nodus.edu",
				password: "valid-password",
			});

			expect(result).toHaveProperty("accessToken");
			expect(typeof result.accessToken).toBe("string");
			expect(result.accessToken.split(".").length).toBe(3);
		});

		it("throws on invalid credentials (401)", async () => {
			await expect(
				loginApi({
					email: "invalid@example.com",
					password: "wrong-password",
				}),
			).rejects.toThrow();
		});

		it("throws on suspended account (403)", async () => {
			await expect(
				loginApi({
					email: "suspended@nodus.edu",
					password: "valid-password",
				}),
			).rejects.toThrow();
		});

		it("throws on missing credentials (400)", async () => {
			await expect(
				loginApi({
					email: "",
					password: "",
				}),
			).rejects.toThrow();
		});
	});

	describe("registerApi", () => {
		it("registers new student with distinct name fields (201 Created)", async () => {
			const result = await registerApi({
				firstName: "Alex",
				lastName: "Learner",
				email: "alex.learner@nodus.edu",
				password: "securePassword123",
				role: "student",
			});

			expect(result.user).toMatchObject({
				email: "alex.learner@nodus.edu",
				role: "STUDENT",
				status: "ACTIVE",
				firstName: "Alex",
				lastName: "Learner",
			});
		});

		it("registers new lecturer successfully", async () => {
			const result = await registerApi({
				firstName: "Elena",
				lastName: "Rostova",
				email: "elena@nodus.edu",
				password: "securePassword123",
				role: "lecturer",
			});

			expect(result.user).toMatchObject({
				email: "elena@nodus.edu",
				role: "LECTURER",
				firstName: "Elena",
				lastName: "Rostova",
			});
		});

		it("throws 409 when email already exists", async () => {
			await expect(
				registerApi({
					firstName: "Existing",
					lastName: "User",
					email: "exists@example.com",
					password: "securePassword123",
					role: "student",
				}),
			).rejects.toThrow();
		});

		it("throws 400 when password is under 8 characters", async () => {
			await expect(
				registerApi({
					firstName: "Short",
					lastName: "Password",
					email: "short@example.com",
					password: "short",
					role: "student",
				}),
			).rejects.toThrow();
		});
	});

	describe("refreshApi", () => {
		it("throws 401 Unauthorized when refresh cookie is omitted", async () => {
			await expect(refreshApi()).rejects.toThrow();
		});

		it("returns rotated accessToken when valid cookie is presented", async () => {
			const result = await refreshApi({
				headers: {
					Cookie: "refresh_token=mock-valid-refresh-token",
				},
			});

			expect(result).toHaveProperty("accessToken");
			expect(typeof result.accessToken).toBe("string");
			expect(result.accessToken.split(".").length).toBe(3);
		});
	});

	describe("logoutApi", () => {
		it("successfully posts logout", async () => {
			await expect(logoutApi()).resolves.toBeUndefined();
		});
	});
});
