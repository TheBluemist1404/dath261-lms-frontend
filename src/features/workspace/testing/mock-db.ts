import type {
	Page,
	WorkspaceMemberRole,
	WorkspaceMemberUser,
	WorkspaceType,
} from "../types";

// In-memory backend state for MSW. Shapes follow the Prisma models, not the API
// responses; the handlers derive responses (counts, current role) from it.

export interface MockWorkspaceRecord {
	id: string;
	name: string;
	type: WorkspaceType;
	createdById: string;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface MockMembershipRecord {
	workspaceId: string;
	userId: string;
	role: WorkspaceMemberRole;
	joinedAt: string;
}

export interface MockDb {
	users: WorkspaceMemberUser[];
	defaultWorkspaceByUser: Record<string, string>;
	workspaces: MockWorkspaceRecord[];
	memberships: MockMembershipRecord[];
	pages: Page[];
}

export const mockUsers = {
	alex: {
		id: "user-alex",
		email: "alex@example.com",
		firstName: "Alex",
		lastName: "Le",
	},
	mai: {
		id: "user-mai",
		email: "mai@example.com",
		firstName: "Mai",
		lastName: "Tran",
	},
	bao: {
		id: "user-bao",
		email: "bao@example.com",
		firstName: "Bao",
		lastName: "Nguyen",
	},
	vy: {
		id: "user-vy",
		email: "vy.pham@example.com",
		firstName: "Vy",
		lastName: "Pham",
	},
} satisfies Record<string, WorkspaceMemberUser>;

const seededAt = "2026-10-20T08:00:00.000Z";

function page(
	id: string,
	workspaceId: string,
	title: string,
	parentPageId: string | null = null,
): Page {
	return {
		id,
		workspaceId,
		title,
		parentPageId,
		content: null,
		createdAt: seededAt,
		updatedAt: seededAt,
	};
}

export function createSeedDb(): MockDb {
	const { alex, mai, bao, vy } = mockUsers;

	return {
		users: [alex, mai, bao, vy],
		defaultWorkspaceByUser: { [alex.id]: "ws-personal-alex" },
		workspaces: [
			{
				id: "ws-personal-alex",
				name: "My personal workspace",
				type: "PERSONAL",
				createdById: alex.id,
				archivedAt: null,
				createdAt: seededAt,
				updatedAt: seededAt,
			},
			{
				id: "ws-research-journal",
				name: "Research journal",
				type: "COLLABORATIVE",
				createdById: alex.id,
				archivedAt: null,
				createdAt: seededAt,
				updatedAt: seededAt,
			},
			{
				id: "ws-systems-study-group",
				name: "Systems study group",
				type: "COLLABORATIVE",
				createdById: alex.id,
				archivedAt: null,
				createdAt: seededAt,
				updatedAt: seededAt,
			},
			{
				id: "ws-old-project",
				name: "Old project notes",
				type: "COLLABORATIVE",
				createdById: alex.id,
				archivedAt: "2026-10-10T08:00:00.000Z",
				createdAt: seededAt,
				updatedAt: seededAt,
			},
		],
		memberships: [
			{
				workspaceId: "ws-personal-alex",
				userId: alex.id,
				role: "OWNER",
				joinedAt: seededAt,
			},
			{
				workspaceId: "ws-research-journal",
				userId: alex.id,
				role: "OWNER",
				joinedAt: seededAt,
			},
			{
				workspaceId: "ws-systems-study-group",
				userId: alex.id,
				role: "OWNER",
				joinedAt: seededAt,
			},
			{
				workspaceId: "ws-systems-study-group",
				userId: mai.id,
				role: "CO_OWNER",
				joinedAt: seededAt,
			},
			{
				workspaceId: "ws-systems-study-group",
				userId: bao.id,
				role: "MEMBER",
				joinedAt: seededAt,
			},
			{
				workspaceId: "ws-old-project",
				userId: alex.id,
				role: "OWNER",
				joinedAt: seededAt,
			},
		],
		pages: [
			page("page-os-notes", "ws-personal-alex", "Operating systems notes"),
			page(
				"page-processes",
				"ws-personal-alex",
				"Understanding processes",
				"page-os-notes",
			),
			page(
				"page-scheduling",
				"ws-personal-alex",
				"Scheduling examples",
				"page-os-notes",
			),
			page("page-revisit", "ws-personal-alex", "Questions to revisit"),
			page("page-sources", "ws-research-journal", "Reading list"),
			page("page-group-plan", "ws-systems-study-group", "Study plan"),
			page(
				"page-group-processes",
				"ws-systems-study-group",
				"Processes",
				"page-group-plan",
			),
			page("page-old", "ws-old-project", "Archived notes"),
		],
	};
}

export const mockDb: MockDb = createSeedDb();

/** Restores the seed data; call between tests that mutate mock state. */
export function resetMockDb() {
	Object.assign(mockDb, createSeedDb());
}
