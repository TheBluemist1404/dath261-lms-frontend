import { HttpResponse, http } from "msw";
import { readAccessTokenClaims } from "@/lib/auth/access-token";
import type {
	AddMemberInput,
	CreatePageInput,
	CreateWorkspaceInput,
	Page,
	UpdatePageInput,
	UpdateWorkspaceInput,
	Workspace,
	WorkspaceMember,
} from "../types";
import {
	type MockMembershipRecord,
	type MockWorkspaceRecord,
	mockDb,
} from "./mock-db";

// Mock of the workspace REST contract in docs/workspace-api-contract.md, enforcing
// the Authorization Model so UI states for 401/403/404/409 can be exercised.

const api = (path: string) => `*/api${path}`;

function error(statusCode: number, message: string) {
	const names: Record<number, string> = {
		400: "Bad Request",
		401: "Unauthorized",
		403: "Forbidden",
		404: "Not Found",
		409: "Conflict",
	};
	return HttpResponse.json(
		{ statusCode, message, error: names[statusCode] },
		{ status: statusCode },
	);
}

function currentUserId(request: Request) {
	const header = request.headers.get("Authorization");
	const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
	return token ? (readAccessTokenClaims(token)?.userId ?? null) : null;
}

function membershipOf(workspaceId: string, userId: string) {
	return mockDb.memberships.find(
		(membership) =>
			membership.workspaceId === workspaceId && membership.userId === userId,
	);
}

function now() {
	return new Date().toISOString();
}

function toWorkspace(
	record: MockWorkspaceRecord,
	membership: MockMembershipRecord,
): Workspace {
	return {
		id: record.id,
		name: record.name,
		type: record.type,
		currentUserRole: membership.role,
		pageCount: mockDb.pages.filter((page) => page.workspaceId === record.id)
			.length,
		memberCount: mockDb.memberships.filter(
			(entry) => entry.workspaceId === record.id,
		).length,
		archivedAt: record.archivedAt,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

function toMember(membership: MockMembershipRecord): WorkspaceMember {
	const user = mockDb.users.find((entry) => entry.id === membership.userId);
	if (!user) throw new Error(`Mock user ${membership.userId} is missing`);
	return {
		userId: membership.userId,
		role: membership.role,
		joinedAt: membership.joinedAt,
		user,
	};
}

function toPageSummary({ content: _content, ...summary }: Page) {
	return summary;
}

type Access =
	| {
			ok: true;
			userId: string;
			workspace: MockWorkspaceRecord;
			membership: MockMembershipRecord;
	  }
	| { ok: false; response: Response };

/** Resolves the caller and their membership; non-members get 404, not 403. */
function resolveWorkspace(request: Request, workspaceId: string): Access {
	const userId = currentUserId(request);
	if (!userId) return { ok: false, response: error(401, "Unauthorized") };

	const workspace = mockDb.workspaces.find((entry) => entry.id === workspaceId);
	const membership = workspace && membershipOf(workspace.id, userId);
	if (!workspace || !membership) {
		return { ok: false, response: error(404, "Workspace not found") };
	}
	return { ok: true, userId, workspace, membership };
}

function resolvePage(request: Request, pageId: string) {
	const page = mockDb.pages.find((entry) => entry.id === pageId);
	if (!page) {
		const userId = currentUserId(request);
		return {
			ok: false as const,
			response: userId
				? error(404, "Page not found")
				: error(401, "Unauthorized"),
		};
	}
	const access = resolveWorkspace(request, page.workspaceId);
	if (!access.ok) {
		return {
			ok: false as const,
			response:
				access.response.status === 404
					? error(404, "Page not found")
					: access.response,
		};
	}
	return { ...access, page };
}

function validName(value: unknown, max = 100): value is string {
	return (
		typeof value === "string" &&
		value.trim().length > 0 &&
		value.trim().length <= max
	);
}

function isDescendant(pageId: string, candidateAncestorId: string): boolean {
	let current = mockDb.pages.find((entry) => entry.id === pageId);
	while (current?.parentPageId) {
		if (current.parentPageId === candidateAncestorId) return true;
		const parentId: string = current.parentPageId;
		current = mockDb.pages.find((entry) => entry.id === parentId);
	}
	return false;
}

export const workspaceHandlers = [
	http.get(api("/workspaces"), ({ request }) => {
		const userId = currentUserId(request);
		if (!userId) return error(401, "Unauthorized");

		const archived =
			new URL(request.url).searchParams.get("archived") === "true";
		const workspaces = mockDb.memberships
			.filter((membership) => membership.userId === userId)
			.flatMap((membership) => {
				const record = mockDb.workspaces.find(
					(entry) => entry.id === membership.workspaceId,
				);
				return record && (record.archivedAt !== null) === archived
					? [toWorkspace(record, membership)]
					: [];
			});
		return HttpResponse.json(workspaces);
	}),

	http.post(api("/workspaces"), async ({ request }) => {
		const userId = currentUserId(request);
		if (!userId) return error(401, "Unauthorized");

		const body = (await request.json()) as Partial<CreateWorkspaceInput>;
		if (!validName(body.name)) {
			return error(400, "name must be 1 to 100 characters");
		}

		const timestamp = now();
		const record: MockWorkspaceRecord = {
			id: `ws-${crypto.randomUUID()}`,
			name: body.name.trim(),
			type: "COLLABORATIVE",
			createdById: userId,
			archivedAt: null,
			createdAt: timestamp,
			updatedAt: timestamp,
		};
		const membership: MockMembershipRecord = {
			workspaceId: record.id,
			userId,
			role: "OWNER",
			joinedAt: timestamp,
		};
		mockDb.workspaces.push(record);
		mockDb.memberships.push(membership);
		return HttpResponse.json(toWorkspace(record, membership), { status: 201 });
	}),

	http.get(api("/workspaces/:workspaceId"), ({ request, params }) => {
		const access = resolveWorkspace(request, String(params.workspaceId));
		if (!access.ok) return access.response;
		return HttpResponse.json(toWorkspace(access.workspace, access.membership));
	}),

	http.patch(api("/workspaces/:workspaceId"), async ({ request, params }) => {
		const access = resolveWorkspace(request, String(params.workspaceId));
		if (!access.ok) return access.response;
		if (access.membership.role !== "OWNER") {
			return error(403, "Only an Owner can rename this workspace");
		}
		if (access.workspace.archivedAt) {
			return error(409, "Restore the workspace before editing it");
		}

		const body = (await request.json()) as Partial<UpdateWorkspaceInput>;
		if (!validName(body.name)) {
			return error(400, "name must be 1 to 100 characters");
		}
		access.workspace.name = body.name.trim();
		access.workspace.updatedAt = now();
		return HttpResponse.json(toWorkspace(access.workspace, access.membership));
	}),

	http.post(api("/workspaces/:workspaceId/archive"), ({ request, params }) => {
		const access = resolveWorkspace(request, String(params.workspaceId));
		if (!access.ok) return access.response;
		if (access.workspace.type === "PERSONAL") {
			return error(409, "The personal workspace cannot be archived");
		}
		if (access.membership.role !== "OWNER") {
			return error(403, "Only an Owner can archive this workspace");
		}
		if (access.workspace.archivedAt) {
			return error(409, "Workspace is already archived");
		}
		access.workspace.archivedAt = now();
		access.workspace.updatedAt = access.workspace.archivedAt;
		return HttpResponse.json(toWorkspace(access.workspace, access.membership));
	}),

	http.post(api("/workspaces/:workspaceId/restore"), ({ request, params }) => {
		const access = resolveWorkspace(request, String(params.workspaceId));
		if (!access.ok) return access.response;
		if (access.membership.role !== "OWNER") {
			return error(403, "Only an Owner can restore this workspace");
		}
		if (!access.workspace.archivedAt) {
			return error(409, "Workspace is not archived");
		}
		access.workspace.archivedAt = null;
		access.workspace.updatedAt = now();
		return HttpResponse.json(toWorkspace(access.workspace, access.membership));
	}),

	http.get(api("/workspaces/:workspaceId/pages"), ({ request, params }) => {
		const access = resolveWorkspace(request, String(params.workspaceId));
		if (!access.ok) return access.response;
		return HttpResponse.json(
			mockDb.pages
				.filter((page) => page.workspaceId === access.workspace.id)
				.map(toPageSummary),
		);
	}),

	http.post(
		api("/workspaces/:workspaceId/pages"),
		async ({ request, params }) => {
			const access = resolveWorkspace(request, String(params.workspaceId));
			if (!access.ok) return access.response;
			if (access.workspace.archivedAt) {
				return error(409, "Restore the workspace before editing it");
			}

			const body = (await request.json()) as Partial<CreatePageInput>;
			if (!validName(body.title, 200)) {
				return error(400, "title must be 1 to 200 characters");
			}
			const parentPageId = body.parentPageId ?? null;
			if (
				parentPageId &&
				!mockDb.pages.some(
					(page) =>
						page.id === parentPageId &&
						page.workspaceId === access.workspace.id,
				)
			) {
				return error(400, "parentPageId must be a page in this workspace");
			}

			const timestamp = now();
			const page: Page = {
				id: `page-${crypto.randomUUID()}`,
				workspaceId: access.workspace.id,
				title: body.title.trim(),
				parentPageId,
				content: null,
				createdAt: timestamp,
				updatedAt: timestamp,
			};
			mockDb.pages.push(page);
			return HttpResponse.json(page, { status: 201 });
		},
	),

	http.get(api("/pages/:pageId"), ({ request, params }) => {
		const access = resolvePage(request, String(params.pageId));
		if (!access.ok) return access.response;
		return HttpResponse.json(access.page);
	}),

	http.patch(api("/pages/:pageId"), async ({ request, params }) => {
		const access = resolvePage(request, String(params.pageId));
		if (!access.ok) return access.response;
		if (access.workspace.archivedAt) {
			return error(409, "Restore the workspace before editing it");
		}

		const body = (await request.json()) as UpdatePageInput;
		const { page } = access;
		if (body.title !== undefined) {
			if (!validName(body.title, 200)) {
				return error(400, "title must be 1 to 200 characters");
			}
			page.title = body.title.trim();
		}
		if (body.parentPageId !== undefined) {
			const parentId = body.parentPageId;
			if (parentId !== null) {
				const parent = mockDb.pages.find((entry) => entry.id === parentId);
				if (
					!parent ||
					parent.workspaceId !== page.workspaceId ||
					parent.id === page.id ||
					isDescendant(parent.id, page.id)
				) {
					return error(
						400,
						"parentPageId must be another page outside this subtree",
					);
				}
			}
			page.parentPageId = parentId;
		}
		if (body.content !== undefined) page.content = body.content;
		page.updatedAt = now();
		return HttpResponse.json(page);
	}),

	http.delete(api("/pages/:pageId"), ({ request, params }) => {
		const access = resolvePage(request, String(params.pageId));
		if (!access.ok) return access.response;
		if (access.workspace.archivedAt) {
			return error(409, "Restore the workspace before editing it");
		}

		const removed = new Set([access.page.id]);
		for (const page of mockDb.pages) {
			if (isDescendant(page.id, access.page.id)) removed.add(page.id);
		}
		mockDb.pages = mockDb.pages.filter((page) => !removed.has(page.id));
		return new HttpResponse(null, { status: 204 });
	}),

	http.get(api("/workspaces/:workspaceId/members"), ({ request, params }) => {
		const access = resolveWorkspace(request, String(params.workspaceId));
		if (!access.ok) return access.response;
		return HttpResponse.json(
			mockDb.memberships
				.filter((membership) => membership.workspaceId === access.workspace.id)
				.map(toMember),
		);
	}),

	http.post(
		api("/workspaces/:workspaceId/members"),
		async ({ request, params }) => {
			const access = resolveWorkspace(request, String(params.workspaceId));
			if (!access.ok) return access.response;
			if (access.workspace.type === "PERSONAL") {
				return error(409, "The personal workspace has no collaborators");
			}
			if (access.workspace.archivedAt) {
				return error(409, "Restore the workspace before editing it");
			}

			const body = (await request.json()) as Partial<AddMemberInput>;
			if (body.role !== "MEMBER" && body.role !== "CO_OWNER") {
				return error(400, "role must be MEMBER or CO_OWNER");
			}
			const callerRole = access.membership.role;
			const allowed =
				callerRole === "OWNER" ||
				(callerRole === "CO_OWNER" && body.role === "MEMBER");
			if (!allowed) return error(403, "You cannot add members with this role");

			const user = mockDb.users.find(
				(entry) =>
					entry.email.toLowerCase() === body.email?.trim().toLowerCase(),
			);
			if (!user) return error(404, "No user with this email");
			if (membershipOf(access.workspace.id, user.id)) {
				return error(409, "This user is already a member");
			}

			const membership: MockMembershipRecord = {
				workspaceId: access.workspace.id,
				userId: user.id,
				role: body.role,
				joinedAt: now(),
			};
			mockDb.memberships.push(membership);
			return HttpResponse.json(toMember(membership), { status: 201 });
		},
	),

	http.delete(
		api("/workspaces/:workspaceId/members/:userId"),
		({ request, params }) => {
			const access = resolveWorkspace(request, String(params.workspaceId));
			if (!access.ok) return access.response;

			const target = membershipOf(access.workspace.id, String(params.userId));
			if (!target) return error(404, "Member not found");
			if (target.role === "OWNER") {
				return error(403, "Owner membership cannot be changed");
			}
			const callerRole = access.membership.role;
			const allowed =
				callerRole === "OWNER" ||
				(callerRole === "CO_OWNER" && target.role === "MEMBER");
			if (!allowed) return error(403, "You cannot remove this member");

			mockDb.memberships = mockDb.memberships.filter(
				(entry) => entry !== target,
			);
			return new HttpResponse(null, { status: 204 });
		},
	),
];
