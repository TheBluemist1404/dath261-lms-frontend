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
	it("validates a JSON object for a content block", async () => {
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
		await user.clear(screen.getByLabelText("Content payload (JSON object)"));
		await user.type(
			screen.getByLabelText("Content payload (JSON object)"),
			"[]",
		);
		await user.click(screen.getByRole("button", { name: "Add block" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"valid JSON object",
		);
		expect(onSubmit).not.toHaveBeenCalled();
	});
});
