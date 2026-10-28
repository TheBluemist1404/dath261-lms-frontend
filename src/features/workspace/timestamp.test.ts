import { describe, expect, it } from "vitest";
import { formatTimestamp, parseTimestamp } from "./timestamp";

describe("parseTimestamp", () => {
	it.each([
		["4:32", 272],
		["0:00", 0],
		["75:10", 4510],
		["1:02:03", 3723],
		[" 12:05 ", 725],
	])("parses %s", (input, seconds) => {
		expect(parseTimestamp(input)).toBe(seconds);
	});

	it.each([
		"",
		"99:99",
		"4:60",
		"1:60:00",
		"4.32",
		"432",
		"-1:00",
		"a:bc",
	])("rejects %j", (input) => {
		expect(parseTimestamp(input)).toBeNull();
	});
});

describe("formatTimestamp", () => {
	it.each([
		[272, "4:32"],
		[5, "0:05"],
		[3600, "1:00:00"],
		[3723, "1:02:03"],
	])("formats %d", (seconds, text) => {
		expect(formatTimestamp(seconds)).toBe(text);
	});
});
