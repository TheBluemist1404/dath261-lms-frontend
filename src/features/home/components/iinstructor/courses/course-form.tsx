import { type FormEvent, useEffect, useState } from "react";

export interface Course {
	id: string;
	schoolYear: string;
	semester: string;
	title: string;
	courseCode: string;
	description: string;
	courseStartDate: string;
	courseEndDate: string;
	teachingAssistants: string[];
	published: boolean;
}

export type CourseFormMode = "create" | "edit";

export interface CourseFormData {
	schoolYear: string;
	semester: string;
	title: string;
	courseCode: string;
	description: string;
	courseStartDate: string;
	courseEndDate: string;
	teachingAssistants: string;
}

interface CourseFormProps {
	mode: CourseFormMode;
	initialCourse?: Course | null;
	onSubmit: (course: Omit<Course, "id" | "published">) => void;
	onCancel: () => void;
}

const emptyForm: CourseFormData = {
	schoolYear: "",
	semester: "",
	title: "",
	courseCode: "",
	description: "",
	courseStartDate: "",
	courseEndDate: "",
	teachingAssistants: "",
};

type FormField = keyof CourseFormData;
type FormErrors = Partial<Record<FormField | "form", string>>;

function toFormData(course?: Course | null): CourseFormData {
	if (!course) {
		return { ...emptyForm };
	}

	return {
		schoolYear: course.schoolYear,
		semester: course.semester,
		title: course.title,
		courseCode: course.courseCode,
		description: course.description,
		courseStartDate: course.courseStartDate,
		courseEndDate: course.courseEndDate,
		teachingAssistants: course.teachingAssistants.join(", "),
	};
}

export default function CourseForm({
	mode,
	initialCourse = null,
	onSubmit,
	onCancel,
}: CourseFormProps) {
	const [formData, setFormData] = useState<CourseFormData>(() =>
		toFormData(initialCourse),
	);
	const [errors, setErrors] = useState<FormErrors>({});

	// Refresh the fields when the selected course or form mode changes.
	useEffect(() => {
		setFormData(toFormData(initialCourse));
		setErrors({});
	}, [initialCourse]);

	function handleChange(field: FormField, value: string) {
		setFormData((current) => ({ ...current, [field]: value }));

		setErrors((current) => {
			const next = { ...current };
			delete next[field];
			delete next.form;
			return next;
		});
	}

	function validate(): FormErrors {
		const nextErrors: FormErrors = {};

		if (!formData.schoolYear.trim()) {
			nextErrors.schoolYear = "School year is required.";
		}
		if (!formData.semester) {
			nextErrors.semester = "Please select a semester.";
		}
		if (!formData.title.trim()) {
			nextErrors.title = "Course title is required.";
		}
		if (!formData.courseCode.trim()) {
			nextErrors.courseCode = "Course code is required.";
		}
		if (!formData.description.trim()) {
			nextErrors.description = "Course description is required.";
		}
		if (
			formData.courseStartDate &&
			formData.courseEndDate &&
			formData.courseEndDate < formData.courseStartDate
		) {
			nextErrors.courseEndDate = "End date must be on or after the start date.";
		}

		return nextErrors;
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const validationErrors = validate();
		setErrors(validationErrors);

		if (Object.keys(validationErrors).length > 0) {
			return;
		}

		// Convert form strings into the course data structure expected by the parent.
		onSubmit({
			schoolYear: formData.schoolYear.trim(),
			semester: formData.semester.trim(),
			title: formData.title.trim(),
			courseCode: formData.courseCode.trim(),
			description: formData.description.trim(),
			courseStartDate: formData.courseStartDate,
			courseEndDate: formData.courseEndDate,
			teachingAssistants: formData.teachingAssistants
				.split(",")
				.map((assistant) => assistant.trim())
				.filter(Boolean),
		});
	}

	const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2";
	const errorClass = "mt-1 text-sm text-red-600";

	return (
		<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label
						htmlFor="course-school-year"
						className="mb-1 block font-medium"
					>
						School year *
					</label>
					<input
						id="course-school-year"
						type="text"
						value={formData.schoolYear}
						onChange={(event) => handleChange("schoolYear", event.target.value)}
						aria-invalid={Boolean(errors.schoolYear)}
						aria-describedby={
							errors.schoolYear ? "school-year-error" : undefined
						}
						className={inputClass}
						placeholder="e.g. 2026-2027"
					/>
					{errors.schoolYear && (
						<p id="school-year-error" className={errorClass} role="alert">
							{errors.schoolYear}
						</p>
					)}
				</div>

				<div>
					<label htmlFor="course-semester" className="mb-1 block font-medium">
						Semester *
					</label>
					<select
						id="course-semester"
						value={formData.semester}
						onChange={(event) => handleChange("semester", event.target.value)}
						aria-invalid={Boolean(errors.semester)}
						className={inputClass}
					>
						<option value="">Select semester</option>
						<option value="Semester 1">Semester 1</option>
						<option value="Semester 2">Semester 2</option>
						<option value="Summer">Summer</option>
					</select>
					{errors.semester && (
						<p className={errorClass} role="alert">
							{errors.semester}
						</p>
					)}
				</div>

				<div>
					<label htmlFor="course-title" className="mb-1 block font-medium">
						Course title *
					</label>
					<input
						id="course-title"
						type="text"
						maxLength={150}
						value={formData.title}
						onChange={(event) => handleChange("title", event.target.value)}
						aria-invalid={Boolean(errors.title)}
						className={inputClass}
						placeholder="Enter course title"
					/>
					{errors.title && (
						<p className={errorClass} role="alert">
							{errors.title}
						</p>
					)}
				</div>

				<div>
					<label htmlFor="course-code" className="mb-1 block font-medium">
						Course code *
					</label>
					<input
						id="course-code"
						type="text"
						maxLength={30}
						value={formData.courseCode}
						onChange={(event) => handleChange("courseCode", event.target.value)}
						aria-invalid={Boolean(errors.courseCode)}
						className={inputClass}
						placeholder="e.g. CS101"
					/>
					{errors.courseCode && (
						<p className={errorClass} role="alert">
							{errors.courseCode}
						</p>
					)}
				</div>

				<div>
					<label htmlFor="course-start-date" className="mb-1 block font-medium">
						Start date
					</label>
					<input
						id="course-start-date"
						type="date"
						value={formData.courseStartDate}
						onChange={(event) =>
							handleChange("courseStartDate", event.target.value)
						}
						className={inputClass}
					/>
				</div>

				<div>
					<label htmlFor="course-end-date" className="mb-1 block font-medium">
						End date
					</label>
					<input
						id="course-end-date"
						type="date"
						min={formData.courseStartDate || undefined}
						value={formData.courseEndDate}
						onChange={(event) =>
							handleChange("courseEndDate", event.target.value)
						}
						aria-invalid={Boolean(errors.courseEndDate)}
						className={inputClass}
					/>
					{errors.courseEndDate && (
						<p className={errorClass} role="alert">
							{errors.courseEndDate}
						</p>
					)}
				</div>
			</div>

			<div>
				<label htmlFor="course-description" className="mb-1 block font-medium">
					Description *
				</label>
				<textarea
					id="course-description"
					rows={4}
					maxLength={2000}
					value={formData.description}
					onChange={(event) => handleChange("description", event.target.value)}
					aria-invalid={Boolean(errors.description)}
					className={inputClass}
					placeholder="Describe what students will learn..."
				/>
				{errors.description && (
					<p className={errorClass} role="alert">
						{errors.description}
					</p>
				)}
			</div>

			<div>
				<label
					htmlFor="course-teaching-assistants"
					className="mb-1 block font-medium"
				>
					Teaching assistants
				</label>
				<input
					id="course-teaching-assistants"
					type="text"
					value={formData.teachingAssistants}
					onChange={(event) =>
						handleChange("teachingAssistants", event.target.value)
					}
					className={inputClass}
					placeholder="Enter names separated by commas"
				/>
				<p className="mt-1 text-xs text-gray-500">
					Separate multiple names with commas.
				</p>
			</div>

			{errors.form && (
				<p role="alert" className={errorClass}>
					{errors.form}
				</p>
			)}

			<div className="flex flex-wrap gap-2">
				<button
					type="submit"
					className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
				>
					{mode === "create" ? "Create Course" : "Save Changes"}
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}
