import type { AuthUser } from "../types";

export const mockStudent: AuthUser = {
	id: "student-1",
	name: "Alex Learner",
	email: "alex@nodus.edu",
	role: "student",
};

export const mockLecturer: AuthUser = {
	id: "lecturer-1",
	name: "Dr. Elena Rostova",
	email: "elena@nodus.edu",
	role: "lecturer",
};

export const mockAdmin: AuthUser = {
	id: "admin-1",
	name: "System Admin",
	email: "admin@nodus.edu",
	role: "admin",
};
