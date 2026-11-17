import { type FormEvent, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";

import type { ScoringMode } from "../types/quiz.types";

import {
	type QuizConfigValidationErrors,
	validateQuizConfig,
} from "../validation/quiz-validation";

type QuizConfigSource = {
	title: string;
	maxAttempts: number;
	scoringMode: ScoringMode;
	availableFrom: string | null;
	deadline: string | null;
	allowLate: boolean;
};

export interface QuizConfigValues {
	title: string;
	maxAttempts: number;
	scoringMode: ScoringMode;
	availableFrom: string | null;
	deadline: string | null;
	allowLate: boolean;
}

interface QuizConfigFormValues {
	title: string;
	maxAttempts: string;
	scoringMode: ScoringMode;
	availableFrom: string;
	deadline: string;
	allowLate: boolean;
}

interface QuizConfigFormProps {
	initialQuiz: QuizConfigSource | null;

	onSave: (config: QuizConfigValues) => Promise<void> | void;

	titleEditable?: boolean;

	submitLabel?: string;

	onDirtyChange?: (dirty: boolean) => void;
}

const scoringModes: {
	value: ScoringMode;
	label: string;
}[] = [
	{
		value: "HIGHEST",
		label: "Highest score",
	},
	{
		value: "LATEST",
		label: "Latest attempt",
	},
	{
		value: "AVERAGE",
		label: "Average score",
	},
];

const fieldClassName =
	"mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const labelClassName = "block text-sm font-semibold";

const errorClassName = "mt-1 text-sm text-error";

function toLocalDateTime(value: string | null): string {
	if (!value) {
		return "";
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 16);
}

function toFormValues(quiz: QuizConfigSource | null): QuizConfigFormValues {
	return {
		title: quiz?.title ?? "",

		maxAttempts: String(quiz?.maxAttempts ?? 1),

		scoringMode: quiz?.scoringMode ?? "HIGHEST",

		availableFrom: toLocalDateTime(quiz?.availableFrom ?? null),

		deadline: toLocalDateTime(quiz?.deadline ?? null),

		allowLate: quiz?.allowLate ?? false,
	};
}

function toConfigValues(values: QuizConfigFormValues): QuizConfigValues {
	return {
		title: values.title.trim(),

		maxAttempts: Number(values.maxAttempts),

		scoringMode: values.scoringMode,

		availableFrom: values.availableFrom
			? new Date(values.availableFrom).toISOString()
			: null,

		deadline: values.deadline ? new Date(values.deadline).toISOString() : null,

		allowLate: values.allowLate,
	};
}

export function QuizConfigForm({
	initialQuiz,
	onSave,
	titleEditable = true,
	submitLabel = "Save changes",
	onDirtyChange,
}: QuizConfigFormProps) {
	const id = useId();

	const [form, setForm] = useState<QuizConfigFormValues>(() =>
		toFormValues(initialQuiz),
	);

	const [validationErrors, setValidationErrors] =
		useState<QuizConfigValidationErrors>({});

	const [dirty, setDirty] = useState(false);

	const [saving, setSaving] = useState(false);

	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		setForm(toFormValues(initialQuiz));

		setValidationErrors({});

		setDirty(false);

		setSaveError(null);

		onDirtyChange?.(false);
	}, [initialQuiz, onDirtyChange]);

	function updateField<K extends keyof QuizConfigFormValues>(
		field: K,
		value: QuizConfigFormValues[K],
	) {
		const nextForm = {
			...form,
			[field]: value,
		};

		setForm(nextForm);

		setDirty(true);

		onDirtyChange?.(true);

		setSaveError(null);

		setValidationErrors((current) => {
			const next = {
				...current,
			};

			if (field === "title") {
				delete next.title;
			}

			if (field === "maxAttempts") {
				delete next.maxAttempts;
			}

			if (field === "availableFrom" || field === "deadline") {
				delete next.availableFrom;
				delete next.deadline;

				// Re-validate the date range immediately when either
				// date field changes.
				const dateErrors = validateQuizConfig(toConfigValues(nextForm));

				if (dateErrors.availableFrom) {
					next.availableFrom = dateErrors.availableFrom;
				}

				if (dateErrors.deadline) {
					next.deadline = dateErrors.deadline;
				}
			}

			return next;
		});
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const config = toConfigValues(form);

		const errors = validateQuizConfig(config);

		setValidationErrors(errors);

		if (Object.keys(errors).length > 0) {
			return;
		}

		setSaving(true);

		setSaveError(null);

		try {
			await onSave(config);

			setDirty(false);

			onDirtyChange?.(false);
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: "Unable to save quiz configuration.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<form onSubmit={submit} noValidate className="flex flex-col gap-5">
			<div>
				<label className={labelClassName} htmlFor={`${id}-title`}>
					Quiz title
				</label>

				<input
					id={`${id}-title`}
					className={fieldClassName}
					value={form.title}
					readOnly={!titleEditable}
					disabled={saving}
					onChange={(event) => updateField("title", event.target.value)}
					aria-invalid={Boolean(validationErrors.title)}
				/>

				{!titleEditable && (
					<p className="mt-1 text-xs text-muted">
						The existing quiz title is shown here. The config endpoint does not
						update the title.
					</p>
				)}

				{validationErrors.title && (
					<p role="alert" className={errorClassName}>
						{validationErrors.title}
					</p>
				)}
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className={labelClassName} htmlFor={`${id}-attempts`}>
						Maximum attempts
					</label>

					<input
						id={`${id}-attempts`}
						type="number"
						min={1}
						step={1}
						className={fieldClassName}
						value={form.maxAttempts}
						disabled={saving}
						onChange={(event) => updateField("maxAttempts", event.target.value)}
						aria-invalid={Boolean(validationErrors.maxAttempts)}
					/>

					{validationErrors.maxAttempts && (
						<p role="alert" className={errorClassName}>
							{validationErrors.maxAttempts}
						</p>
					)}
				</div>

				<div>
					<label className={labelClassName} htmlFor={`${id}-scoring`}>
						Scoring mode
					</label>

					<select
						id={`${id}-scoring`}
						className={fieldClassName}
						value={form.scoringMode}
						disabled={saving}
						onChange={(event) =>
							updateField("scoringMode", event.target.value as ScoringMode)
						}
					>
						{scoringModes.map((mode) => (
							<option key={mode.value} value={mode.value}>
								{mode.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className={labelClassName} htmlFor={`${id}-available`}>
						Available from
					</label>

					<input
						id={`${id}-available`}
						type="datetime-local"
						className={fieldClassName}
						value={form.availableFrom}
						disabled={saving}
						onChange={(event) =>
							updateField("availableFrom", event.target.value)
						}
					/>

					{validationErrors.availableFrom && (
						<p role="alert" className={errorClassName}>
							{validationErrors.availableFrom}
						</p>
					)}
				</div>

				<div>
					<label className={labelClassName} htmlFor={`${id}-deadline`}>
						Deadline
					</label>

					<input
						id={`${id}-deadline`}
						type="datetime-local"
						className={fieldClassName}
						value={form.deadline}
						disabled={saving}
						onChange={(event) => updateField("deadline", event.target.value)}
					/>

					{validationErrors.deadline && (
						<p role="alert" className={errorClassName}>
							{validationErrors.deadline}
						</p>
					)}
				</div>
			</div>

			<label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-canvas px-3 text-sm font-semibold">
				<input
					type="checkbox"
					checked={form.allowLate}
					disabled={saving}
					onChange={(event) => updateField("allowLate", event.target.checked)}
				/>
				Allow late submissions
			</label>

			{saveError && (
				<p
					role="alert"
					className="rounded-lg border border-error/20 bg-white px-3 py-2 text-sm text-error"
				>
					{saveError}
				</p>
			)}

			<div className="flex justify-end">
				<Button type="submit" disabled={saving || !dirty}>
					{saving ? "Saving…" : submitLabel}
				</Button>
			</div>
		</form>
	);
}
