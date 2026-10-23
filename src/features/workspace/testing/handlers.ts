import { HttpResponse, http } from "msw";
import { readAccessTokenClaims } from "@/lib/auth/access-token";
import type {
	AddMemberInput,
	CourseReference,
	CreateMessageInput,
	CreatePageInput,
	CreateReferenceInput,
	CreateReportInput,
	CreateWorkspaceInput,
	Page,
	PageHit,
	PageMessage,
	ReferencedBlock,
	UpdatePageInput,
	UpdateWorkspaceInput,
	Workspace,
	WorkspaceMember,
} from "../types";
import {
	type MockCourseBlockRecord,
	type MockMembershipRecord,
	type MockMessageRecord,
	type MockReferenceRecord,
	type MockWorkspaceRecord,
	mockDb,
} from "./mock-db";

// Mock of the workspace REST contract in docs/workspace-api-contract.md, enforcing
// the Authorization Model so UI states for 401/403/404/409 can be exercised.

const api = (path: string) => `*/api${path}`;

const SEARCH_RESULT_LIMIT = 50;

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

type BlockAccess = "AVAILABLE" | "LOCKED" | "UNAVAILABLE";

/**
 * Re-checks course access on every read (FR-RR-05): the viewer needs the
 * lecturer role on the course or a current enrollment, and the course must be
 * Published and not suspended.
 */
function blockAccess(
	block: MockCourseBlockRecord,
	userId: string,
): BlockAccess {
	const course = mockDb.courses.find((entry) => entry.id === block.courseId);
	if (!course) return "UNAVAILABLE";
	const enrolled = mockDb.enrollments.some(
		(entry) =>
			entry.userId === userId &&
			entry.courseId === course.id &&
			entry.status !== "LEFT",
	);
	if (course.lecturerId !== userId && !enrolled) return "LOCKED";
	if (course.status !== "PUBLISHED" || course.isSuspended) return "UNAVAILABLE";
	return "AVAILABLE";
}

function isReferenceable(block: MockCourseBlockRecord) {
	return block.type === "FILE" || block.type === "VIDEO";
}

function toReferencedBlock(block: MockCourseBlockRecord): ReferencedBlock {
	const course = mockDb.courses.find((entry) => entry.id === block.courseId);
	return {
		id: block.id,
		type: block.type === "VIDEO" ? "VIDEO" : "FILE",
		title: block.title,
		courseId: block.courseId,
		courseTitle: course?.title ?? "",
		durationSeconds: block.content?.durationSeconds ?? null,
	};
}

function toReference(
	record: MockReferenceRecord,
	userId: string,
): CourseReference {
	const base = {
		id: record.id,
		pageId: record.pageId,
		createdAt: record.createdAt,
	};
	const block = mockDb.courseBlocks.find(
		(entry) => entry.id === record.courseBlockId,
	);
	const access = block ? blockAccess(block, userId) : "UNAVAILABLE";
	if (!block || access !== "AVAILABLE") {
		// Locked references carry no block metadata (NFR-VAL-02).
		return { ...base, status: access === "LOCKED" ? "LOCKED" : "UNAVAILABLE" };
	}
	return {
		...base,
		status: "AVAILABLE",
		block: toReferencedBlock(block),
		timestampSeconds: record.timestampSeconds,
	};
}

/** Text of an editor document: every string `text` field, in order. */
function contentText(content: unknown): string {
	if (!content || typeof content !== "object") return "";
	if (Array.isArray(content)) return content.map(contentText).join(" ");
	const record = content as Record<string, unknown>;
	return Object.entries(record)
		.map(([key, value]) =>
			key === "text" && typeof value === "string" ? value : contentText(value),
		)
		.filter(Boolean)
		.join(" ");
}

function snippetAround(text: string, index: number, length: number) {
	const radius = 60;
	const start = Math.max(0, index - radius);
	const end = Math.min(text.length, index + length + radius);
	return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/** Pages in the caller's active workspaces, as hits without snippets. */
function accessiblePages(userId: string) {
	return mockDb.pages.flatMap((page) => {
		const workspace = mockDb.workspaces.find(
			(entry) => entry.id === page.workspaceId,
		);
		if (
			!workspace ||
			workspace.archivedAt ||
			!membershipOf(workspace.id, userId)
		) {
			return [];
		}
		const path: string[] = [];
		let parentId = page.parentPageId;
		while (parentId) {
			const parent = mockDb.pages.find((entry) => entry.id === parentId);
			if (!parent) break;
			path.unshift(parent.title);
			parentId = parent.parentPageId;
		}
		const hit: PageHit = {
			page: toPageSummary(page),
			workspace: {
				id: workspace.id,
				name: workspace.name,
				type: workspace.type,
			},
			path,
			snippet: null,
		};
		return [{ hit, content: page.content }];
	});
}

function toMessage(record: MockMessageRecord): PageMessage {
	const sender = mockDb.users.find((user) => user.id === record.senderId);
	return {
		id: record.id,
		pageId: record.pageId,
		sender: {
			id: record.senderId,
			firstName: sender?.firstName ?? null,
			lastName: sender?.lastName ?? null,
		},
		content: record.content,
		createdAt: record.createdAt,
	};
}

const byUpdatedAt = (a: PageHit, b: PageHit) =>
	b.page.updatedAt.localeCompare(a.page.updatedAt);

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
			if (access.workspace.archivedAt) {
				return error(409, "Restore the workspace before editing it");
			}

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

	http.get(api("/pages/:pageId/references"), ({ request, params }) => {
		const access = resolvePage(request, String(params.pageId));
		if (!access.ok) return access.response;
		return HttpResponse.json(
			mockDb.references
				.filter((reference) => reference.pageId === access.page.id)
				.map((reference) => toReference(reference, access.userId)),
		);
	}),

	http.post(api("/pages/:pageId/references"), async ({ request, params }) => {
		const access = resolvePage(request, String(params.pageId));
		if (!access.ok) return access.response;
		if (access.workspace.archivedAt) {
			return error(409, "Restore the workspace before editing it");
		}

		const body = (await request.json()) as Partial<CreateReferenceInput>;
		const block = mockDb.courseBlocks.find(
			(entry) => entry.id === body.courseBlockId,
		);
		// Blocks the caller cannot access look the same as missing ones.
		if (
			!block ||
			!isReferenceable(block) ||
			blockAccess(block, access.userId) !== "AVAILABLE"
		) {
			return error(404, "Course material is not available");
		}

		const timestamp = body.timestampSeconds ?? null;
		if (timestamp !== null) {
			const duration = block.content?.durationSeconds;
			if (
				block.type !== "VIDEO" ||
				!Number.isInteger(timestamp) ||
				timestamp < 0 ||
				(duration !== undefined && timestamp > duration)
			) {
				return error(400, "timestampSeconds is outside the video");
			}
		}

		const record: MockReferenceRecord = {
			id: `ref-${crypto.randomUUID()}`,
			pageId: access.page.id,
			courseBlockId: block.id,
			timestampSeconds: timestamp,
			createdAt: now(),
		};
		mockDb.references.push(record);
		return HttpResponse.json(toReference(record, access.userId), {
			status: 201,
		});
	}),

	http.delete(api("/references/:referenceId"), ({ request, params }) => {
		const record = mockDb.references.find(
			(entry) => entry.id === String(params.referenceId),
		);
		if (!record) {
			return currentUserId(request)
				? error(404, "Reference not found")
				: error(401, "Unauthorized");
		}
		const access = resolvePage(request, record.pageId);
		if (!access.ok) {
			return access.response.status === 404
				? error(404, "Reference not found")
				: access.response;
		}
		if (access.workspace.archivedAt) {
			return error(409, "Restore the workspace before editing it");
		}
		mockDb.references = mockDb.references.filter((entry) => entry !== record);
		return new HttpResponse(null, { status: 204 });
	}),

	http.get(api("/reference-sources"), ({ request }) => {
		const userId = currentUserId(request);
		if (!userId) return error(401, "Unauthorized");

		const params = new URL(request.url).searchParams;
		const type = params.get("type");
		if (type !== "FILE" && type !== "VIDEO") {
			return error(400, "type must be FILE or VIDEO");
		}
		const query = params.get("q")?.trim().toLowerCase() ?? "";
		return HttpResponse.json(
			mockDb.courseBlocks
				.filter(
					(block) =>
						block.type === type && blockAccess(block, userId) === "AVAILABLE",
				)
				.map(toReferencedBlock)
				.filter(
					(block) =>
						!query ||
						block.title.toLowerCase().includes(query) ||
						block.courseTitle.toLowerCase().includes(query),
				),
		);
	}),

	http.get(api("/search/pages"), ({ request }) => {
		const userId = currentUserId(request);
		if (!userId) return error(401, "Unauthorized");
		const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
		if (query.length < 2) return error(400, "q must be at least 2 characters");

		const needle = query.toLowerCase();
		const titleHits: PageHit[] = [];
		const contentHits: PageHit[] = [];
		for (const { hit, content } of accessiblePages(userId)) {
			const text = contentText(content);
			const index = text.toLowerCase().indexOf(needle);
			const withSnippet =
				index >= 0
					? { ...hit, snippet: snippetAround(text, index, needle.length) }
					: hit;
			if (hit.page.title.toLowerCase().includes(needle)) {
				titleHits.push(withSnippet);
			} else if (index >= 0) {
				contentHits.push(withSnippet);
			}
		}
		return HttpResponse.json(
			[...titleHits.sort(byUpdatedAt), ...contentHits.sort(byUpdatedAt)].slice(
				0,
				SEARCH_RESULT_LIMIT,
			),
		);
	}),

	http.get(api("/recent-pages"), ({ request }) => {
		const userId = currentUserId(request);
		if (!userId) return error(401, "Unauthorized");
		const limit = Number(new URL(request.url).searchParams.get("limit") ?? 5);
		if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
			return error(400, "limit must be a whole number from 1 to 20");
		}
		return HttpResponse.json(
			accessiblePages(userId)
				.map(({ hit }) => hit)
				.sort(byUpdatedAt)
				.slice(0, limit),
		);
	}),

	http.get(api("/pages/:pageId/messages"), ({ request, params }) => {
		const access = resolvePage(request, String(params.pageId));
		if (!access.ok) return access.response;
		if (access.workspace.type === "PERSONAL") {
			return error(409, "The personal workspace has no discussion");
		}
		return HttpResponse.json(
			mockDb.messages
				.filter((message) => message.pageId === access.page.id)
				.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
				.map(toMessage),
		);
	}),

	http.post(api("/pages/:pageId/messages"), async ({ request, params }) => {
		const access = resolvePage(request, String(params.pageId));
		if (!access.ok) return access.response;
		if (access.workspace.type === "PERSONAL") {
			return error(409, "The personal workspace has no discussion");
		}
		if (access.workspace.archivedAt) {
			return error(409, "Restore the workspace before editing it");
		}
		const body = (await request.json()) as Partial<CreateMessageInput>;
		if (!validName(body.content, 2000)) {
			return error(400, "content must be 1 to 2000 characters");
		}
		const record: MockMessageRecord = {
			id: `msg-${crypto.randomUUID()}`,
			pageId: access.page.id,
			senderId: access.userId,
			content: body.content.trim(),
			createdAt: now(),
		};
		mockDb.messages.push(record);
		return HttpResponse.json(toMessage(record), { status: 201 });
	}),

	http.post(api("/reports"), async ({ request }) => {
		const userId = currentUserId(request);
		if (!userId) return error(401, "Unauthorized");
		const body = (await request.json()) as Partial<CreateReportInput>;
		if (body.targetType !== "MESSAGE" || !validName(body.reason, 100)) {
			return error(400, "targetType and reason are required");
		}
		const message = mockDb.messages.find((entry) => entry.id === body.targetId);
		const page = message
			? mockDb.pages.find((entry) => entry.id === message.pageId)
			: undefined;
		// Only members who can see the message can report it.
		if (!message || !page || !membershipOf(page.workspaceId, userId)) {
			return error(404, "Message not found");
		}
		if (message.senderId === userId) {
			return error(400, "You cannot report your own message");
		}
		const report = {
			id: `report-${crypto.randomUUID()}`,
			reporterId: userId,
			targetType: "MESSAGE" as const,
			targetId: message.id,
			reason: body.reason.trim(),
			description: body.description?.trim() || null,
			status: "PENDING" as const,
			createdAt: now(),
		};
		mockDb.reports.push(report);
		return HttpResponse.json(
			{ id: report.id, status: report.status },
			{ status: 201 },
		);
	}),
];
