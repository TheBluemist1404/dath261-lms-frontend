import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetEnrollmentMockState } from "@/mocks/enrollments.handlers";
import { signInForTest } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/render";
import { StudentQuizPlayer } from "./student-quiz-player";

let cleanupAuth: (() => void) | null = null;

describe("StudentQuizPlayer", () => {
	beforeEach(() => {
		resetEnrollmentMockState();
		cleanupAuth = signInForTest("student-1", "STUDENT");
	});

	afterEach(() => {
		cleanupAuth?.();
		cleanupAuth = null;
	});

	it("completes all four question types, submits attempt, and withholds answer keys when results are unreleased", async () => {
		const { user } = renderWithProviders(
			<StudentQuizPlayer courseId="course-intro-cs" blockId="block-1-3" />,
		);

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "System Call Knowledge Check",
			}),
		).toBeInTheDocument();
		expect(screen.getByText("Attempts used: 0 / 3")).toBeInTheDocument();
		expect(screen.getByText("4 questions")).toBeInTheDocument();
		expect(screen.getByText("Scoring mode: HIGHEST")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Start quiz" }));

		await user.click(screen.getByRole("radio", { name: "fork()" }));
		await user.click(
			screen.getByRole("checkbox", {
				name: "Executing a system call trap instruction",
			}),
		);
		await user.click(
			screen.getByRole("checkbox", { name: "A hardware timer interrupt" }),
		);
		await user.click(
			screen.getByRole("checkbox", { name: "A page fault exception" }),
		);
		await user.click(screen.getByRole("radio", { name: "False" }));
		await user.type(
			screen.getByRole("textbox", { name: /cpu execution mode/i }),
			"kernel mode",
		);

		expect(screen.getByText("4 of 4 questions answered")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Review & submit" }));

		const dialog = screen.getByRole("dialog", { name: "Submit your quiz?" });
		expect(
			within(dialog).getByText(
				/4 of 4 questions answered\. Submitting uses attempt 1 of 3\./i,
			),
		).toBeInTheDocument();

		await user.click(
			within(dialog).getByRole("button", { name: "Submit quiz" }),
		);

		expect(await screen.findByText("Score: 100%")).toBeInTheDocument();
		expect(screen.getByText("Attempt #1 submitted.")).toBeInTheDocument();
		expect(screen.getByText("Attempts used: 1 / 3")).toBeInTheDocument();
		expect(screen.getByText("Attempt #1")).toBeInTheDocument();
		expect(
			screen.getByText(/once the lecturer releases results/i),
		).toBeInTheDocument();
		expect(screen.queryByText(/Correct answer:/i)).not.toBeInTheDocument();
		expect(screen.queryByText("Question Breakdown")).not.toBeInTheDocument();
		expect(screen.queryByText("supervisor mode")).not.toBeInTheDocument();
	});

	it("shows per-question breakdown with answers when results are released and lets student switch attempts", async () => {
		const { user } = renderWithProviders(
			<StudentQuizPlayer courseId="course-intro-cs" blockId="quiz-released" />,
		);

		await user.click(await screen.findByRole("button", { name: "Start quiz" }));

		await user.click(screen.getByRole("radio", { name: "Shortest Job First" }));
		await user.click(screen.getByRole("checkbox", { name: "Heap memory" }));
		await user.click(screen.getByRole("radio", { name: "False" }));
		await user.type(
			screen.getByRole("textbox", { name: /synchronization primitive/i }),
			"  SEMAPHORE ",
		);

		await user.click(screen.getByRole("button", { name: "Review & submit" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Submit quiz",
			}),
		);

		expect(await screen.findByText("Score: 66.67%")).toBeInTheDocument();
		expect(screen.getByText("Question Breakdown")).toBeInTheDocument();
		expect(
			screen.getByText("Heap memory, Open file descriptors"),
		).toBeInTheDocument();
		expect(
			screen.getByText("semaphore, counting semaphore"),
		).toBeInTheDocument();
		expect(screen.getByText("0 / 20 pts")).toBeInTheDocument();
		expect(screen.getByText("Incorrect")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Retake quiz" }));
		await user.click(screen.getByRole("radio", { name: "Shortest Job First" }));
		await user.click(screen.getByRole("checkbox", { name: "Heap memory" }));
		await user.click(
			screen.getByRole("checkbox", { name: "Open file descriptors" }),
		);
		await user.click(screen.getByRole("radio", { name: "False" }));
		await user.type(
			screen.getByRole("textbox", { name: /synchronization primitive/i }),
			"semaphore",
		);
		await user.click(screen.getByRole("button", { name: "Review & submit" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Submit quiz",
			}),
		);

		expect(await screen.findByText("Score: 100%")).toBeInTheDocument();
		expect(screen.getByText("Attempt #2 of 3")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Inspect" }));
		expect(screen.getByText("Score: 66.67%")).toBeInTheDocument();
		expect(screen.getByText("Attempt #1 of 3")).toBeInTheDocument();
	});

	it("blocks starting exhausted quizzes and displays 409 conflict alerts on submit", async () => {
		const exhaustedRender = renderWithProviders(
			<StudentQuizPlayer courseId="course-intro-cs" blockId="quiz-exhausted" />,
		);

		expect(
			await screen.findByText("All 1 attempts have been used."),
		).toBeInTheDocument();
		expect(screen.getByText("Score: 75%")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /start quiz|retake quiz/i }),
		).not.toBeInTheDocument();

		exhaustedRender.unmount();

		const { user } = renderWithProviders(
			<StudentQuizPlayer courseId="course-intro-cs" blockId="block-1-3" />,
		);

		await user.click(await screen.findByRole("button", { name: "Start quiz" }));
		await user.click(screen.getByRole("radio", { name: "fork()" }));
		await user.click(screen.getByRole("button", { name: "Review & submit" }));

		server.use(
			http.post("*/api/courses/:courseId/quizzes/:blockId/attempts", () => {
				return HttpResponse.json(
					{ message: "Maximum number of attempts (3) has been reached." },
					{ status: 409 },
				);
			}),
		);

		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Submit quiz",
			}),
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Maximum number of attempts (3) has been reached.",
		);
	});

	it("renders Quiz Not Available Yet when student endpoint returns 403", async () => {
		renderWithProviders(
			<StudentQuizPlayer
				courseId="course-intro-cs"
				blockId="quiz-not-available"
			/>,
		);

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "Quiz Not Available Yet",
			}),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /start quiz/i }),
		).not.toBeInTheDocument();
	});

	it("blocks past deadline quizzes when late is disallowed and flags late submissions when allowed", async () => {
		const blockedRender = renderWithProviders(
			<StudentQuizPlayer
				courseId="course-intro-cs"
				blockId="quiz-late-blocked"
			/>,
		);

		expect(
			await screen.findByText(
				"Deadline passed. Late submissions are not accepted.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /start quiz/i }),
		).not.toBeInTheDocument();

		blockedRender.unmount();

		const { user } = renderWithProviders(
			<StudentQuizPlayer
				courseId="course-intro-cs"
				blockId="quiz-late-allowed"
			/>,
		);

		expect(
			await screen.findByText(
				/The deadline has passed\. Late submissions are accepted/i,
			),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Start quiz" }));
		await user.click(screen.getByRole("radio", { name: "True" }));
		await user.click(screen.getByRole("radio", { name: "Quantum" }));
		await user.click(screen.getByRole("button", { name: "Review & submit" }));
		await user.click(
			within(screen.getByRole("dialog")).getByRole("button", {
				name: "Submit quiz",
			}),
		);

		expect(await screen.findByText("Score: 100%")).toBeInTheDocument();
		expect(screen.getAllByText("Late").length).toBeGreaterThanOrEqual(1);
	});

	it("shows inline error alert when loading attempt history fails", async () => {
		server.use(
			http.get("*/api/courses/:courseId/quizzes/:blockId/my-attempts", () => {
				return HttpResponse.json(
					{ message: "Attempts service unavailable." },
					{ status: 500 },
				);
			}),
		);

		renderWithProviders(
			<StudentQuizPlayer courseId="course-intro-cs" blockId="block-1-3" />,
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Attempts service unavailable.",
		);
		expect(
			screen.queryByRole("button", { name: /start quiz/i }),
		).not.toBeInTheDocument();
	});
});
