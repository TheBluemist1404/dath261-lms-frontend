import type { AdminCourse, AdminReport, AdminUser, PersonRef } from "../types";

// Seed data mirrors the sample content of Figma AD-02 to AD-05.

const admin: PersonRef = { id: "admin-1", name: "Admin" };

/** 2026-10-02 at the given ICT (UTC+7) time. */
const oct02 = (hour: number, minute: number) =>
	new Date(Date.UTC(2026, 9, 2, hour - 7, minute)).toISOString();

function seedUsers(): AdminUser[] {
	return [
		{
			id: "user-mai",
			firstName: "Mai",
			lastName: "Tran",
			email: "mai.tran@example.com",
			role: "STUDENT",
			status: "ACTIVE",
			createdAt: "2026-09-21T02:00:00.000Z",
		},
		{
			id: "user-linh",
			firstName: "Dr. Linh",
			lastName: "Nguyen",
			email: "linh.nguyen@example.com",
			role: "LECTURER",
			status: "ACTIVE",
			createdAt: "2026-09-18T02:00:00.000Z",
		},
		{
			id: "user-alex",
			firstName: "Alex",
			lastName: "Le",
			email: "alex.le@example.com",
			role: "STUDENT",
			status: "ACTIVE",
			createdAt: "2026-10-01T02:00:00.000Z",
		},
	];
}

function seedCourses(): AdminCourse[] {
	return [
		{
			id: "course-os",
			title: "Operating Systems",
			status: "PUBLISHED",
			enrollmentCount: 42,
			lecturer: { id: "user-linh", name: "Dr. Linh Nguyen" },
			isSuspended: false,
			createdAt: "2026-08-15T02:00:00.000Z",
		},
		{
			id: "course-db",
			title: "Database Design",
			status: "PUBLISHED",
			enrollmentCount: 28,
			lecturer: { id: "user-hoa", name: "Prof. Hoa Pham" },
			isSuspended: false,
			createdAt: "2026-08-20T02:00:00.000Z",
		},
		{
			id: "course-intro-cs",
			title: "Introduction to Computer Science",
			status: "DRAFT",
			enrollmentCount: 0,
			lecturer: { id: "user-minh", name: "Dr. Minh Tran" },
			isSuspended: false,
			createdAt: "2026-09-25T02:00:00.000Z",
		},
	];
}

const maiTran: PersonRef = { id: "user-mai", name: "Mai Tran" };
const alexLe: PersonRef = { id: "user-alex", name: "Alex Le" };

function received(reportId: string, reporter: PersonRef, createdAt: string) {
	return [
		{
			id: `${reportId}-received`,
			action: "RECEIVED" as const,
			actor: reporter,
			createdAt,
			reasonRecorded: false,
		},
	];
}

/** Figma AD-05 Shared content report. Not in the seeded queue yet. */
export function sharedContentReport(): AdminReport {
	return {
		id: "R-1052",
		status: "PENDING",
		reason: "Inappropriate behavior",
		description: null,
		createdAt: oct02(14, 35),
		reporter: alexLe,
		target: {
			type: "MESSAGE",
			id: "message-1052",
			name: "Systems study group / Discussion",
			available: true,
		},
		message: {
			location: "Systems study group / Discussion",
			author: maiTran,
			content: "Visit my store instead of studying this module.",
		},
		history: received("R-1052", alexLe, oct02(14, 35)),
	};
}

function seedReports(): AdminReport[] {
	return [
		{
			id: "R-1048",
			status: "PENDING",
			reason: "Misleading course information",
			description:
				"The public description promises downloadable examples, but this is unclear in the course preview. Please review the advertised materials.",
			createdAt: oct02(14, 20),
			reporter: maiTran,
			target: {
				type: "COURSE",
				id: "course-os",
				name: "Operating Systems",
				available: true,
			},
			history: received("R-1048", maiTran, oct02(14, 20)),
		},
		{
			id: "R-1047",
			status: "PENDING",
			reason: "Inappropriate behavior",
			description: null,
			createdAt: oct02(9, 5),
			reporter: alexLe,
			target: {
				type: "USER",
				id: "user-bao",
				name: "Bao Nguyen",
				available: true,
			},
			history: received("R-1047", alexLe, oct02(9, 5)),
		},
	];
}

export const mockAdminDb = {
	admin,
	users: seedUsers(),
	courses: seedCourses(),
	reports: seedReports(),
};

export function resetMockAdminDb() {
	mockAdminDb.users = seedUsers();
	mockAdminDb.courses = seedCourses();
	mockAdminDb.reports = seedReports();
}
