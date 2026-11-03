export type CourseStatus = "DRAFT" | "PUBLISHED";

/** Frontend shape of the backend Prisma Course model. */
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
	lecturer?: { id: string; name: string };
}

/** Pagination block returned with the public catalog (GET /courses/catalog). */
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
