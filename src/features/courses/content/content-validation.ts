export type ContentType = "text" | "video";

export interface ContentFormData {
	title: string;
	description: string;
	contentType: ContentType;
	text: string;
	videoUrl: string;
}

export type ContentFormErrors = Partial<
	Record<keyof ContentFormData | "form", string>
>;

export function validateContent(formData: ContentFormData): ContentFormErrors {
	const errors: ContentFormErrors = {};

	if (!formData.title.trim()) {
		errors.title = "Title is required.";
	}

	if (formData.contentType === "text" && !formData.text.trim()) {
		errors.text = "Text content is required.";
	}

	if (formData.contentType === "video") {
		const videoUrl = formData.videoUrl.trim();

		if (!videoUrl) {
			errors.videoUrl = "Video URL is required.";
		} else {
			try {
				const url = new URL(videoUrl);

				if (!["http:", "https:"].includes(url.protocol)) {
					errors.videoUrl = "Video URL must use HTTP or HTTPS.";
				}
			} catch {
				errors.videoUrl = "Enter a valid video URL.";
			}
		}
	}

	return errors;
}
