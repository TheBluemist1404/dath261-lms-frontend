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

export interface MockMessageRecord {
	id: string;
	pageId: string;
	senderId: string;
	content: string;
	createdAt: string;
}

export interface MockReportRecord {
	id: string;
	reporterId: string;
	targetType: "MESSAGE";
	targetId: string;
	reason: string;
	description: string | null;
	status: "PENDING";
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
	messages: MockMessageRecord[];
	reports: MockReportRecord[];
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
		messages: [
			{
				id: "msg-mai-1",
				pageId: "page-group-processes",
				senderId: mai.id,
				content: "The scheduling example helped me understand this.",
				createdAt: "2026-10-22T08:56:00.000Z",
			},
		],
		reports: [],
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

function withContent(
	db: MockDb,
	pageId: string,
	text: string,
	updatedAt: string,
) {
	const target = db.pages.find((entry) => entry.id === pageId);
	if (!target) throw new Error(`No seed page ${pageId}`);
	target.content = { type: "plain-text", text };
	target.updatedAt = updatedAt;
}

function createSeedDbWithContent(): MockDb {
	const db = createSeedDb();
	withContent(
		db,
		"page-processes",
		"A process is a program in execution. My notes remain mine even if course access ends.",
		"2026-10-22T09:00:00.000Z",
	);
	withContent(
		db,
		"page-group-processes",
		"Shared summary: each process has its own address space, threads share it.",
		"2026-10-21T15:30:00.000Z",
	);
	withContent(
		db,
		"page-sources",
		"Silberschatz chapter 3 covers process creation with fork and exec.",
		"2026-10-21T10:00:00.000Z",
	);
	return db;
}

export const mockDb: MockDb = createSeedDbWithContent();

/** Restores the seed data; call between tests that mutate mock state. */
export function resetMockDb() {
	Object.assign(mockDb, createSeedDbWithContent());
}
