import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setAccessToken } from "@/lib/auth/access-token";
// The interceptors are installed in main.tsx; tests set the header directly.
import { httpClient } from "@/lib/http/client";
import { createMockAccessToken } from "@/mocks/auth.handlers";
import { server } from "@/test/mocks/server";
import { workspaceHandlers } from "../testing/handlers";
import { mockUsers, resetMockDb } from "../testing/mock-db";
import {
	addMember,
	archiveWorkspace,
	createPage,
	createWorkspace,
	listMembers,
	listPages,
	listWorkspaces,
	removeMember,
	updatePage,
} from "./workspace.api";

function signInAs(userId: string) {
	setAccessToken(createMockAccessToken(userId));
	httpClient.defaults.headers.common.Authorization = `Bearer ${createMockAccessToken(userId)}`;
}

beforeEach(() => {
	resetMockDb();
	server.use(...workspaceHandlers);
	signInAs(mockUsers.alex.id);
});

afterEach(() => {
	setAccessToken(null);
	delete httpClient.defaults.headers.common.Authorization;
});

describe("workspace API contract (mocked)", () => {
	it("lists the personal workspace and active additional workspaces with the caller's role", async () => {
		const workspaces = await listWorkspaces();

		expect(
			workspaces.map((workspace) => [workspace.name, workspace.type]),
		).toEqual([
			["My personal workspace", "PERSONAL"],
			["Research journal", "COLLABORATIVE"],
			["Systems study group", "COLLABORATIVE"],
		]);
		expect(workspaces[2]).toMatchObject({
			currentUserRole: "OWNER",
			memberCount: 3,
			pageCount: 2,
		});
		expect(await listWorkspaces({ archived: true })).toEqual([
			expect.objectContaining({ name: "Old project notes" }),
		]);
	});

	it("creates a workspace owned by the caller and archives it", async () => {
		const created = await createWorkspace({ name: "  Thesis  " });
		expect(created).toMatchObject({
			name: "Thesis",
			type: "COLLABORATIVE",
			currentUserRole: "OWNER",
			memberCount: 1,
		});

		const archived = await archiveWorkspace(created.id);
		expect(archived.archivedAt).not.toBeNull();
		await expect(
			createPage(created.id, { title: "Late page" }),
		).rejects.toMatchObject({
			response: { status: 409 },
		});
	});

	it("hides workspaces from non-members as not found", async () => {
		signInAs(mockUsers.bao.id);
		await expect(listPages("ws-personal-alex")).rejects.toMatchObject({
			response: { status: 404 },
		});
	});

	it("enforces membership roles from the Authorization Model", async () => {
		signInAs(mockUsers.mai.id);
		await expect(
			addMember("ws-systems-study-group", {
				email: "alex@example.com",
				role: "CO_OWNER",
			}),
		).rejects.toMatchObject({ response: { status: 403 } });
		await expect(
			removeMember("ws-systems-study-group", mockUsers.alex.id),
		).rejects.toMatchObject({ response: { status: 403 } });

		await removeMember("ws-systems-study-group", mockUsers.bao.id);
		expect(
			(await listMembers("ws-systems-study-group")).map(
				(member) => member.role,
			),
		).toEqual(["OWNER", "CO_OWNER"]);
	});

	it("refuses collaborators in the personal workspace", async () => {
		await expect(
			addMember("ws-personal-alex", {
				email: "mai@example.com",
				role: "MEMBER",
			}),
		).rejects.toMatchObject({ response: { status: 409 } });
	});

	it("nests pages and rejects moving a page under its own subtree", async () => {
		const child = await createPage("ws-personal-alex", {
			title: "Deadlocks",
			parentPageId: "page-processes",
		});
		expect(child.parentPageId).toBe("page-processes");

		await expect(
			updatePage("page-os-notes", { parentPageId: child.id }),
		).rejects.toMatchObject({ response: { status: 400 } });
	});

	it("requires a Bearer token", async () => {
		delete httpClient.defaults.headers.common.Authorization;
		await expect(listWorkspaces()).rejects.toMatchObject({
			response: { status: 401 },
		});
	});
});
