import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { getCourse } from "../../course-service";
import type { Course } from "./course-form";

export default function CourseDetailPage() {
	const params = useParams({ strict: false }) as Record<
		string,
		string | undefined
	>;
	const courseId = params.courseId;

	const [course, setCourse] = useState<Course | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadCourse = useCallback(async () => {
		if (!courseId) {
			setCourse(null);
			setError("Course ID is missing.");
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const result = await getCourse(courseId);
			setCourse(result);
		} catch {
			setCourse(null);
			setError("Unable to load course details.");
		} finally {
			setLoading(false);
		}
	}, [courseId]);

	useEffect(() => {
		void loadCourse();
	}, [loadCourse]);

	if (loading) {
		return <p>Loading course...</p>;
	}

	if (error) {
		return (
			<div role="alert">
				<p>{error}</p>
				<button type="button" onClick={() => void loadCourse()}>
					Retry
				</button>
			</div>
		);
	}

	if (!course) {
		return <p>Course not found.</p>;
	}

	return (
		<main>
			<h1>{course.title}</h1>
			<p>Course code: {course.courseCode}</p>
			<p>{course.description}</p>
			<p>School year: {course.schoolYear}</p>
			<p>Semester: {course.semester}</p>
			<p>{course.published ? "Published" : "Draft"}</p>
		</main>
	);
}
