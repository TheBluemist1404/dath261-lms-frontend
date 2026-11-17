export type CourseStatus = "DRAFT" | "PUBLISHED";

export interface CourseLecturer {
	id: string;
	name: string;
	email?: string;
}

export interface Course {
	id: string;
	title: string;
	description: string | null;
	prerequisites: string | null;
	status: CourseStatus;
	enrollmentStartAt: string | null;
	enrollmentEndAt: string | null;
	createdAt?: string;
	updatedAt?: string;
	enrollmentCount?: number;
	lecturer?: CourseLecturer;
	isSuspended?: boolean;
}

export function isEnrollmentClosed(course: Course): boolean {
	if (!course.enrollmentEndAt) return false;
	return new Date(course.enrollmentEndAt).getTime() < Date.now();
}

export interface PageMeta {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface CoursePage {
	data: Course[];
	meta: PageMeta;
}

export interface CatalogQuery {
	search?: string;
	lecturerId?: string;
	enrollmentOpen?: boolean;
	sortBy?: "createdAt" | "title" | "enrollmentStartAt";
	sortOrder?: "asc" | "desc";
	page?: number;
	limit?: number;
}

export interface CourseInput {
	title: string;
	description?: string | null;
	prerequisites?: string | null;
	status: CourseStatus;
	enrollmentStartAt?: string | null;
	enrollmentEndAt?: string | null;
}

export type CourseUpdateInput = Partial<CourseInput>;

export interface CourseFormData {
	title: string;
	description: string;
	prerequisites: string;
	status: CourseStatus;
	enrollmentStartAt: string;
	enrollmentEndAt: string;
}

export type CourseFormErrors = Partial<
	Record<keyof CourseFormData | "form", string>
>;
