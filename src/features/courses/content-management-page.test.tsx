import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContentForm } from "./content/content-form";
import type { ContentFormData } from "./content/content-validation";
import { LessonList } from "./content/lesson-list";
import {
	createContent,
	deleteContent,
	getCourseContent,
	updateContent,
	updateContentPublication,
} from "./content.api";
import CourseDetailPage from "./course-detail-page";

// CourseDetailPage reads the ID from TanStack Router and loads course details
// through the existing course service. Mock only that external boundary.
const { getCourseMock, useParamsMock } = vi.hoisted(() => ({
	getCourseMock: vi.fn(),
	useParamsMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useParams: useParamsMock,
}));

vi.mock("../../course-service", () => ({
	getCourse: getCourseMock,
}));

const courseFixture = {
	id: "course-1",
	title: "Introduction to Programming",
	courseCode: "CS101",
	description: "Learn programming fundamentals.",
	schoolYear: "2026-2027",
	semester: "Semester 1",
	courseStartDate: "2026-09-01",
	courseEndDate: "2027-01-15",
	teachingAssistants: [],
	published: true,
};

const contentFixture = {
	id: "content-1",
	title: "Variables and Types",
	description: "An introduction to variables.",
	contentType: "text" as const,
	content: "A variable stores a value.",
	published: false,
};

function makeResponse(body: unknown, status = 200): Response {
	return new Response(status === 204 ? null : JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("Content management workflow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useParamsMock.mockReturnValue({ courseId: "course-1" });
		getCourseMock.mockResolvedValue(courseFixture);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("course details", () => {
		it("loads and displays the course details", async () => {
			render(<CourseDetailPage />);

			expect(
				await screen.findByRole("heading", {
					name: "Introduction to Programming",
				}),
			).toBeInTheDocument();
			expect(screen.getByText("Course code: CS101")).toBeInTheDocument();
			expect(
				screen.getByText("Learn programming fundamentals."),
			).toBeInTheDocument();
			expect(screen.getByText(/School year:\s*2026-2027/)).toBeInTheDocument();
			expect(screen.getByText(/Semester:\s*Semester 1/)).toBeInTheDocument();
			expect(screen.getByText("Published")).toBeInTheDocument();
			expect(getCourseMock).toHaveBeenCalledWith("course-1");
		});

		it("shows an error and retry button when loading the course fails", async () => {
			getCourseMock.mockRejectedValueOnce(new Error("Network error"));
			render(<CourseDetailPage />);

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Unable to load course details.",
			);
			expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
		});
	});

	describe("content form", () => {
		it("starts with empty fields and blocks invalid text content", async () => {
			const user = userEvent.setup();
			const onSubmit = vi.fn<(_data: ContentFormData) => Promise<void>>();
			const onCancel = vi.fn();

			render(
				<ContentForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />,
			);

			expect(screen.getByLabelText("Title")).toHaveValue("");
			expect(screen.getByLabelText("Description")).toHaveValue("");
			expect(screen.getByLabelText("Content type")).toHaveValue("text");
			expect(screen.getByLabelText("Text content")).toHaveValue("");

			await user.click(screen.getByRole("button", { name: "Save" }));

			expect(await screen.findByText("Title is required.")).toBeInTheDocument();
			expect(screen.getByText("Text content is required.")).toBeInTheDocument();
			expect(onSubmit).not.toHaveBeenCalled();
		});

		it("submits valid text content", async () => {
			const user = userEvent.setup();
			const onSubmit = vi
				.fn<(_data: ContentFormData) => Promise<void>>()
				.mockResolvedValue();

			render(
				<ContentForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />,
			);

			await user.type(screen.getByLabelText("Title"), "Variables and Types");
			await user.type(screen.getByLabelText("Description"), "Introduction");
			await user.type(
				screen.getByLabelText("Text content"),
				"A variable stores a value.",
			);
			await user.click(screen.getByRole("button", { name: "Save" }));

			await waitFor(() =>
				expect(onSubmit).toHaveBeenCalledWith({
					title: "Variables and Types",
					description: "Introduction",
					contentType: "text",
					text: "A variable stores a value.",
					videoUrl: "",
				}),
			);
		});

		it("validates video URLs and submits a valid URL", async () => {
			const user = userEvent.setup();
			const onSubmit = vi
				.fn<(_data: ContentFormData) => Promise<void>>()
				.mockResolvedValue();

			render(
				<ContentForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />,
			);

			await user.type(screen.getByLabelText("Title"), "Course introduction");
			await user.selectOptions(screen.getByLabelText("Content type"), "video");
			await user.type(screen.getByLabelText("Video URL"), "not-a-url");
			await user.click(screen.getByRole("button", { name: "Save" }));

			expect(
				await screen.findByText("Enter a valid video URL."),
			).toBeInTheDocument();
			expect(onSubmit).not.toHaveBeenCalled();

			await user.clear(screen.getByLabelText("Video URL"));
			await user.type(
				screen.getByLabelText("Video URL"),
				"https://example.com/video",
			);
			await user.click(screen.getByRole("button", { name: "Save" }));

			await waitFor(() =>
				expect(onSubmit).toHaveBeenCalledWith({
					title: "Course introduction",
					description: "",
					contentType: "video",
					text: "",
					videoUrl: "https://example.com/video",
				}),
			);
		});

		it("populates existing values in edit mode and supports cancellation", async () => {
			const user = userEvent.setup();
			const onCancel = vi.fn();

			render(
				<ContentForm
					mode="edit"
					initialContent={{
						title: contentFixture.title,
						description: contentFixture.description,
						contentType: "text",
						text: contentFixture.content,
					}}
					onSubmit={vi.fn().mockResolvedValue(undefined)}
					onCancel={onCancel}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: "Edit Content" }),
			).toBeInTheDocument();
			expect(screen.getByLabelText("Title")).toHaveValue("Variables and Types");
			expect(screen.getByLabelText("Description")).toHaveValue(
				"An introduction to variables.",
			);
			expect(screen.getByLabelText("Text content")).toHaveValue(
				"A variable stores a value.",
			);

			await user.click(screen.getByRole("button", { name: "Cancel" }));
			expect(onCancel).toHaveBeenCalledOnce();
		});

		it("shows a save error when the submit handler rejects", async () => {
			const user = userEvent.setup();
			const onSubmit = vi.fn().mockRejectedValue(new Error("API failure"));

			render(
				<ContentForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />,
			);
			await user.type(screen.getByLabelText("Title"), "Valid title");
			await user.type(screen.getByLabelText("Text content"), "Valid content");
			await user.click(screen.getByRole("button", { name: "Save" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Unable to save content. Please try again.",
			);
		});
	});

	describe("lesson list", () => {
		it("displays lessons and calls the correct action handlers", async () => {
			const user = userEvent.setup();
			const onCreateLesson = vi.fn();
			const onEditLesson = vi.fn();
			const onDeleteLesson = vi.fn();
			const onTogglePublishLesson = vi.fn();

			render(
				<LessonList
					lessons={[
						{
							id: contentFixture.id,
							title: contentFixture.title,
							description: contentFixture.description,
							contentType: "text",
							content: contentFixture.content,
							isPublished: false,
						},
					]}
					loading={false}
					error={null}
					onCreateLesson={onCreateLesson}
					onEditLesson={onEditLesson}
					onDeleteLesson={onDeleteLesson}
					onTogglePublishLesson={onTogglePublishLesson}
				/>,
			);

			const lesson = screen.getByRole("article");
			expect(
				within(lesson).getByRole("heading", { name: "Variables and Types" }),
			).toBeInTheDocument();
			expect(
				within(lesson).getByText("A variable stores a value."),
			).toBeInTheDocument();
			expect(within(lesson).getByText("Draft")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Create Lesson" }));
			await user.click(within(lesson).getByRole("button", { name: "Edit" }));
			await user.click(within(lesson).getByRole("button", { name: "Delete" }));
			await user.click(within(lesson).getByRole("button", { name: "Publish" }));

			expect(onCreateLesson).toHaveBeenCalledOnce();
			expect(onEditLesson).toHaveBeenCalledWith("content-1");
			expect(onDeleteLesson).toHaveBeenCalledWith("content-1");
			expect(onTogglePublishLesson).toHaveBeenCalledWith("content-1", true);
		});
	});

	describe("content API", () => {
		beforeEach(() => {
			vi.stubGlobal("fetch", vi.fn());
		});

		it("requests course content", async () => {
			vi.mocked(fetch).mockResolvedValueOnce(makeResponse([contentFixture]));

			await expect(getCourseContent("course-1")).resolves.toEqual([
				contentFixture,
			]);
			expect(fetch).toHaveBeenCalledWith("/api/courses/course-1/content", {
				method: "GET",
				headers: { Accept: "application/json" },
			});
		});

		it("sends a creation request with the supplied content", async () => {
			vi.mocked(fetch).mockResolvedValueOnce(makeResponse(contentFixture, 201));
			const input = {
				title: "Variables and Types",
				description: "Introduction",
				contentType: "text" as const,
				content: "A variable stores a value.",
			};

			await expect(createContent("course-1", input)).resolves.toEqual(
				contentFixture,
			);
			expect(fetch).toHaveBeenCalledWith(
				"/api/courses/course-1/content",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(input),
				}),
			);
		});

		it("sends update, delete, and publication requests", async () => {
			const fetchMock = vi.mocked(fetch);
			fetchMock
				.mockResolvedValueOnce(makeResponse(contentFixture))
				.mockResolvedValueOnce(makeResponse(undefined, 204))
				.mockResolvedValueOnce(
					makeResponse({ ...contentFixture, published: true }),
				);

			await updateContent("content-1", { title: "Updated title" });
			await deleteContent("content-1");
			await updateContentPublication("content-1", true);

			expect(fetchMock).toHaveBeenNthCalledWith(
				1,
				"/api/content/content-1",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ title: "Updated title" }),
				}),
			);
			expect(fetchMock).toHaveBeenNthCalledWith(
				2,
				"/api/content/content-1",
				expect.objectContaining({
					method: "DELETE",
				}),
			);
			expect(fetchMock).toHaveBeenNthCalledWith(
				3,
				"/api/content/content-1/publication",
				expect.objectContaining({
					method: "PATCH",
					body: JSON.stringify({ published: true }),
				}),
			);
		});

		it("rejects a failed publication request", async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				new Response("Publication failed", { status: 500 }),
			);

			await expect(updateContentPublication("content-1", true)).rejects.toThrow(
				"Publication failed",
			);
		});
	});
});
