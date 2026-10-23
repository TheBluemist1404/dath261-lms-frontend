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

export interface MockCourseRecord {
	id: string;
	title: string;
	status: "DRAFT" | "PUBLISHED";
	isSuspended: boolean;
	lecturerId: string;
}

export interface MockCourseBlockRecord {
	id: string;
	courseId: string;
	type: "MODULE" | "TEXT" | "FILE" | "VIDEO" | "QUIZ" | "ASSIGNMENT";
	title: string;
	/** Type-specific payload; videos carry their length. */
	content: { durationSeconds?: number } | null;
}

export interface MockEnrollmentRecord {
	userId: string;
	courseId: string;
	status: "ACTIVE" | "LEFT" | "COMPLETED";
}

export interface MockReferenceRecord {
	id: string;
	pageId: string;
	courseBlockId: string;
	timestampSeconds: number | null;
	createdAt: string;
}

export interface MockDb {
	users: WorkspaceMemberUser[];
	defaultWorkspaceByUser: Record<string, string>;
	workspaces: MockWorkspaceRecord[];
	memberships: MockMembershipRecord[];
	pages: Page[];
	courses: MockCourseRecord[];
	courseBlocks: MockCourseBlockRecord[];
	enrollments: MockEnrollmentRecord[];
	references: MockReferenceRecord[];
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
		courses: [
			{
				id: "course-os",
				title: "Operating Systems",
				status: "PUBLISHED",
				isSuspended: false,
				lecturerId: "user-lecturer",
			},
			{
				id: "course-networks",
				title: "Computer Networks",
				status: "PUBLISHED",
				isSuspended: false,
				lecturerId: "user-lecturer",
			},
			{
				id: "course-databases",
				title: "Database Systems",
				status: "DRAFT",
				isSuspended: false,
				lecturerId: "user-lecturer",
			},
		],
		courseBlocks: [
			{
				id: "block-os-week2",
				courseId: "course-os",
				type: "MODULE",
				title: "Week 2 · Processes",
				content: null,
			},
			{
				id: "block-os-lecture2",
				courseId: "course-os",
				type: "VIDEO",
				title: "Lecture 2 · Processes",
				content: { durationSeconds: 3600 },
			},
			{
				id: "block-os-slides2",
				courseId: "course-os",
				type: "FILE",
				title: "Lecture 2 slides",
				content: null,
			},
			{
				id: "block-os-scheduling",
				courseId: "course-os",
				type: "VIDEO",
				title: "Lecture 3 · CPU scheduling",
				content: { durationSeconds: 2700 },
			},
			{
				id: "block-net-tcp",
				courseId: "course-networks",
				type: "FILE",
				title: "TCP handshake notes",
				content: null,
			},
			{
				id: "block-db-intro",
				courseId: "course-databases",
				type: "VIDEO",
				title: "Relational model",
				content: { durationSeconds: 1800 },
			},
		],
		enrollments: [
			{ userId: alex.id, courseId: "course-os", status: "ACTIVE" },
			{ userId: alex.id, courseId: "course-networks", status: "LEFT" },
			{ userId: alex.id, courseId: "course-databases", status: "ACTIVE" },
			{ userId: mai.id, courseId: "course-networks", status: "ACTIVE" },
		],
		references: [
			{
				id: "ref-processes-video",
				pageId: "page-processes",
				courseBlockId: "block-os-lecture2",
				timestampSeconds: 272,
				createdAt: seededAt,
			},
			{
				id: "ref-processes-slides",
				pageId: "page-processes",
				courseBlockId: "block-os-slides2",
				timestampSeconds: null,
				createdAt: seededAt,
			},
			{
				id: "ref-group-tcp",
				pageId: "page-group-processes",
				courseBlockId: "block-net-tcp",
				timestampSeconds: null,
				createdAt: seededAt,
			},
			{
				id: "ref-group-relational",
				pageId: "page-group-processes",
				courseBlockId: "block-db-intro",
				timestampSeconds: null,
				createdAt: seededAt,
			},
		],
	};
}

export const mockDb: MockDb = createSeedDb();

/** Restores the seed data; call between tests that mutate mock state. */
export function resetMockDb() {
	Object.assign(mockDb, createSeedDb());
}
