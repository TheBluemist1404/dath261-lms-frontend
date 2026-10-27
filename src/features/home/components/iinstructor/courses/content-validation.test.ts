import { describe, expect, it } from "vitest";
import {
	type ContentFormData,
	validateContent,
} from "./content/content-validation";

function makeContent(
	overrides: Partial<ContentFormData> = {},
): ContentFormData {
	return {
		title: "Introduction",
		description: "",
		contentType: "text",
		text: "Welcome to the course",
		videoUrl: "",
		...overrides,
	};
}

describe("validateContent", () => {
	it("returns an error when the title is empty", () => {
		const errors = validateContent(makeContent({ title: "" }));

		expect(errors).toHaveProperty("title");
	});

	it("does not require a description under the current validation rules", () => {
		const errors = validateContent(makeContent({ description: "" }));

		expect(errors).not.toHaveProperty("description");
	});

	it("accepts valid text content", () => {
		const errors = validateContent(makeContent());

		expect(errors).toEqual({});
	});

	it("returns an error when required text is missing", () => {
		const errors = validateContent(makeContent({ text: "" }));

		expect(errors).toHaveProperty("text");
	});

	it("returns an error when the video URL is missing", () => {
		const errors = validateContent(
			makeContent({ contentType: "video", videoUrl: "" }),
		);

		expect(errors).toHaveProperty("videoUrl");
	});

	it("returns an error when the video URL is malformed", () => {
		const errors = validateContent(
			makeContent({
				contentType: "video",
				videoUrl: "not-a-valid-url",
			}),
		);

		expect(errors).toHaveProperty("videoUrl");
	});

	it("rejects URL schemes other than HTTP and HTTPS", () => {
		const errors = validateContent(
			makeContent({
				contentType: "video",
				videoUrl: "javascript:alert(1)",
			}),
		);

		expect(errors).toHaveProperty("videoUrl");
	});

	it("accepts a valid HTTPS video URL", () => {
		const errors = validateContent(
			makeContent({
				contentType: "video",
				videoUrl: "https://example.com/video",
			}),
		);

		expect(errors).toEqual({});
	});

	it("accepts a valid HTTP video URL", () => {
		const errors = validateContent(
			makeContent({
				contentType: "video",
				videoUrl: "http://example.com/video",
			}),
		);

		expect(errors).toEqual({});
	});

	it("returns no errors for a valid form", () => {
		expect(validateContent(makeContent())).toEqual({});
	});
});
