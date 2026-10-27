import { useEffect, useState } from "react";
import {
	type ContentFormData,
	type ContentFormErrors,
	type ContentType,
	validateContent,
} from "./content-validation";

type ContentFormProps = {
	mode: "create" | "edit";
	initialContent?: Partial<ContentFormData>;
	onSubmit: (data: ContentFormData) => Promise<void>;
	onCancel: () => void;
};

const emptyContent: ContentFormData = {
	title: "",
	description: "",
	contentType: "text",
	text: "",
	videoUrl: "",
};

export function ContentForm({
	mode,
	initialContent,
	onSubmit,
	onCancel,
}: ContentFormProps) {
	const [formData, setFormData] = useState<ContentFormData>(() => ({
		...emptyContent,
		...initialContent,
	}));

	const [errors, setErrors] = useState<ContentFormErrors>({});
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		setFormData({
			...emptyContent,
			...initialContent,
		});
		setErrors({});
	}, [initialContent]);

	function updateField<K extends keyof ContentFormData>(
		field: K,
		value: ContentFormData[K],
	) {
		setFormData((previous) => ({
			...previous,
			[field]: value,
		}));

		setErrors((previous) => {
			const next = { ...previous };
			delete next[field];
			delete next.form;
			return next;
		});
	}

	function handleContentTypeChange(value: ContentType) {
		setFormData((previous) => ({
			...previous,
			contentType: value,
		}));

		setErrors((previous) => {
			const next = { ...previous };
			delete next.contentType;
			delete next.text;
			delete next.videoUrl;
			delete next.form;
			return next;
		});
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (submitting) {
			return;
		}

		const validationErrors = validateContent(formData);

		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}

		setErrors({});
		setSubmitting(true);

		try {
			await onSubmit({ ...formData });
		} catch {
			setErrors({
				form: "Unable to save content. Please try again.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} noValidate>
			<h2>{mode === "create" ? "Create Content" : "Edit Content"}</h2>

			<div>
				<label htmlFor="content-title">Title</label>
				<input
					id="content-title"
					name="title"
					value={formData.title}
					onChange={(event) => updateField("title", event.target.value)}
					aria-invalid={Boolean(errors.title)}
					aria-describedby={errors.title ? "content-title-error" : undefined}
					disabled={submitting}
					required
				/>
				{errors.title && (
					<p id="content-title-error" role="alert">
						{errors.title}
					</p>
				)}
			</div>

			<div>
				<label htmlFor="content-description">Description</label>
				<textarea
					id="content-description"
					name="description"
					value={formData.description}
					onChange={(event) => updateField("description", event.target.value)}
					aria-invalid={Boolean(errors.description)}
					aria-describedby={
						errors.description ? "content-description-error" : undefined
					}
					disabled={submitting}
				/>
				{errors.description && (
					<p id="content-description-error" role="alert">
						{errors.description}
					</p>
				)}
			</div>

			<div>
				<label htmlFor="content-type">Content type</label>
				<select
					id="content-type"
					name="contentType"
					value={formData.contentType}
					onChange={(event) =>
						handleContentTypeChange(event.target.value as ContentType)
					}
					disabled={submitting}
				>
					<option value="text">Text</option>
					<option value="video">Video</option>
				</select>
			</div>

			{formData.contentType === "text" ? (
				<div>
					<label htmlFor="content-text">Text content</label>
					<textarea
						id="content-text"
						name="text"
						value={formData.text}
						onChange={(event) => updateField("text", event.target.value)}
						aria-invalid={Boolean(errors.text)}
						aria-describedby={errors.text ? "content-text-error" : undefined}
						disabled={submitting}
						required
					/>
					{errors.text && (
						<p id="content-text-error" role="alert">
							{errors.text}
						</p>
					)}
				</div>
			) : (
				<div>
					<label htmlFor="content-video-url">Video URL</label>
					<input
						id="content-video-url"
						name="videoUrl"
						type="url"
						value={formData.videoUrl}
						onChange={(event) => updateField("videoUrl", event.target.value)}
						aria-invalid={Boolean(errors.videoUrl)}
						aria-describedby={
							errors.videoUrl ? "content-video-url-error" : undefined
						}
						disabled={submitting}
						required
					/>
					{errors.videoUrl && (
						<p id="content-video-url-error" role="alert">
							{errors.videoUrl}
						</p>
					)}
				</div>
			)}

			{errors.form && <p role="alert">{errors.form}</p>}

			<button type="submit" disabled={submitting}>
				{submitting ? "Saving..." : "Save"}
			</button>

			<button type="button" onClick={onCancel} disabled={submitting}>
				Cancel
			</button>
		</form>
	);
}
