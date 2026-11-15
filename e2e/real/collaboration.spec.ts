import { HocuspocusProvider } from "@hocuspocus/provider";
import {
	type APIRequestContext,
	type Browser,
	type BrowserContext,
	expect,
	type Page,
	test,
	type WebSocketRoute,
} from "@playwright/test";
import * as Y from "yjs";

/**
 * E2E-02: real-time collaboration on a shared page, end to end against the real
 * backend and its /api/collab WebSocket. Uses the seeded accounts from the
 * backend's `pnpm db:seed:dev`; every run makes its own workspace.
 */

const PASSWORD = "password123";
const OWNER = "student@dath261.dev";
const MEMBER = "classmate@dath261.dev";
const OUTSIDER = "lecturer@dath261.dev";

const editor = (page: Page) =>
	page.locator('[aria-label="Page content"][contenteditable="true"]');

async function signIn(browser: Browser, email: string) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto("/login");
	await page.getByLabel("Email", { exact: true }).fill(email);
	await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page).not.toHaveURL(/\/login/);
	return { context, page };
}

/** The page's text, one line per block, without other people's cursors. */
function documentText(page: Page) {
	return editor(page).evaluate((root) => {
		const copy = root.cloneNode(true) as HTMLElement;
		for (const cursor of copy.querySelectorAll(
			".bn-collaboration-cursor__base",
		)) {
			cursor.remove();
		}
		return [...copy.querySelectorAll(".bn-block-content")]
			.map((block) => block.textContent ?? "")
			.join("\n");
	});
}

/** Types a new paragraph at the end of the page. */
async function appendLine(page: Page, text: string) {
	await editor(page).click();
	await page.keyboard.press("Control+End");
	await page.keyboard.press("Enter");
	await page.keyboard.type(text);
}

async function accessToken(request: APIRequestContext, email: string) {
	const response = await request.post("/api/auth/login", {
		data: { email, password: PASSWORD },
	});
	expect(response.ok()).toBe(true);
	return ((await response.json()) as { accessToken: string }).accessToken;
}

/**
 * Passes the member's collaboration socket through the test, so it can be cut
 * like a dropped network. Offline emulation alone leaves an open WebSocket up.
 */
async function cuttableCollabLink(context: BrowserContext) {
	let online = true;
	const open = new Set<WebSocketRoute>();
	await context.routeWebSocket(/\/api\/collab/, (socket) => {
		if (!online) {
			void socket.close({ code: 1006, reason: "offline" });
			return;
		}
		open.add(socket);
		socket.connectToServer();
		socket.onClose(() => open.delete(socket));
	});
	return {
		async drop() {
			online = false;
			await context.setOffline(true);
			for (const socket of open) await socket.close();
			open.clear();
		},
		async restore() {
			online = true;
			await context.setOffline(false);
		},
	};
}

/** Opens the collaboration socket directly and reports how the server answers. */
function connectToCollab(baseURL: string, pageId: string, token: string) {
	const url = `${baseURL.replace(/^http/, "ws")}/api/collab`;
	return new Promise<string>((resolve) => {
		const provider = new HocuspocusProvider({
			url,
			name: pageId,
			document: new Y.Doc(),
			token,
			onAuthenticated: () => finish("authenticated"),
			onAuthenticationFailed: ({ reason }) => finish(`denied: ${reason}`),
		});
		const timer = setTimeout(() => finish("no answer"), 10_000);
		function finish(result: string) {
			clearTimeout(timer);
			provider.destroy();
			resolve(result);
		}
	});
}

test("two members edit a shared page live, recover from a dropped connection and keep the content", async ({
	browser,
	baseURL,
	request,
}) => {
	const runId = Date.now().toString(36);
	const workspaceName = `E2E-02 study group ${runId}`;
	const pageTitle = `Shared notes ${runId}`;

	const owner = await signIn(browser, OWNER);
	const member = await signIn(browser, MEMBER);
	const memberLink = await cuttableCollabLink(member.context);
	let pageUrl = "";

	await test.step("the owner creates a workspace and a page, then adds a member", async () => {
		const { page } = owner;
		await page.goto("/workspace");
		await page.getByRole("button", { name: "Create workspace" }).click();
		const createDialog = page.getByRole("dialog", {
			name: "Create a workspace",
		});
		await createDialog.getByLabel("Workspace name").fill(workspaceName);
		await createDialog
			.getByRole("button", { name: "Create workspace" })
			.click();
		await page.getByRole("link", { name: workspaceName }).click();

		await page.getByRole("button", { name: "Create page" }).click();
		const pageDialog = page.getByRole("dialog", { name: "Create a page" });
		await pageDialog.getByLabel("Page title").fill(pageTitle);
		await pageDialog.getByRole("button", { name: "Create page" }).click();
		await expect(page).toHaveURL(/\/workspace\/[^/]+\/pages\/[^/]+$/);
		pageUrl = new URL(page.url()).pathname;

		await page.getByRole("link", { name: /^Members/ }).click();
		await page.getByRole("button", { name: "Add member" }).click();
		const memberDialog = page.getByRole("dialog", {
			name: "Add an existing user",
		});
		await memberDialog
			.getByLabel("Email of an existing platform user")
			.fill(MEMBER);
		await memberDialog.getByRole("button", { name: "Add member" }).click();
		await expect(page.getByText(/was added as/)).toBeVisible();
	});

	await test.step("edits from each member show up for the other", async () => {
		await owner.page.goto(pageUrl);
		await member.page.goto(pageUrl);
		await expect(editor(owner.page)).toBeVisible();
		await expect(editor(member.page)).toBeVisible();

		await appendLine(owner.page, "Owner: BFS visits nodes level by level.");
		await expect(
			editor(member.page).getByText("Owner: BFS visits nodes level by level."),
		).toBeVisible({ timeout: 5_000 });

		await appendLine(member.page, "Member: Dijkstra needs weights >= 0.");
		await expect(
			editor(owner.page).getByText("Member: Dijkstra needs weights >= 0."),
		).toBeVisible({ timeout: 5_000 });
	});

	await test.step("both type at the same time and end up with the same text", async () => {
		await Promise.all([
			appendLine(owner.page, "Owner typing at the same time"),
			appendLine(member.page, "Member typing at the same time"),
		]);
		for (const { page } of [owner, member]) {
			await expect(
				editor(page).getByText("Owner typing at the same time"),
			).toBeVisible({ timeout: 5_000 });
			await expect(
				editor(page).getByText("Member typing at the same time"),
			).toBeVisible({ timeout: 5_000 });
		}
		await expect
			.poll(async () => documentText(member.page))
			.toBe(await documentText(owner.page));
	});

	await test.step("the member drops offline, misses edits, and catches up on reconnect", async () => {
		await memberLink.drop();
		// While offline the page pauses editing, so the member cannot type over
		// changes they have not seen.
		await expect(member.page.getByText("Editing paused")).toBeVisible({
			timeout: 15_000,
		});
		await expect(
			member.page.locator(
				'[aria-label="Page content"][contenteditable="false"]',
			),
		).toBeVisible();

		await appendLine(owner.page, "Owner: written while the member was away.");

		await memberLink.restore();
		await expect(
			editor(member.page).getByText(
				"Owner: written while the member was away.",
			),
		).toBeVisible({ timeout: 30_000 });

		await appendLine(member.page, "Member: back online.");
		await expect(
			editor(owner.page).getByText("Member: back online."),
		).toBeVisible({ timeout: 5_000 });
		await expect
			.poll(async () => documentText(member.page))
			.toBe(await documentText(owner.page));
	});

	await test.step("the content is still there after both reload", async () => {
		const before = await documentText(owner.page);
		await Promise.all([owner.page.reload(), member.page.reload()]);
		for (const { page } of [owner, member]) {
			await expect(editor(page)).toBeVisible();
			await expect(
				editor(page).getByText("Member: back online."),
			).toBeVisible();
			await expect.poll(async () => documentText(page)).toBe(before);
		}
	});

	await test.step("a user outside the workspace can open neither the page nor its socket", async () => {
		const outsider = await signIn(browser, OUTSIDER);
		await outsider.page.goto(pageUrl);
		// Wait for the answer, so the checks below don't pass while it is loading.
		await expect(
			outsider.page.getByRole("heading", { name: "Workspace not found" }),
		).toBeVisible();
		await expect(editor(outsider.page)).toHaveCount(0);
		await expect(
			outsider.page.getByText("Owner: BFS visits nodes level by level."),
		).toHaveCount(0);

		const pageId = pageUrl.split("/").pop() ?? "";
		const outsiderToken = await accessToken(request, OUTSIDER);
		expect(await connectToCollab(baseURL ?? "", pageId, outsiderToken)).toMatch(
			/^denied/,
		);
		// The same socket check passes for a member, so the denial above is about
		// membership, not a broken connection.
		const memberToken = await accessToken(request, MEMBER);
		expect(await connectToCollab(baseURL ?? "", pageId, memberToken)).toBe(
			"authenticated",
		);
		await outsider.context.close();
	});

	await owner.context.close();
	await member.context.close();
});
