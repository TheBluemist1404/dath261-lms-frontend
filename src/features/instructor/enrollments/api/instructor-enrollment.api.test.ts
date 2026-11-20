import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http/client";
import {
	completeEnrollment,
	getCourseRoster,
	getStudentProgress,
} from "./instructor-enrollment.api";

vi.mock("@/lib/http/client", () => ({
	httpClient: {
		get: vi.fn(),
		patch: vi.fn(),
	},
}));

afterEach(() => {
	vi.clearAllMocks();
});

describe("instructor enrollment API", () => {
	it("requests the lecturer roster with filters and abort signal", async () => {
		const response = {
			data: {
				data: [],
				meta: {
					total: 0,
					page: 2,
					limit: 20,
					totalPages: 1,
					hasNextPage: false,
					hasPreviousPage: true,
				},
			},
		};

		vi.mocked(httpClient.get).mockResolvedValue(response as never);
		const signal = new AbortController().signal;

		expect(
			await getCourseRoster(
				"course-1",
				{
					status: "ACTIVE",
					search: "john",
					page: 2,
					limit: 20,
				},
				signal,
			),
		).toEqual(response.data);

		expect(httpClient.get).toHaveBeenCalledWith(
			"/courses/course-1/enrollments",
			{
				params: {
					status: "ACTIVE",
					search: "john",
					page: 2,
					limit: 20,
				},
				signal,
			},
		);
	});

	it("sends PATCH to complete an enrollment", async () => {
		const response = {
			data: {
				enrollmentId: "enrollment-1",
				status: "COMPLETED",
				completedAt: "2026-11-20T03:00:00.000Z",
			},
		};

		vi.mocked(httpClient.patch).mockResolvedValue(response as never);

		expect(await completeEnrollment("course-1", "enrollment-1")).toEqual(
			response.data,
		);

		expect(httpClient.patch).toHaveBeenCalledWith(
			"/courses/course-1/enrollments/enrollment-1/complete",
		);
	});

	it("requests lecturer progress for one enrollment", async () => {
		const response = {
			data: {
				enrollment: {
					id: "enrollment-1",
					status: "ACTIVE",
				},
			},
		};

		vi.mocked(httpClient.get).mockResolvedValue(response as never);

		expect(await getStudentProgress("course-1", "enrollment-1")).toEqual(
			response.data,
		);

		expect(httpClient.get).toHaveBeenCalledWith(
			"/courses/course-1/enrollments/enrollment-1/progress",
			{ signal: undefined },
		);
	});
});
