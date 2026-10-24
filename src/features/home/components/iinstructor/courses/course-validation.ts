import type { Course, CourseFormData, CourseFormErrors } from "./course-types";

export function validateCourse(
	formData: CourseFormData,
	existingCourses: Course[],
	editingCourseId?: string,
): CourseFormErrors {
	const errors: CourseFormErrors = {};

	// Required fields
	if (!formData.title?.trim()) {
		errors.title = "Course title is required.";
	}

	if (!formData.courseCode?.trim()) {
		errors.courseCode = "Course code is required.";
	}

	if (!formData.description?.trim()) {
		errors.description = "Course description is required.";
	}

	if (!formData.schoolYear?.trim()) {
		errors.schoolYear = "School year is required.";
	}

	if (!formData.semester?.trim()) {
		errors.semester = "Semester is required.";
	}

	if (!formData.courseStartDate?.trim()) {
		errors.courseStartDate = "Start date is required.";
	}

	if (!formData.courseEndDate?.trim()) {
		errors.courseEndDate = "End date is required.";
	}

	// Course code must be unique, excluding the course being edited.
	const normalizedCode = formData.courseCode?.trim().toLowerCase();

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
	const startDate = formData.courseStartDate?.trim();
	const endDate = formData.courseEndDate?.trim();

	if (startDate && endDate && endDate < startDate) {
		errors.courseEndDate = "End date cannot be earlier than start date.";
	}

	return errors;
}
