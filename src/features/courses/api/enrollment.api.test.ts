import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http/client";
import {
	enrollInCourse,
	getCourseEnrollmentState,
	getMyEnrollments,
	getResumePosition,
	getStudentProgress,
	leaveCourse,
} from "./enrollment.api";

vi.mock("@/lib/http/client", () => ({
	httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

describe("enrollmentApi", () => {
	it("calls post endpoint and returns active enrollment response", async () => {
		const res = {
			enrollmentId: "enr-1",
			courseId: "c-1",
			status: "ACTIVE",
			canAccessCourse: true,
		};
		vi.mocked(httpClient.post).mockResolvedValue({ data: res } as never);

		expect(await enrollInCourse("c-1")).toEqual(res);
		expect(httpClient.post).toHaveBeenCalledWith("/courses/c-1/enrollments/me");
	});

	it("calls delete endpoint and returns left enrollment response", async () => {
		const res = {
			enrollmentId: "enr-1",
			courseId: "c-1",
			status: "LEFT",
			canAccessCourse: false,
		};
		vi.mocked(httpClient.delete).mockResolvedValue({ data: res } as never);

		expect(await leaveCourse("c-1")).toEqual(res);
		expect(httpClient.delete).toHaveBeenCalledWith(
			"/courses/c-1/enrollments/me",
		);
	});

	it("queries current enrollment status for course", async () => {
		const res = {
			courseId: "c-1",
			enrollmentId: "enr-1",
			enrollmentStatus: "ACTIVE",
			courseAvailable: true,
			canAccessCourse: true,
		};
		vi.mocked(httpClient.get).mockResolvedValue({ data: res } as never);

		const signal = new AbortController().signal;
		expect(await getCourseEnrollmentState("c-1", signal)).toEqual(res);
		expect(httpClient.get).toHaveBeenCalledWith("/courses/c-1/enrollments/me", {
			signal,
		});
	});

	it("queries paginated my enrollments with state filter", async () => {
		const meta = {
			total: 0,
			page: 1,
			limit: 10,
			totalPages: 1,
			hasNextPage: false,
			hasPrevPage: false,
			hasPreviousPage: false,
		};
		vi.mocked(httpClient.get).mockResolvedValue({
			data: { data: [], meta },
		} as never);

		const filters = { page: 2, state: "IN_PROGRESS" as const };
		expect(await getMyEnrollments(filters)).toEqual({ data: [], meta });
		expect(httpClient.get).toHaveBeenCalledWith("/users/me/enrollments", {
			params: filters,
			signal: undefined,
		});
	});

	it("queries resume position and student progress", async () => {
		const resume = {
			hasResumePosition: true,
			lastVisitedAt: null,
			block: null,
			resumeData: null,
		};
		const progress = {
			enrollmentId: "enr-1",
			enrollmentStatus: "ACTIVE",
			progress: {
				totalItems: 5,
				completedItems: 2,
				learningProgressPercentage: 40,
				totalQuizzes: 1,
				completedQuizzes: 0,
				quizCompletionPercentage: 0,
			},
		};
		vi.mocked(httpClient.get)
			.mockResolvedValueOnce({ data: resume } as never)
			.mockResolvedValueOnce({ data: progress } as never);

		expect(await getResumePosition("c-1")).toEqual(resume);
		expect(await getStudentProgress("c-1")).toEqual(progress);
	});
});
