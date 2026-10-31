import { describe, expect, it } from "vitest";
import type { CourseFormData } from "../types/course.types";
import { validateCourse } from "./course-validation";

const validForm: CourseFormData = {
	title: "Software Engineering",
	description: "Intro",
	prerequisites: "",
	status: "DRAFT",
	enrollmentStartAt: "2026-09-01",
	enrollmentEndAt: "2026-10-01",
};

describe("validateCourse", () => {
	it("requires a title", () =>
		expect(validateCourse({ ...validForm, title: "  " }).title).toBe(
			"Course title is required.",
		));
	it("rejects titles that exceed the model form limit", () =>
		expect(
			validateCourse({ ...validForm, title: "x".repeat(151) }).title,
		).toContain("150 characters"));
	it("rejects an enrollment end before its start", () =>
		expect(
			validateCourse({ ...validForm, enrollmentEndAt: "2026-08-31" })
				.enrollmentEndAt,
		).toContain("on or after"));
	it("accepts valid optional fields", () =>
		expect(validateCourse(validForm)).toEqual({}));
});
