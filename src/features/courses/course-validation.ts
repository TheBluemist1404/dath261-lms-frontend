import type { Course, CourseFormData, CourseFormErrors } from "./course-types";

export function validateCourse(
	formData: CourseFormData,
	existingCourses: Course[],
	editingCourseId?: string,
): CourseFormErrors {
	const errors: CourseFormErrors = {};

	// Required fields
	const requiredFields: Array<{
		field: "title" | "courseCode" | "description" | "schoolYear" | "semester";
		message: string;
	}> = [
		{ field: "title", message: "Course title is required." },
		{ field: "courseCode", message: "Course code is required." },
		{ field: "description", message: "Course description is required." },
		{ field: "schoolYear", message: "School year is required." },
		{ field: "semester", message: "Semester is required." },
	];

	for (const { field, message } of requiredFields) {
		if (!formData[field].trim()) {
			errors[field] = message;
		}
	}

	// Course code must be unique, excluding the course being edited.
	const normalizedCode = formData.courseCode.trim().toLowerCase();

	if (
		normalizedCode &&
		existingCourses.some(
			(course) =>
				course.id !== editingCourseId &&
				course.courseCode.trim().toLowerCase() === normalizedCode,
		)
	) {
		errors.courseCode = "This course code is already in use.";
	}

	// End date must not be earlier than start date.
	const startDate = formData.courseStartDate.trim();
	const endDate = formData.courseEndDate.trim();

	if (startDate && endDate && endDate < startDate) {
		errors.courseEndDate = "End date cannot be earlier than start date.";
	}

	return errors;
}
