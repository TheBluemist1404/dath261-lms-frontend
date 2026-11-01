import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.join(SKILL_DIR, "artifacts");
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, "screenshots");
const VIDEOS_DIR = path.join(ARTIFACTS_DIR, "videos");
const CONV_ARTIFACTS_DIR =
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ff240170-4524-466c-9afd-da69396d21f2";

const BASE_URL = "http://localhost:4173";

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
if (fs.existsSync(CONV_ARTIFACTS_DIR)) {
	fs.mkdirSync(CONV_ARTIFACTS_DIR, { recursive: true });
}

function createMockJwt({ sub, role, email, firstName, lastName }) {
	const header = Buffer.from(
		JSON.stringify({ alg: "HS256", typ: "JWT" }),
	).toString("base64url");
	const now = Math.floor(Date.now() / 1000);
	const payload = Buffer.from(
		JSON.stringify({
			sub,
			role: role.toUpperCase(),
			email,
			firstName,
			lastName,
			iat: now,
			exp: now + 3600,
		}),
	).toString("base64url");
	return `${header}.${payload}.mockSignature`;
}

async function runBrowserVerification() {
	console.log("[verify-browser] Launching Playwright browser...");
	const browser = await chromium.launch({
		headless: true,
	});

	const context = await browser.newContext({
		recordVideo: {
			dir: VIDEOS_DIR,
			size: { width: 1280, height: 800 },
		},
		viewport: { width: 1280, height: 800 },
	});

	const page = await context.newPage();

	let currentUser = null;

	await page.route("**/api/auth/**", async (route) => {
		const url = route.request().url();
		const method = route.request().method();

		if (url.includes("/api/auth/register") && method === "POST") {
			const body = JSON.parse(route.request().postData() || "{}");
			return route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					id: "usr_reg_01",
					email: body.email,
					role: body.role,
					firstName: body.firstName,
					lastName: body.lastName,
				}),
			});
		}

		if (url.includes("/api/auth/login") && method === "POST") {
			const body = JSON.parse(route.request().postData() || "{}");
			if (
				body.email === "wrong@example.com" ||
				body.password === "wrongpassword"
			) {
				return route.fulfill({
					status: 401,
					contentType: "application/json",
					body: JSON.stringify({ message: "Invalid email or password." }),
				});
			}
			if (body.email === "suspended@nodus.edu") {
				return route.fulfill({
					status: 403,
					contentType: "application/json",
					body: JSON.stringify({
						message: "Your account has been suspended by an administrator.",
					}),
				});
			}

			const isLecturer = body.email.includes("lecturer");
			const isDrNguyen = body.email === "lecturer@example.com";
			currentUser = {
				sub: "usr_active_01",
				role: isLecturer ? "LECTURER" : "STUDENT",
				email: body.email,
				firstName: isDrNguyen ? "Nguyen" : isLecturer ? "Jane" : "Alex",
				lastName: isDrNguyen ? "Dr" : isLecturer ? "Lecturer" : "Student",
			};

			const accessToken = createMockJwt(currentUser);
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ accessToken }),
			});
		}

		if (url.includes("/api/auth/refresh") && method === "POST") {
			if (currentUser) {
				const accessToken = createMockJwt(currentUser);
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ accessToken }),
				});
			}
			return route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ message: "No active session" }),
			});
		}

		if (url.includes("/api/auth/logout") && method === "POST") {
			currentUser = null;
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true }),
			});
		}

		return route.continue();
	});

	await page.route("**/api/workspaces/**", async (route) => {
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});

	console.log("[verify-browser] Step 1: Login validation & error handling...");
	await page.goto(`${BASE_URL}/login`);
	await page.waitForLoadState("networkidle");

	await page.click('button[type="submit"]');
	await page.waitForSelector('[role="alert"]');
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "01-login-validation-empty.png"),
	});

	await page.fill('input[type="email"]', "wrong@example.com");
	await page.fill('input[type="password"]', "wrongpassword");
	await page.click('button[type="submit"]');
	await page.waitForSelector('[role="alert"]');
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "02-login-invalid-credentials.png"),
	});

	console.log("[verify-browser] Step 2: Register flow & role toggle...");
	await page.getByRole("link", { name: "Create an account" }).click();
	await page.waitForURL("**/register");
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "03-register-screen-initial.png"),
	});

	await page.click('button[type="submit"]');
	await page.waitForSelector('[role="alert"]');
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "04-register-validation-empty.png"),
	});

	await page.getByRole("tab", { name: "Lecturer" }).click();
	await page.fill('input[id="register-fullname"]', "Dr. Nguyen");
	await page.fill('input[id="register-email"]', "lecturer@example.com");
	await page.fill('input[id="register-password"]', "lecturer123");
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "05-register-lecturer-filled.png"),
	});

	await page.click('button[type="submit"]');
	await page.waitForURL(
		"**/login?email=lecturer%40example.com&registered=true",
	);
	await page.waitForSelector(
		'text="Account created successfully. Please log in."',
	);
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "06-register-success-redirect.png"),
	});

	console.log(
		"[verify-browser] Step 3: Login from register redirect & logout...",
	);
	await page.fill('input[id="login-password"]', "lecturer123");
	await page.click('button[type="submit"]');
	await page.waitForURL(`${BASE_URL}/workspace`);
	await page.waitForSelector('button:has-text("Sign out")');
	await page.click('button:has-text("Sign out")');
	await page.waitForSelector('a:has-text("Sign in")');
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "07-logout-from-register.png"),
	});

	console.log("[verify-browser] Step 4: Login UX & Session bootstrap...");
	await page.goto(`${BASE_URL}/login`);
	await page.waitForLoadState("networkidle");
	await page.fill('input[type="email"]', "student@example.com");
	await page.fill('input[type="password"]', "password123");
	await page.click('button[type="submit"]');
	await page.waitForURL(`${BASE_URL}/workspace`);
	await page.waitForSelector('button:has-text("Sign out")');
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "08-authenticated-student-home.png"),
	});

	console.log(
		"[verify-browser] Step 5: Session persists across navigation and reload...",
	);
	await page.reload();
	await page.waitForLoadState("networkidle");
	await page.waitForSelector('button:has-text("Sign out")');
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "09-session-persists-after-reload.png"),
	});

	console.log("[verify-browser] Step 6: Logout clears frontend state...");
	await page.click('button:has-text("Sign out")');
	await page.waitForSelector('a:has-text("Sign in")');
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "10-logout-cleared-session.png"),
	});

	console.log(
		"[verify-browser] Step 7: Protected routes redirect guest to login...",
	);
	await page.goto(`${BASE_URL}/workspace`);
	await page.waitForURL("**/login?redirect=%2Fworkspace");
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "11-guest-bounce-to-login.png"),
	});

	console.log("[verify-browser] Step 8: Open redirect evasion sanitized...");
	await page.goto(`${BASE_URL}/login?redirect=%2F%2Fevil.com`);
	await page.fill('input[type="email"]', "student@example.com");
	await page.fill('input[type="password"]', "password123");
	await page.click('button[type="submit"]');
	await page.waitForURL(`${BASE_URL}/workspace`);
	await page.screenshot({
		path: path.join(SCREENSHOTS_DIR, "12-open-redirect-sanitized.png"),
	});

	console.log(
		"[verify-browser] Step 9: Return redirect to requested protected route...",
	);
	await page.click('button:has-text("Sign out")');
	await page.waitForSelector('a:has-text("Sign in")');
	await page.goto(`${BASE_URL}/login?redirect=%2Fworkspace`);
	await page.fill('input[type="email"]', "student@example.com");
	await page.fill('input[type="password"]', "password123");
	await page.click('button[type="submit"]');
	await page.waitForURL(`${BASE_URL}/workspace`);
	await page.waitForSelector('h1:has-text("Workspaces")');
	await page.screenshot({
		path: path.join(
			SCREENSHOTS_DIR,
			"13-protected-route-dashboard-entered.png",
		),
	});

	console.log("[verify-browser] Closing context and finalizing video...");
	await page.close();
	await context.close();
	await browser.close();

	const videoFiles = fs
		.readdirSync(VIDEOS_DIR)
		.filter((f) => f.endsWith(".webm"));
	if (videoFiles.length > 0) {
		const latestVideo = path.join(
			VIDEOS_DIR,
			videoFiles[videoFiles.length - 1],
		);
		const targetVideo = path.join(VIDEOS_DIR, "nodus-auth-verification.webm");
		fs.copyFileSync(latestVideo, targetVideo);
		console.log(`[verify-browser] Video recorded: ${targetVideo}`);
	}

	const screenshots = fs
		.readdirSync(SCREENSHOTS_DIR)
		.filter((f) => f.endsWith(".png"));
	console.log(`[verify-browser] Captured ${screenshots.length} screenshots.`);

	if (fs.existsSync(CONV_ARTIFACTS_DIR)) {
		for (const shot of screenshots) {
			fs.copyFileSync(
				path.join(SCREENSHOTS_DIR, shot),
				path.join(CONV_ARTIFACTS_DIR, shot),
			);
		}
		const finalWebm = path.join(VIDEOS_DIR, "nodus-auth-verification.webm");
		if (fs.existsSync(finalWebm)) {
			fs.copyFileSync(
				finalWebm,
				path.join(CONV_ARTIFACTS_DIR, "nodus-auth-verification.webm"),
			);
		}
		console.log(`[verify-browser] Copied all media to ${CONV_ARTIFACTS_DIR}`);
	}

	console.log("[verify-browser] Complete verification run succeeded!");
}

runBrowserVerification().catch((err) => {
	console.error("[verify-browser] Verification error:", err);
	process.exit(1);
});
