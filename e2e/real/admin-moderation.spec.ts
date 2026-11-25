import { expect, test } from "@playwright/test";
import {
	apiAuth,
	PASSWORD,
	registerAccount,
	runId,
	SEED,
	signIn,
	signInNewContext,
} from "./support";

/**
 * E2E-05: an admin suspends and restores a course and a user account, and the effects
 * show up for the student. Uses its own lecturer, course and student so the seed
 * courses are never suspended.
 */

test("suspending a course hides it from students and restoring it brings it back", async ({
	browser,
	request,
}) => {
	const lecturerEmail = await registerAccount(request, "LECTURER");
	const studentEmail = await registerAccount(request, "STUDENT");
	const title = `Moderated ${runId()}`;

	// A published course with one lesson and an enrolled student, set up through the API.
	const lecturerAuth = await apiAuth(request, lecturerEmail);
	const created = await request.post("/api/courses", {
		headers: lecturerAuth,
		data: { title, description: "E2E-05" },
	});
	expect(created.status()).toBe(201);
	const { id: courseId } = (await created.json()) as { id: string };
	await request.post(`/api/courses/${courseId}/blocks`, {
		headers: lecturerAuth,
		data: { type: "TEXT", title: "Only lesson", content: { text: "Hi" } },
	});
	const published = await request.patch(`/api/courses/${courseId}/status`, {
		headers: lecturerAuth,
		data: { status: "PUBLISHED" },
	});
	expect(published.ok()).toBe(true);
	const enrolled = await request.post(
		`/api/courses/${courseId}/enrollments/me`,
		{ headers: await apiAuth(request, studentEmail) },
	);
	expect(enrolled.status()).toBe(201);

	// Admin lands on the overview and suspends the course.
	const admin = await signInNewContext(browser, SEED.admin);
	const ap = admin.page;
	await expect(ap).toHaveURL(/\/admin$/);
	await expect(
		ap.getByRole("list", { name: "Platform statistics" }),
	).toBeVisible();
	await ap.goto("/admin/courses");
	await ap.getByRole("searchbox", { name: "Find course" }).fill(title);
	await ap.getByRole("button", { name: new RegExp(title) }).click();
	await ap.getByRole("button", { name: "Suspend course" }).click();
	const suspendDialog = ap.getByRole("dialog");
	await suspendDialog.getByLabel("Reason").fill("E2E moderation check");
	await suspendDialog.getByRole("button", { name: "Suspend course" }).click();
	await expect(
		ap.getByRole("button", { name: "Restore course" }),
	).toBeVisible();

	// Student: gone from the catalog; the reader is refused.
	const student = await signInNewContext(browser, studentEmail);
	const sp = student.page;
	await sp.goto("/catalog");
	await sp.getByLabel("Search courses").fill(title);
	await expect(
		sp.getByRole("heading", { name: "No matching courses found" }),
	).toBeVisible();
	await expect(sp.getByRole("link", { name: new RegExp(title) })).toHaveCount(
		0,
	);
	await sp.goto(`/courses/${courseId}/learn`);
	await expect(sp).not.toHaveURL(/\/learn/);
	await expect(sp.getByText("Only lesson")).toHaveCount(0);

	// Admin restores it; the student can learn again.
	await ap.getByRole("button", { name: "Restore course" }).click();
	const restoreDialog = ap.getByRole("dialog");
	await restoreDialog.getByLabel("Reason").fill("Restored after the check");
	await restoreDialog.getByRole("button", { name: "Restore course" }).click();
	await expect(
		ap.getByRole("button", { name: "Suspend course" }),
	).toBeVisible();

	await sp.goto(`/courses/${courseId}/learn`);
	await expect(
		sp
			.getByRole("region", { name: "Lesson content" })
			.getByRole("heading", { level: 2, name: "Only lesson" }),
	).toBeVisible();

	await admin.context.close();
	await student.context.close();
});

test("a suspended account cannot sign in until an admin restores it", async ({
	browser,
	page,
	request,
}) => {
	const studentEmail = await registerAccount(request, "STUDENT", "Suspend");

	const admin = await signInNewContext(browser, SEED.admin);
	const ap = admin.page;
	await ap.goto("/admin/users");
	await ap.getByRole("searchbox", { name: "Find user" }).fill(studentEmail);
	await ap.getByRole("button", { name: new RegExp(studentEmail) }).click();
	await ap.getByRole("button", { name: "Suspend account" }).click();
	const suspendDialog = ap.getByRole("dialog");
	await suspendDialog.getByLabel("Reason").fill("E2E account check");
	await suspendDialog.getByRole("button", { name: "Suspend account" }).click();
	await expect(
		ap.getByRole("button", { name: "Restore account" }),
	).toBeVisible();

	await page.goto("/login");
	await page.getByLabel("Email", { exact: true }).fill(studentEmail);
	await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(
		page.getByText("Your account has been suspended by an administrator."),
	).toBeVisible();
	await expect(page).toHaveURL(/\/login/);

	await ap.getByRole("button", { name: "Restore account" }).click();
	const restoreDialog = ap.getByRole("dialog");
	await restoreDialog.getByLabel("Reason").fill("Restored");
	await restoreDialog.getByRole("button", { name: "Restore account" }).click();
	await expect(
		ap.getByRole("button", { name: "Suspend account" }),
	).toBeVisible();

	await signIn(page, studentEmail);
	await admin.context.close();
});
