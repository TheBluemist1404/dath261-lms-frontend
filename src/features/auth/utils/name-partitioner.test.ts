import { describe, expect, it } from "vitest";
import { NameValidationError, partitionFullName } from "./name-partitioner";

describe("partitionFullName", () => {
	it("partitions standard two-word name", () => {
		expect(partitionFullName("Alex Le")).toEqual({
			firstName: "Alex",
			lastName: "Le",
		});
	});

	it("partitions multi-word name deterministically on the first space", () => {
		expect(partitionFullName("Alex Van Le")).toEqual({
			firstName: "Alex",
			lastName: "Van Le",
		});
		expect(partitionFullName("Nguyễn Văn An")).toEqual({
			firstName: "Nguyễn",
			lastName: "Văn An",
		});
		expect(partitionFullName("Trần Thị Mai Anh")).toEqual({
			firstName: "Trần",
			lastName: "Thị Mai Anh",
		});
		expect(partitionFullName("John Fitzgerald Kennedy")).toEqual({
			firstName: "John",
			lastName: "Fitzgerald Kennedy",
		});
		expect(partitionFullName("Jean-Luc Picard")).toEqual({
			firstName: "Jean-Luc",
			lastName: "Picard",
		});
	});

	it("sanitizes excessive whitespace and tabs", () => {
		expect(partitionFullName("   Alex    Morgan   ")).toEqual({
			firstName: "Alex",
			lastName: "Morgan",
		});
		expect(partitionFullName("Nguyen     Van     An")).toEqual({
			firstName: "Nguyen",
			lastName: "Van An",
		});
		expect(partitionFullName("Alex\tLe")).toEqual({
			firstName: "Alex",
			lastName: "Le",
		});
	});

	it("rejects mononyms with NameValidationError", () => {
		expect(() => partitionFullName("Plato")).toThrow(NameValidationError);
		expect(() => partitionFullName("Plato")).toThrow(
			"Please enter your full name (both first and last name).",
		);
		expect(() => partitionFullName("Cher")).toThrow(NameValidationError);
		expect(() => partitionFullName("Zendaya")).toThrow(NameValidationError);
		expect(() => partitionFullName("   Plato   ")).toThrow(
			"Please enter your full name (both first and last name).",
		);
	});

	it("rejects empty or whitespace-only inputs", () => {
		expect(() => partitionFullName("")).toThrow(NameValidationError);
		expect(() => partitionFullName("")).toThrow("Full name cannot be empty.");
		expect(() => partitionFullName("   ")).toThrow(NameValidationError);
		expect(() => partitionFullName("   ")).toThrow(
			"Full name cannot be empty.",
		);
		// @ts-expect-error testing invalid type
		expect(() => partitionFullName(null)).toThrow("Full name is required.");
		// @ts-expect-error testing invalid type
		expect(() => partitionFullName(undefined)).toThrow(
			"Full name is required.",
		);
	});

	it("enforces 100 character maximum limit", () => {
		const exact100First = `${"a".repeat(100)} ValidLast`;
		expect(partitionFullName(exact100First)).toEqual({
			firstName: "a".repeat(100),
			lastName: "ValidLast",
		});

		const longFirst = `${"a".repeat(101)} ValidLast`;
		expect(() => partitionFullName(longFirst)).toThrow(NameValidationError);
		expect(() => partitionFullName(longFirst)).toThrow(
			"First name exceeds maximum length of 100 characters.",
		);

		const exact100Last = `ValidFirst ${"b".repeat(100)}`;
		expect(partitionFullName(exact100Last)).toEqual({
			firstName: "ValidFirst",
			lastName: "b".repeat(100),
		});

		const longLast = `ValidFirst ${"b".repeat(101)}`;
		expect(() => partitionFullName(longLast)).toThrow(NameValidationError);
		expect(() => partitionFullName(longLast)).toThrow(
			"Last name exceeds maximum length of 100 characters.",
		);
	});
});
