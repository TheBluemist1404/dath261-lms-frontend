import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CourseBlockForm } from "./course-block-form";

afterEach(() => cleanup());

describe("CourseBlockForm", () => {
	it("requires a title and does not submit invalid blocks", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<CourseBlockForm
				courseId="course-1"
				mode="create"
				position={0}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Add block" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Title is required.",
		);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("creates a TEXT block using Markdown content", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<CourseBlockForm
				courseId="course-1"
				mode="create"
				parentModuleId="module-1"
				position={0}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
			/>,
		);

		await user.type(screen.getByLabelText("Title *"), "Introduction");
		await user.type(
			screen.getByLabelText("Markdown content *"),
			"## Hello\n\nWelcome to the course.",
		);

		await user.click(screen.getByRole("button", { name: "Add block" }));

		expect(onSubmit).toHaveBeenCalledWith({
			courseId: "course-1",
			title: "Introduction",
			type: "TEXT",
			content: {
				text: "## Hello\n\nWelcome to the course.",
			},
			parentModuleId: "module-1",
			position: 0,
		});
	});

	it("requires TEXT content", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<CourseBlockForm
				courseId="course-1"
				mode="create"
				parentModuleId="module-1"
				position={0}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
			/>,
		);

		await user.type(screen.getByLabelText("Title *"), "Reading");
		await user.click(screen.getByRole("button", { name: "Add block" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Text content is required.",
		);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("creates a VIDEO block with optional duration", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<CourseBlockForm
				courseId="course-1"
				mode="create"
				parentModuleId="module-1"
				position={1}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
			/>,
		);

		await user.type(screen.getByLabelText("Title *"), "Lecture video");
		await user.selectOptions(screen.getByLabelText("Block type"), "VIDEO");

		await user.type(
			screen.getByLabelText("Video URL *"),
			"https://example.com/video.mp4",
		);

		await user.type(screen.getByLabelText("Duration (seconds)"), "600");

		await user.click(screen.getByRole("button", { name: "Add block" }));

		expect(onSubmit).toHaveBeenCalledWith({
			courseId: "course-1",
			title: "Lecture video",
			type: "VIDEO",
			content: {
				url: "https://example.com/video.mp4",
				durationSeconds: 600,
			},
			parentModuleId: "module-1",
			position: 1,
		});
	});

	it("rejects an invalid VIDEO URL", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<CourseBlockForm
				courseId="course-1"
				mode="create"
				parentModuleId="module-1"
				position={0}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
			/>,
		);

		await user.type(screen.getByLabelText("Title *"), "Video");
		await user.selectOptions(screen.getByLabelText("Block type"), "VIDEO");

		await user.type(screen.getByLabelText("Video URL *"), "not-a-url");

		await user.click(screen.getByRole("button", { name: "Add block" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Video URL must be a valid HTTP or HTTPS URL.",
		);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("creates a FILE block with optional size", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<CourseBlockForm
				courseId="course-1"
				mode="create"
				parentModuleId="module-1"
				position={2}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
			/>,
		);

		await user.type(screen.getByLabelText("Title *"), "Lecture slides");
		await user.selectOptions(screen.getByLabelText("Block type"), "FILE");

		await user.type(
			screen.getByLabelText("File URL *"),
			"https://example.com/slides.pdf",
		);

		await user.type(screen.getByLabelText("File name *"), "slides.pdf");

		await user.type(screen.getByLabelText("Size (bytes)"), "123456");

		await user.click(screen.getByRole("button", { name: "Add block" }));

		expect(onSubmit).toHaveBeenCalledWith({
			courseId: "course-1",
			title: "Lecture slides",
			type: "FILE",
			content: {
				url: "https://example.com/slides.pdf",
				fileName: "slides.pdf",
				sizeBytes: 123456,
			},
			parentModuleId: "module-1",
			position: 2,
		});
	});

	it("requires a FILE name", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(
			<CourseBlockForm
				courseId="course-1"
				mode="create"
				parentModuleId="module-1"
				position={0}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
			/>,
		);

		await user.type(screen.getByLabelText("Title *"), "Slides");
		await user.selectOptions(screen.getByLabelText("Block type"), "FILE");

		await user.type(
			screen.getByLabelText("File URL *"),
			"https://example.com/slides.pdf",
		);

		await user.click(screen.getByRole("button", { name: "Add block" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"File name is required.",
		);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("populates the correct fields when editing a TEXT block", async () => {
		render(
			<CourseBlockForm
				courseId="course-1"
				mode="edit"
				initialBlock={{
					id: "block-1",
					courseId: "course-1",
					type: "TEXT",
					title: "Existing lesson",
					parentModuleId: "module-1",
					position: 0,
					content: {
						text: "## Existing Markdown",
					},
				}}
				position={0}
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("Title *")).toHaveValue("Existing lesson");
		expect(screen.getByLabelText("Markdown content *")).toHaveValue(
			"## Existing Markdown",
		);
	});

	it("populates the correct fields when editing a VIDEO block", async () => {
		render(
			<CourseBlockForm
				courseId="course-1"
				mode="edit"
				initialBlock={{
					id: "block-1",
					courseId: "course-1",
					type: "VIDEO",
					title: "Existing video",
					parentModuleId: "module-1",
					position: 0,
					content: {
						url: "https://example.com/video.mp4",
						durationSeconds: 540,
					},
				}}
				position={0}
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("Video URL *")).toHaveValue(
			"https://example.com/video.mp4",
		);
		expect(screen.getByLabelText("Duration (seconds)")).toHaveValue(540);
	});

	it("populates the correct fields when editing a FILE block", async () => {
		render(
			<CourseBlockForm
				courseId="course-1"
				mode="edit"
				initialBlock={{
					id: "block-1",
					courseId: "course-1",
					type: "FILE",
					title: "Existing file",
					parentModuleId: "module-1",
					position: 0,
					content: {
						url: "https://example.com/lecture.pdf",
						fileName: "lecture.pdf",
						sizeBytes: 123456,
					},
				}}
				position={0}
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("File URL *")).toHaveValue(
			"https://example.com/lecture.pdf",
		);
		expect(screen.getByLabelText("File name *")).toHaveValue("lecture.pdf");
		expect(screen.getByLabelText("Size (bytes)")).toHaveValue(123456);
	});

	it("does not allow QUIZ or ASSIGNMENT to be selected", async () => {
		render(
			<CourseBlockForm
				courseId="course-1"
				mode="create"
				parentModuleId="module-1"
				position={0}
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		expect(screen.getByRole("option", { name: /Quiz/ })).toBeDisabled();

		expect(screen.getByRole("option", { name: /Assignment/ })).toBeDisabled();
	});
});
