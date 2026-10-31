export type CourseBlockType =
	| "MODULE"
	| "TEXT"
	| "FILE"
	| "VIDEO"
	| "QUIZ"
	| "ASSIGNMENT";

/** CourseBlock mirrors the backend model; content is a type-specific JSON payload. */
export interface CourseBlock {
	id: string;
	courseId: string;
	type: CourseBlockType;
	title: string;
	parentModuleId: string | null;
	position: number;
	content: Record<string, unknown> | null;
	children?: CourseBlock[];
	createdAt?: string;
	updatedAt?: string;
}

export interface CourseBlockInput {
	courseId: string;
	type: CourseBlockType;
	title: string;
	parentModuleId?: string | null;
	position?: number;
	content?: Record<string, unknown> | null;
}
