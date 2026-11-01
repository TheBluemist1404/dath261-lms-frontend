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
	});

	describe("registerApi", () => {
		it("partitions name and registers new student (201 Created)", async () => {
			const result = await registerApi({
				fullName: "Alex Learner",
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
				fullName: "Elena Rostova",
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

		it("rejects mononym before network call", async () => {
			await expect(
				registerApi({
					fullName: "Plato",
					email: "plato@nodus.edu",
					password: "securePassword123",
					role: "student",
				}),
			).rejects.toThrow(
				"Please enter your full name (both first and last name).",
			);
		});

		it("throws 409 when email already exists", async () => {
			await expect(
				registerApi({
					fullName: "Existing User",
					email: "exists@example.com",
					password: "securePassword123",
					role: "student",
				}),
			).rejects.toThrow();
		});

		it("throws 400 when password is under 8 characters", async () => {
			await expect(
				registerApi({
					fullName: "Short Password",
					email: "short@example.com",
					password: "short",
					role: "student",
				}),
			).rejects.toThrow();
		});
	});

	describe("refreshApi", () => {
		it("returns rotated accessToken", async () => {
			const result = await refreshApi();
			expect(result).toHaveProperty("accessToken");
			expect(typeof result.accessToken).toBe("string");
		});
	});

	describe("logoutApi", () => {
		it("successfully posts logout", async () => {
			await expect(logoutApi()).resolves.toBeUndefined();
		});
	});
});
