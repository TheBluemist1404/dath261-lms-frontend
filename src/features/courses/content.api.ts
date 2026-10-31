export type ContentType = "text" | "video";

export interface CourseContent {
	id: string;
	title: string;
	description?: string;
	contentType: ContentType;
	content?: string;
	videoUrl?: string;
	published: boolean;
}

export interface ContentInput {
	title: string;
	description?: string;
	contentType: ContentType;
	content?: string;
	videoUrl?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const message = await response.text().catch(() => "");
		throw new Error(message || `Request failed with status ${response.status}`);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

/**
 * Retrieve all content belonging to a course.
 */
export async function getCourseContent(
	courseId: string,
): Promise<CourseContent[]> {
	const response = await fetch(
		`/api/courses/${encodeURIComponent(courseId)}/content`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		},
	);

	return handleResponse<CourseContent[]>(response);
}

/**
 * Create content for a course.
 */
export async function createContent(
	courseId: string,
	contentData: ContentInput,
): Promise<CourseContent> {
	const response = await fetch(
		`/api/courses/${encodeURIComponent(courseId)}/content`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify(contentData),
		},
	);

	return handleResponse<CourseContent>(response);
}

/**
 * Update existing content.
 */
export async function updateContent(
	contentId: string,
	contentData: Partial<ContentInput>,
): Promise<CourseContent> {
	const response = await fetch(
		`/api/content/${encodeURIComponent(contentId)}`,
		{
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify(contentData),
		},
	);

	return handleResponse<CourseContent>(response);
}

/**
 * Delete existing content.
 */
export async function deleteContent(contentId: string): Promise<void> {
	const response = await fetch(
		`/api/content/${encodeURIComponent(contentId)}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
			},
		},
	);

	await handleResponse<void>(response);
}

/**
 * Change the publication status of content.
 */
export async function updateContentPublication(
	contentId: string,
	published: boolean,
): Promise<CourseContent> {
	const response = await fetch(
		`/api/content/${encodeURIComponent(contentId)}/publication`,
		{
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({ published }),
		},
	);

	return handleResponse<CourseContent>(response);
}
