import axios from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LoginDto, RegisterDto } from "@/features/auth/types";
import { readAccessTokenClaims } from "@/lib/auth/access-token";
import { server } from "@/test/mocks/server";
import {
	authHandlers,
	mockLecturer,
	mockStudent,
	resetMockAuth,
	setMockCurrentUser,
} from "./auth.handlers";

const testClient = axios.create({
	baseURL: "/api",
	validateStatus: () => true,
});

describe("MSW Auth Handlers & Network Contracts", () => {
	beforeEach(() => {
		server.use(...authHandlers);
		resetMockAuth();
	});

	afterEach(() => {
		resetMockAuth();
	});

	describe("1. POST /api/auth/register", () => {
		it("returns 201 Created with RegisterResponseDto shape", async () => {
			const validPayload: RegisterDto = {
				email: "new.student@nodus.edu",
				password: "password123",
				role: "STUDENT",
				firstName: "Minh",
				lastName: "Tran",
			};

			const response = await testClient.post("/auth/register", validPayload);

			expect(response.status).toBe(201);
			expect(response.data).toHaveProperty("user");
			expect(response.data.user).toMatchObject({
				email: "new.student@nodus.edu",
				role: "STUDENT",
				status: "ACTIVE",
				firstName: "Minh",
				lastName: "Tran",
			});
			expect(typeof response.data.user.id).toBe("string");
			expect(typeof response.data.user.createdAt).toBe("string");
			expect(typeof response.data.user.updatedAt).toBe("string");

			expect(response.data).not.toHaveProperty("accessToken");
			expect(response.data).not.toHaveProperty("token");

			const setCookie = response.headers["set-cookie"];
			expect(setCookie).toBeUndefined();
		});

		it("returns 201 Created for LECTURER role", async () => {
			const lecturerPayload: RegisterDto = {
				email: "new.lecturer@nodus.edu",
				password: "password123",
				role: "LECTURER",
				firstName: "Huong",
				lastName: "Le",
			};

			const response = await testClient.post("/auth/register", lecturerPayload);

			expect(response.status).toBe(201);
			expect(response.data.user.role).toBe("LECTURER");
		});

		it("returns 409 Conflict when email already exists", async () => {
			const duplicatePayload: RegisterDto = {
				email: "exists@example.com",
				password: "password123",
				role: "STUDENT",
				firstName: "Existing",
				lastName: "User",
			};

			const response = await testClient.post(
				"/auth/register",
				duplicatePayload,
			);

			expect(response.status).toBe(409);
			expect(response.data.message).toBe(
				"An account with this email already exists.",
			);
		});

		it("returns 400 Bad Request when required fields are missing", async () => {
			const incomplete = {
				email: "test@example.com",
				password: "password123",
			};

			const response = await testClient.post("/auth/register", incomplete);

			expect(response.status).toBe(400);
			expect(response.data.message).toBe("Invalid request body.");
		});

		it("returns 400 Bad Request when empty lastName (mononym backend call)", async () => {
			const mononymPayload = {
				email: "plato@nodus.edu",
				password: "password123",
				role: "STUDENT",
				firstName: "Plato",
				lastName: "",
			};

			const response = await testClient.post("/auth/register", mononymPayload);

			expect(response.status).toBe(400);
			expect(response.data.message).toBe("Invalid request body.");
		});

		it("returns 400 Bad Request when password is under 8 characters", async () => {
			const shortPassword: RegisterDto = {
				email: "short@example.com",
				password: "1234567",
				role: "STUDENT",
				firstName: "Short",
				lastName: "Pass",
			};

			const response = await testClient.post("/auth/register", shortPassword);

			expect(response.status).toBe(400);
			expect(response.data.message).toBe(
				"Password must be between 8 and 72 characters.",
			);
		});

		it("returns 400 Bad Request when password exceeds 72 characters", async () => {
			const longPassword: RegisterDto = {
				email: "long@example.com",
				password: "a".repeat(73),
				role: "STUDENT",
				firstName: "Long",
				lastName: "Pass",
			};

			const response = await testClient.post("/auth/register", longPassword);

			expect(response.status).toBe(400);
			expect(response.data.message).toBe(
				"Password must be between 8 and 72 characters.",
			);
		});

		it("returns 400 Bad Request when role is ADMIN or invalid lowercase", async () => {
			const adminPayload = {
				email: "admin.attempt@example.com",
				password: "password123",
				role: "ADMIN",
				firstName: "Hacker",
				lastName: "Admin",
			};

			const res1 = await testClient.post("/auth/register", adminPayload);
			expect(res1.status).toBe(400);
			expect(res1.data.message).toBe("Role must be STUDENT or LECTURER.");

			const lowercasePayload = {
				email: "student.attempt@example.com",
				password: "password123",
				role: "student",
				firstName: "Lower",
				lastName: "Case",
			};

			const res2 = await testClient.post("/auth/register", lowercasePayload);
			expect(res2.status).toBe(400);
			expect(res2.data.message).toBe("Role must be STUDENT or LECTURER.");
		});
	});

	describe("2. POST /api/auth/login", () => {
		it("returns 200 OK with { accessToken } and sets HttpOnly cookie with Path=/api/auth", async () => {
			const credentials: LoginDto = {
				email: "alex@nodus.edu",
				password: "valid-password",
			};

			const response = await testClient.post("/auth/login", credentials);

			expect(response.status).toBe(200);
			expect(response.data).toHaveProperty("accessToken");
			expect(typeof response.data.accessToken).toBe("string");

			expect(response.data).not.toHaveProperty("user");

			const claims = readAccessTokenClaims(response.data.accessToken);
			expect(claims).not.toBeNull();
			expect(claims?.userId).toBe(mockStudent.id);
			expect(claims?.role).toBe("student");

			const setCookie = response.headers["set-cookie"];
			expect(setCookie).toBeDefined();
			const cookieStr = Array.isArray(setCookie)
				? setCookie.join("; ")
				: String(setCookie);
			expect(cookieStr).toContain("refresh_token=mock-valid-refresh-token");
			expect(cookieStr).toContain("Path=/api/auth");
			expect(cookieStr).toContain("HttpOnly");
			expect(cookieStr).toContain("SameSite=Lax");
		});

		it("encodes LECTURER role properly when active mock user is lecturer", async () => {
			setMockCurrentUser(mockLecturer);

			const credentials: LoginDto = {
				email: "elena@nodus.edu",
				password: "valid-password",
			};

			const response = await testClient.post("/auth/login", credentials);

			expect(response.status).toBe(200);
			const claims = readAccessTokenClaims(response.data.accessToken);
			expect(claims?.role).toBe("lecturer");
		});

		it("returns 401 Unauthorized for invalid email or wrong password", async () => {
			const res1 = await testClient.post("/auth/login", {
				email: "invalid@example.com",
				password: "valid-password",
			});

			expect(res1.status).toBe(401);
			expect(res1.data.message).toBe("Invalid email or password");

			const res2 = await testClient.post("/auth/login", {
				email: "alex@nodus.edu",
				password: "wrong-password",
			});

			expect(res2.status).toBe(401);
			expect(res2.data.message).toBe("Invalid email or password");
		});

		it("returns 403 Forbidden for suspended account", async () => {
			const response = await testClient.post("/auth/login", {
				email: "suspended@nodus.edu",
				password: "password123",
			});

			expect(response.status).toBe(403);
			expect(response.data.message).toBe("The account is suspended.");
		});

		it("returns 400 Bad Request on empty or missing credentials payload", async () => {
			const resEmpty = await testClient.post("/auth/login", {});
			expect(resEmpty.status).toBe(400);
			expect(resEmpty.data.message).toBe("Invalid request body.");

			const resMissingPass = await testClient.post("/auth/login", {
				email: "alex@nodus.edu",
			});
			expect(resMissingPass.status).toBe(400);
			expect(resMissingPass.data.message).toBe("Invalid request body.");

			const resMissingEmail = await testClient.post("/auth/login", {
				password: "valid-password",
			});
			expect(resMissingEmail.status).toBe(400);
			expect(resMissingEmail.data.message).toBe("Invalid request body.");
		});
	});

	describe("3. POST /api/auth/refresh", () => {
		it("rotates refresh token and returns { accessToken } when valid cookie is presented", async () => {
			const response = await testClient.post("/auth/refresh", null, {
				headers: {
					Cookie: "refresh_token=mock-valid-refresh-token",
				},
			});

			expect(response.status).toBe(200);
			expect(response.data).toHaveProperty("accessToken");
			expect(typeof response.data.accessToken).toBe("string");

			const claims = readAccessTokenClaims(response.data.accessToken);
			expect(claims).not.toBeNull();
			expect(claims?.role).toBe("student");

			const setCookie = response.headers["set-cookie"];
			expect(setCookie).toBeDefined();
			const cookieStr = Array.isArray(setCookie)
				? setCookie.join("; ")
				: String(setCookie);
			expect(cookieStr).toContain("refresh_token=mock-rotated-refresh-token");
			expect(cookieStr).toContain("Path=/api/auth");
			expect(cookieStr).toContain("HttpOnly");
			expect(cookieStr).toContain("SameSite=Lax");
		});

		it("returns 401 Unauthorized when refresh_token is invalid", async () => {
			const response = await testClient.post("/auth/refresh", null, {
				headers: {
					Cookie: "refresh_token=invalid-token",
				},
			});

			expect(response.status).toBe(401);
			expect(response.data.message).toBe(
				"Refresh token is missing, invalid, revoked, or expired.",
			);
		});

		it("returns 401 Unauthorized when refresh_token is 'missing'", async () => {
			const response = await testClient.post("/auth/refresh", null, {
				headers: {
					Cookie: "refresh_token=missing",
				},
			});

			expect(response.status).toBe(401);
			expect(response.data.message).toBe(
				"Refresh token is missing, invalid, revoked, or expired.",
			);
		});

		it("returns 403 Forbidden when refresh_token is suspended-token", async () => {
			const response = await testClient.post("/auth/refresh", null, {
				headers: {
					Cookie: "refresh_token=suspended-token",
				},
			});

			expect(response.status).toBe(403);
			expect(response.data.message).toBe("The account is suspended.");
		});

		it("returns 401 Unauthorized when Cookie is completely omitted", async () => {
			const response = await testClient.post("/auth/refresh", null);
			expect(response.status).toBe(401);
			expect(response.data.message).toBe(
				"Refresh token is missing, invalid, revoked, or expired.",
			);
		});
	});

	describe("4. POST /api/auth/logout", () => {
		it("returns 204 No Content with empty body and clears cookie", async () => {
			setMockCurrentUser(mockStudent);

			const response = await testClient.post("/auth/logout", null, {
				headers: {
					Cookie: "refresh_token=mock-valid-refresh-token",
				},
			});

			expect(response.status).toBe(204);

			expect(response.data).toBe("");

			const setCookie = response.headers["set-cookie"];
			expect(setCookie).toBeDefined();
			const cookieStr = Array.isArray(setCookie)
				? setCookie.join("; ")
				: String(setCookie);
			expect(cookieStr).toContain("refresh_token=;");
			expect(cookieStr).toContain("Path=/api/auth");
			expect(cookieStr).toContain("Max-Age=0");
			expect(cookieStr).toContain("HttpOnly");
			expect(cookieStr).toContain("SameSite=Lax");
		});
	});

	describe("5. Absence of /api/auth/me", () => {
		it("confirms there is NO handler for GET /api/auth/me (unhandled)", async () => {
			const hasMeHandler = authHandlers.some((h) => {
				const info = h.info as { path?: string };
				return info.path?.includes("/me");
			});
			expect(hasMeHandler).toBe(false);
		});
	});
});
