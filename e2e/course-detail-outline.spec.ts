import { expect, type Page, test } from "@playwright/test";

type AuthSessionMode = "signed-out" | "signed-in";

async function setMockSessionMode(page: Page, mode: AuthSessionMode) {
	await page.addInitScript((sessionMode) => {
		if (sessionMode === "signed-out") {
			localStorage.setItem("nodus_logout_tombstone", "true");
			return;
		}
		localStorage.removeItem("nodus_logout_tombstone");
	}, mode);
}

function observeRuntimeErrors(page: Page) {
	const pageErrors: string[] = [];
	const consoleErrors: string[] = [];

	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});
	page.on("console", (message) => {
		if (message.type() === "error") {
			consoleErrors.push(message.text());
		}
	});

	return {
		assertClean() {
			expect(pageErrors).toEqual([]);
			expect(consoleErrors).toEqual([]);
		},
	};
}

test.describe("Course detail public syllabus outline", () => {
	test("allows a signed-out visitor to open a course from /catalog and inspect its syllabus outline", async ({
		page,
	}) => {
		const runtimeErrors = observeRuntimeErrors(page);
		await setMockSessionMode(page, "signed-out");

		await page.goto("/catalog");
		await page.getByRole("link", { name: /Operating Systems/ }).click();

		await expect(page).toHaveURL(/\/courses\/course-os$/);
		await expect(page.getByText("7 learning items")).toBeVisible();
		await expect(
			page.getByRole("heading", { level: 2, name: "Course Syllabus" }),
		).toBeVisible();
		await expect(
			page.getByText("Module 1: Kernel Architecture & System Calls"),
		).toBeVisible();
		await expect(
			page.getByText("Introduction to Operating System Abstractions"),
		).toBeVisible();
		await expect(
			page.getByText("Module 2: Process Scheduling & Threads"),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Log in to enroll" }),
		).toBeVisible();

		await expect(
			page.getByText("Process Control Blocks & Context Switching"),
		).toBeHidden();
		await page.getByRole("button", { name: "Expand all" }).click();
		await expect(
			page.getByText("Process Control Blocks & Context Switching"),
		).toBeVisible();

		await expect(page.getByText("Failed to load course syllabus.")).toHaveCount(
			0,
		);
		runtimeErrors.assertClean();
	});

	test("shows the syllabus outline alongside the Enroll CTA for a signed-in non-enrolled student", async ({
		page,
	}) => {
		const runtimeErrors = observeRuntimeErrors(page);
		await setMockSessionMode(page, "signed-in");

		await page.goto("/catalog");
		await page.getByRole("link", { name: /Operating Systems/ }).click();

		await expect(page).toHaveURL(/\/courses\/course-os$/);
		await expect(page.getByText("7 learning items")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Enroll in Course" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { level: 2, name: "Course Syllabus" }),
		).toBeVisible();
		await expect(
			page.getByText("Module 1: Kernel Architecture & System Calls"),
		).toBeVisible();
		await expect(
			page.getByText("Introduction to Operating System Abstractions"),
		).toBeVisible();

		await expect(page.getByText("Failed to load course syllabus.")).toHaveCount(
			0,
		);
		runtimeErrors.assertClean();
	});

	test("fits a 390x844 mobile viewport without horizontal overflow", async ({
		page,
	}) => {
		const runtimeErrors = observeRuntimeErrors(page);
		await setMockSessionMode(page, "signed-out");
		await page.setViewportSize({ width: 390, height: 844 });

		await page.goto("/courses/course-os");

		await expect(
			page.getByRole("heading", { level: 2, name: "Course Syllabus" }),
		).toBeVisible();
		await expect(
			page.getByText("Module 1: Kernel Architecture & System Calls"),
		).toBeVisible();
		await expect(
			page.getByText("Introduction to Operating System Abstractions"),
		).toBeVisible();

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
		runtimeErrors.assertClean();
	});
});
