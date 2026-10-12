import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	mockLecturer,
	mockStudent,
	resetMockAuth,
	setMockCurrentUser,
} from "../testing";
import {
	getCurrentUserApi,
	loginApi,
	logoutApi,
	normalizeCurrentUserResponse,
	registerApi,
} from "./auth.api";

describe("auth API and boundary normalization", () => {
	beforeEach(() => {
		resetMockAuth();
	});

	afterEach(() => {
		resetMockAuth();
	});

	describe("normalizeCurrentUserResponse", () => {
		it("normalizes a direct flat payload", () => {
			const raw = {
				id: "u-1",
				name: "Alex Learner",
				email: "alex@nodus.edu",
				role: "student",
			};

			const user = normalizeCurrentUserResponse(raw);

			expect(user).toEqual({
				id: "u-1",
				name: "Alex Learner",
				email: "alex@nodus.edu",
				role: "student",
			});
		});

		it("normalizes a nested user envelope", () => {
			const raw = {
				user: {
					id: "u-2",
					name: "Dr. Elena",
					email: "elena@nodus.edu",
					role: "LECTURER",
				},
			};

			const user = normalizeCurrentUserResponse(raw);

			expect(user).toEqual({
				id: "u-2",
				name: "Dr. Elena",
				email: "elena@nodus.edu",
				role: "lecturer",
			});
		});

		it("throws when identity fields are missing", () => {
			expect(() => normalizeCurrentUserResponse({ id: "1" })).toThrow(
				"Malformed identity: missing required identity fields",
			);
		});

		it("throws when role is invalid", () => {
			expect(() =>
				normalizeCurrentUserResponse({
					id: "1",
					name: "Guest",
					email: "g@nodus.edu",
					role: "superhero",
				}),
			).toThrow("Unauthorized role: 'superhero' is not a valid LMS role");
		});
	});

	describe("getCurrentUserApi", () => {
		it("returns null when session is unauthenticated (401)", async () => {
			setMockCurrentUser(null);

			const user = await getCurrentUserApi();

			expect(user).toBeNull();
		});

		it("returns normalized user when active session exists", async () => {
			setMockCurrentUser(mockStudent);

			const user = await getCurrentUserApi();

			expect(user).toEqual(mockStudent);
		});
	});

	describe("loginApi", () => {
		it("returns authenticated user on valid credentials", async () => {
			const result = await loginApi({
				email: "alex@nodus.edu",
				password: "valid-password",
			});

			expect(result.user).toMatchObject({
				email: "alex@nodus.edu",
				role: "student",
			});
		});

		it("throws error on invalid credentials", async () => {
			await expect(
				loginApi({
					email: "invalid@example.com",
					password: "wrong",
				}),
			).rejects.toThrow();
		});
	});

	describe("registerApi", () => {
		it("registers a new student successfully", async () => {
			const result = await registerApi({
				name: "New Student",
				email: "newstudent@nodus.edu",
				password: "secure-password",
				role: "student",
			});

			expect(result.user).toMatchObject({
				name: "New Student",
				email: "newstudent@nodus.edu",
				role: "student",
			});
		});

		it("registers a new lecturer successfully", async () => {
			const result = await registerApi({
				name: "Dr. New Lecturer",
				email: "newlecturer@nodus.edu",
				password: "secure-password",
				role: "lecturer",
			});

			expect(result.user).toMatchObject({
				name: "Dr. New Lecturer",
				email: "newlecturer@nodus.edu",
				role: "lecturer",
			});
		});

		it("throws error when email is already taken", async () => {
			await expect(
				registerApi({
					name: "Existing User",
					email: "exists@example.com",
					password: "password123",
					role: "student",
				}),
			).rejects.toThrow();
		});
	});

	describe("logoutApi", () => {
		it("clears the session on logout", async () => {
			setMockCurrentUser(mockLecturer);
			expect(await getCurrentUserApi()).toEqual(mockLecturer);

			await logoutApi();

			expect(await getCurrentUserApi()).toBeNull();
		});
	});
});
