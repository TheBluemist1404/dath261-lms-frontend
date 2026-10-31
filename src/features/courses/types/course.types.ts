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
	_count?: { enrollments?: number };
	/** Optional flattened count if the API serializes it directly. */
	learnerCount?: number;
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
