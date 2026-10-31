export interface Course {
	id: string;
	title: string;
	description: string;
	courseCode: string;
	schoolYear: string;
	semester: string;
	courseStartDate: string;
	courseEndDate: string;
	teachingAssistants: string[];
	published: boolean;
}

export type CourseInput = Omit<Course, "id" | "published">;

export type CourseUpdateInput = Partial<CourseInput>;

export interface CourseFormData {
	title: string;
	description: string;
	courseCode: string;
	schoolYear: string;
	semester: string;
	courseStartDate: string;
	courseEndDate: string;
	teachingAssistants: string;
}

export type CourseFormErrors = Partial<
	Record<keyof CourseFormData | "form", string>
>;
