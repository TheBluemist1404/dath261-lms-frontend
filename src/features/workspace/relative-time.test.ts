import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const now = Date.parse("2026-10-23T12:00:00.000Z");

describe("formatRelativeTime", () => {
	it.each([
		["2026-10-23T11:59:40.000Z", "just now"],
		["2026-10-23T11:56:00.000Z", "4 minutes ago"],
		["2026-10-23T09:00:00.000Z", "3 hours ago"],
		["2026-10-22T12:00:00.000Z", "yesterday"],
	])("formats %s", (iso, text) => {
		expect(formatRelativeTime(iso, now)).toBe(text);
	});
});
