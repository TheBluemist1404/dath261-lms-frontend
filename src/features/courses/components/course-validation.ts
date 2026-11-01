import type { CourseFormData, CourseFormErrors } from "../types/course.types";

export function validateCourse(form: CourseFormData): CourseFormErrors {
	const errors: CourseFormErrors = {};
	if (!form.title.trim()) errors.title = "Course title is required.";
	if (form.title.trim().length > 150)
		errors.title = "Course title must be 150 characters or fewer.";
	if (
		form.enrollmentStartAt &&
		form.enrollmentEndAt &&
		form.enrollmentEndAt < form.enrollmentStartAt
	) {
		errors.enrollmentEndAt =
			"Enrollment end must be on or after the enrollment start.";
	}
	return errors;
}
