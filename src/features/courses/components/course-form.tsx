import { type FormEvent, useEffect, useState } from "react";
import type {
	Course,
	CourseFormData,
	CourseInput,
	CourseStatus,
} from "../types/course.types";
import { validateCourse } from "./course-validation";

interface CourseFormProps {
	mode: "create" | "edit";
	initialCourse?: Course | null;
	busy?: boolean;
	error?: string | null;
	onSubmit: (input: CourseInput) => Promise<void> | void;
	onCancel: () => void;
}

const emptyForm: CourseFormData = {
	title: "",
	description: "",
	prerequisites: "",
	status: "DRAFT",
	enrollmentStartAt: "",
	enrollmentEndAt: "",
};

function toFormData(course?: Course | null): CourseFormData {
	if (!course) return { ...emptyForm };
	return {
		title: course.title ?? "",
		description: course.description ?? "",
		prerequisites: course.prerequisites ?? "",
		status: course.status,
		enrollmentStartAt: course.enrollmentStartAt?.slice(0, 10) ?? "",
		enrollmentEndAt: course.enrollmentEndAt?.slice(0, 10) ?? "",
	};
}

const fieldClass =
	"mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const labelClass = "block text-sm font-semibold text-ink";
const errorClass = "mt-1 text-sm text-error";

export default function CourseForm({
	mode,
	initialCourse = null,
	busy = false,
	error,
	onSubmit,
	onCancel,
}: CourseFormProps) {
	const [form, setForm] = useState<CourseFormData>(() =>
		toFormData(initialCourse),
	);
	const [errors, setErrors] = useState<
		Partial<Record<keyof CourseFormData, string>>
	>({});

	useEffect(() => {
		setForm(toFormData(initialCourse));
		setErrors({});
	}, [initialCourse]);

	function change<K extends keyof CourseFormData>(
		key: K,
		value: CourseFormData[K],
	) {
		setForm((current) => ({ ...current, [key]: value }));
		setErrors((current) => {
			const next = { ...current };
			delete next[key];
			return next;
		});
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const next = validateCourse(form);
		setErrors(next);
		if (Object.keys(next).length) return;
		await onSubmit({
			title: form.title.trim(),
			description: form.description.trim() || null,
			prerequisites: form.prerequisites.trim() || null,
			status: form.status,
			enrollmentStartAt: form.enrollmentStartAt
				? new Date(`${form.enrollmentStartAt}T00:00:00`).toISOString()
				: null,
			enrollmentEndAt: form.enrollmentEndAt
				? new Date(`${form.enrollmentEndAt}T23:59:59`).toISOString()
				: null,
		});
	}

	return (
		<form onSubmit={submit} noValidate className="flex flex-col gap-4">
			<div>
				<label className={labelClass} htmlFor="course-title">
					Course title <span aria-hidden="true">*</span>
				</label>
				<input
					id="course-title"
					className={fieldClass}
					value={form.title}
					maxLength={150}
					required
					disabled={busy}
					onChange={(e) => change("title", e.target.value)}
					aria-invalid={Boolean(errors.title)}
					aria-describedby={errors.title ? "course-title-error" : undefined}
				/>
				{errors.title && (
					<p id="course-title-error" role="alert" className={errorClass}>
						{errors.title}
					</p>
				)}
			</div>
			<div>
				<label className={labelClass} htmlFor="course-description">
					Description
				</label>
				<textarea
					id="course-description"
					className={fieldClass}
					rows={3}
					maxLength={5000}
					value={form.description}
					disabled={busy}
					onChange={(e) => change("description", e.target.value)}
				/>
			</div>
			<div>
				<label className={labelClass} htmlFor="course-prerequisites">
					Prerequisites
				</label>
				<textarea
					id="course-prerequisites"
					className={fieldClass}
					rows={2}
					maxLength={2000}
					value={form.prerequisites}
					disabled={busy}
					onChange={(e) => change("prerequisites", e.target.value)}
				/>
			</div>
			<div>
				<label className={labelClass} htmlFor="course-status">
					Publication status
				</label>
				<select
					id="course-status"
					className={fieldClass}
					value={form.status}
					disabled={busy}
					onChange={(e) => change("status", e.target.value as CourseStatus)}
				>
					<option value="DRAFT">Draft</option>
					<option value="PUBLISHED">Published</option>
				</select>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className={labelClass} htmlFor="enrollment-start">
						Enrollment starts
					</label>
					<input
						id="enrollment-start"
						type="date"
						className={fieldClass}
						value={form.enrollmentStartAt}
						disabled={busy}
						onChange={(e) => change("enrollmentStartAt", e.target.value)}
					/>
				</div>
				<div>
					<label className={labelClass} htmlFor="enrollment-end">
						Enrollment ends
					</label>
					<input
						id="enrollment-end"
						type="date"
						min={form.enrollmentStartAt || undefined}
						className={fieldClass}
						value={form.enrollmentEndAt}
						disabled={busy}
						onChange={(e) => change("enrollmentEndAt", e.target.value)}
						aria-invalid={Boolean(errors.enrollmentEndAt)}
						aria-describedby={
							errors.enrollmentEndAt ? "enrollment-end-error" : undefined
						}
					/>
					{errors.enrollmentEndAt && (
						<p id="enrollment-end-error" role="alert" className={errorClass}>
							{errors.enrollmentEndAt}
						</p>
					)}
				</div>
			</div>
			{error && (
				<p role="alert" className="text-sm text-error">
					{error}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<button
					type="submit"
					disabled={busy}
					className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
				>
					{busy
						? "Saving…"
						: mode === "create"
							? "Create Course"
							: "Save Changes"}
				</button>
				<button
					type="button"
					disabled={busy}
					onClick={onCancel}
					className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-ink hover:bg-subtle"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}
