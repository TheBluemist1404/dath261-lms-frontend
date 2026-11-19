import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/errors";
import {
	studentQuizKeys,
	useMyQuizAttempts,
	useStudentQuiz,
	useSubmitQuizAttempt,
} from "../../api/student-quiz.queries";
import type { DraftQuestionAnswer } from "../../types/student-quiz.types";
import {
	buildSubmitAnswersPayload,
	computeAggregatedQuizScore,
	countAnsweredQuestions,
	countUsedQuizAttempts,
	resolveQuizTakeState,
} from "../../utils/student-quiz-domain";
import { QuizAttemptResults } from "./quiz-attempt-results";
import { QuizQuestionCard } from "./quiz-question-card";

export interface StudentQuizPlayerProps {
	courseId: string;
	blockId: string;
	blockTitle?: string;
}

function formatQuizDate(iso: string | null): string {
	if (!iso) return "Not set";
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export function StudentQuizPlayer({
	courseId,
	blockId,
	blockTitle,
}: StudentQuizPlayerProps) {
	const queryClient = useQueryClient();
	const quizQuery = useStudentQuiz(courseId, blockId);
	const attemptsQuery = useMyQuizAttempts(courseId, blockId);
	const submitMutation = useSubmitQuizAttempt(courseId, blockId);

	const [isTaking, setIsTaking] = useState(false);
	const [drafts, setDrafts] = useState<Record<string, DraftQuestionAnswer>>({});
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
		null,
	);
	const [justSubmittedAttemptId, setJustSubmittedAttemptId] = useState<
		string | null
	>(null);

	function handleRetryAll() {
		void quizQuery.refetch();
		void attemptsQuery.refetch();
	}

	if (quizQuery.isLoading) {
		return (
			<output
				aria-label="Loading quiz"
				className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6"
			>
				<div className="h-6 w-56 animate-pulse rounded bg-border" />
				<div className="h-4 w-80 animate-pulse rounded bg-subtle" />
				<div className="h-24 w-full animate-pulse rounded-xl bg-subtle" />
			</output>
		);
	}

	if (quizQuery.isError || !quizQuery.data) {
		const status = getApiErrorStatus(quizQuery.error);
		const message = getApiErrorMessage(
			quizQuery.error,
			"Unable to load this quiz right now. Try again.",
		);

		if (status === 403 && /not available/i.test(message)) {
			return (
				<section className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-white p-6">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-warning-subtle text-warning">
							<Icon name="lock" className="size-5" />
						</div>
						<h2 className="font-heading text-xl font-bold text-ink">
							Quiz Not Available Yet
						</h2>
					</div>
					<p className="text-sm text-muted">
						{message} Check back when the availability window opens.
					</p>
					<Button variant="outline" size="sm" onClick={handleRetryAll}>
						Retry
					</Button>
				</section>
			);
		}

		if (status === 403) {
			return (
				<section className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-white p-6">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-error-subtle text-error">
							<Icon name="lock" className="size-5" />
						</div>
						<h2 className="font-heading text-xl font-bold text-ink">
							Access Restricted
						</h2>
					</div>
					<p className="text-sm text-muted">{message}</p>
					<Button variant="outline" size="sm" onClick={handleRetryAll}>
						Retry
					</Button>
				</section>
			);
		}

		if (status === 404) {
			return (
				<section className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-white p-6">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-subtle text-muted">
							<Icon name="alertCircle" className="size-5" />
						</div>
						<h2 className="font-heading text-xl font-bold text-ink">
							Quiz Not Found
						</h2>
					</div>
					<p className="text-sm text-muted">{message}</p>
				</section>
			);
		}

		return (
			<section
				role="alert"
				className="flex flex-col items-start gap-4 rounded-2xl border border-error/20 bg-error-subtle p-6 text-error"
			>
				<div className="flex items-center gap-2 font-heading text-lg font-bold">
					<Icon name="alertCircle" className="size-5 shrink-0" />
					<h2>Unable to load quiz</h2>
				</div>
				<p className="text-sm">{message}</p>
				<Button variant="primary" size="sm" onClick={handleRetryAll}>
					Retry
				</Button>
			</section>
		);
	}

	const quiz = quizQuery.data;
	const sortedQuestions = [...quiz.questions].sort(
		(a, b) => a.position - b.position,
	);
	const answeredCount = countAnsweredQuestions(sortedQuestions, drafts);
	const submitErrorMessage = submitMutation.isError
		? getApiErrorMessage(
				submitMutation.error,
				"Unable to submit quiz attempt. Try again.",
			)
		: null;

	function handleStartQuiz() {
		submitMutation.reset();
		setDrafts({});
		setJustSubmittedAttemptId(null);
		setIsTaking(true);
	}

	function handleCancelQuiz() {
		submitMutation.reset();
		setDrafts({});
		setConfirmOpen(false);
		setIsTaking(false);
	}

	function handleDraftChange(
		questionId: string,
		nextDraft: DraftQuestionAnswer,
	) {
		setDrafts((prev) => ({
			...prev,
			[questionId]: nextDraft,
		}));
	}

	async function handleConfirmSubmit() {
		const payload = buildSubmitAnswersPayload(sortedQuestions, drafts);
		try {
			const submitted = await submitMutation.mutateAsync(payload);
			setConfirmOpen(false);
			setIsTaking(false);
			setDrafts({});
			setJustSubmittedAttemptId(submitted.id);
			setSelectedAttemptId(submitted.id);
		} catch (error) {
			const status = getApiErrorStatus(error);
			if (status === 409 || status === 403) {
				setConfirmOpen(false);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: studentQuizKeys.attempts(courseId, blockId),
					}),
					queryClient.invalidateQueries({
						queryKey: studentQuizKeys.quiz(courseId, blockId),
					}),
				]);
			}
		}
	}

	const loadedAttempts = attemptsQuery.isSuccess
		? attemptsQuery.data
		: undefined;
	const attemptsUsed = loadedAttempts
		? countUsedQuizAttempts(loadedAttempts)
		: undefined;
	const aggregatedScore = loadedAttempts
		? computeAggregatedQuizScore(loadedAttempts, quiz.scoringMode)
		: null;

	function renderQuizBody() {
		if (attemptsQuery.isLoading) {
			return (
				<output className="block rounded-2xl border border-border bg-white p-6 text-sm text-muted">
					Loading attempt history...
				</output>
			);
		}

		if (attemptsQuery.isError || !attemptsQuery.data) {
			return (
				<div
					role="alert"
					className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-error/20 bg-error-subtle p-5 text-sm text-error"
				>
					<div className="flex items-center gap-2">
						<Icon name="alertCircle" className="size-4 shrink-0" />
						<span>
							{getApiErrorMessage(
								attemptsQuery.error,
								"Failed to load your quiz attempts.",
							)}
						</span>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => void attemptsQuery.refetch()}
					>
						Retry
					</Button>
				</div>
			);
		}

		const attempts = attemptsQuery.data;
		const usedAttempts = attemptsUsed ?? countUsedQuizAttempts(attempts);
		const takeState = resolveQuizTakeState(quiz, usedAttempts);

		return (
			<>
				{submitErrorMessage && !confirmOpen ? (
					<div
						role="alert"
						className="flex items-start gap-2 rounded-xl border border-error/20 bg-error-subtle p-4 text-sm text-error"
					>
						<Icon name="alertCircle" className="mt-0.5 size-4 shrink-0" />
						<span>{submitErrorMessage}</span>
					</div>
				) : null}

				{(() => {
					switch (takeState.kind) {
						case "not_available_yet":
							return (
								<>
									<div className="flex items-start gap-3 rounded-2xl border border-border bg-warning-subtle p-5 text-sm text-warning">
										<Icon name="lock" className="mt-0.5 size-5 shrink-0" />
										<div>
											<p className="font-semibold">Quiz Not Available Yet</p>
											<p className="mt-1">
												Opens on {formatQuizDate(takeState.availableFrom)}.
											</p>
										</div>
									</div>
									{attempts.length > 0 ? (
										<QuizAttemptResults
											attempts={attempts}
											questions={sortedQuestions}
											maxAttempts={quiz.maxAttempts}
											selectedAttemptId={selectedAttemptId}
											justSubmittedAttemptId={justSubmittedAttemptId}
											onSelectAttempt={setSelectedAttemptId}
										/>
									) : null}
								</>
							);

						case "past_deadline_blocked":
							return (
								<>
									<div className="flex items-start gap-3 rounded-2xl border border-error/20 bg-error-subtle p-5 text-sm text-error">
										<Icon
											name="alertTriangle"
											className="mt-0.5 size-5 shrink-0"
										/>
										<div>
											<p className="font-semibold">
												Deadline passed. Late submissions are not accepted.
											</p>
											<p className="mt-1">
												Closed on {formatQuizDate(takeState.deadline)}.
											</p>
										</div>
									</div>
									{attempts.length > 0 ? (
										<QuizAttemptResults
											attempts={attempts}
											questions={sortedQuestions}
											maxAttempts={quiz.maxAttempts}
											selectedAttemptId={selectedAttemptId}
											justSubmittedAttemptId={justSubmittedAttemptId}
											onSelectAttempt={setSelectedAttemptId}
										/>
									) : null}
								</>
							);

						case "no_attempts_left":
							return (
								<>
									<div className="flex items-start gap-3 rounded-2xl border border-border bg-subtle p-5 text-sm text-ink">
										<Icon
											name="alertCircle"
											className="mt-0.5 size-5 shrink-0 text-muted"
										/>
										<p className="font-medium">
											All {takeState.maxAttempts} attempts have been used.
										</p>
									</div>
									{attempts.length > 0 ? (
										<QuizAttemptResults
											attempts={attempts}
											questions={sortedQuestions}
											maxAttempts={quiz.maxAttempts}
											selectedAttemptId={selectedAttemptId}
											justSubmittedAttemptId={justSubmittedAttemptId}
											onSelectAttempt={setSelectedAttemptId}
										/>
									) : null}
								</>
							);

						case "available":
							if (!isTaking) {
								return (
									<>
										{takeState.isLate ? (
											<div className="flex items-start gap-3 rounded-2xl border border-border bg-warning-subtle p-4 text-sm text-warning">
												<Icon
													name="alertTriangle"
													className="mt-0.5 size-4 shrink-0"
												/>
												<p>
													The deadline has passed. Late submissions are accepted
													and will be marked as late.
												</p>
											</div>
										) : null}

										<div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6">
											<p className="text-sm text-muted">
												Answer all {sortedQuestions.length}{" "}
												{sortedQuestions.length === 1
													? "question"
													: "questions"}{" "}
												and review your responses before submitting. You have{" "}
												{takeState.attemptsRemaining} of {quiz.maxAttempts}{" "}
												{quiz.maxAttempts === 1 ? "attempt" : "attempts"}{" "}
												remaining.
											</p>
											<div>
												<Button
													variant="primary"
													onClick={handleStartQuiz}
													disabled={sortedQuestions.length === 0}
												>
													{takeState.attemptsUsed > 0
														? "Retake quiz"
														: "Start quiz"}
												</Button>
											</div>
										</div>

										{attempts.length > 0 ? (
											<QuizAttemptResults
												attempts={attempts}
												questions={sortedQuestions}
												maxAttempts={quiz.maxAttempts}
												selectedAttemptId={selectedAttemptId}
												justSubmittedAttemptId={justSubmittedAttemptId}
												onSelectAttempt={setSelectedAttemptId}
											/>
										) : null}
									</>
								);
							}

							return (
								<div className="flex flex-col gap-4">
									{takeState.isLate ? (
										<div className="flex items-start gap-3 rounded-2xl border border-border bg-warning-subtle p-4 text-sm text-warning">
											<Icon
												name="alertTriangle"
												className="mt-0.5 size-4 shrink-0"
											/>
											<p>
												The deadline has passed. This submission will be flagged
												as late.
											</p>
										</div>
									) : null}

									{sortedQuestions.map((question, index) => (
										<QuizQuestionCard
											key={question.id}
											question={question}
											index={index}
											draft={drafts[question.id]}
											disabled={submitMutation.isPending}
											onChange={(nextDraft) =>
												handleDraftChange(question.id, nextDraft)
											}
										/>
									))}

									<div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
										<span className="text-sm font-medium text-muted">
											{answeredCount} of {sortedQuestions.length} questions
											answered
										</span>

										<div className="flex items-center gap-3">
											<Button
												variant="outline"
												onClick={handleCancelQuiz}
												disabled={submitMutation.isPending}
											>
												Cancel
											</Button>
											<Button
												variant="primary"
												onClick={() => setConfirmOpen(true)}
												disabled={submitMutation.isPending}
											>
												Review & submit
											</Button>
										</div>
									</div>

									<Dialog
										open={confirmOpen}
										onClose={() => {
											if (!submitMutation.isPending) {
												setConfirmOpen(false);
											}
										}}
										title="Submit your quiz?"
										description={`${answeredCount} of ${sortedQuestions.length} questions answered. Submitting uses attempt ${takeState.attemptsUsed + 1} of ${quiz.maxAttempts}.`}
									>
										{answeredCount < sortedQuestions.length ? (
											<p className="rounded-lg border border-border bg-warning-subtle px-3 py-2 text-xs text-warning">
												You have {sortedQuestions.length - answeredCount}{" "}
												unanswered{" "}
												{sortedQuestions.length - answeredCount === 1
													? "question"
													: "questions"}
												. Unanswered questions receive 0 points.
											</p>
										) : null}

										{submitErrorMessage && confirmOpen ? (
											<div
												role="alert"
												className="flex items-start gap-2 rounded-lg border border-error/20 bg-error-subtle p-3 text-xs text-error"
											>
												<Icon
													name="alertCircle"
													className="mt-0.5 size-4 shrink-0"
												/>
												<span>{submitErrorMessage}</span>
											</div>
										) : null}

										<div className="flex justify-end gap-3 border-t border-border pt-4">
											<Button
												variant="outline"
												onClick={() => setConfirmOpen(false)}
												disabled={submitMutation.isPending}
											>
												Cancel
											</Button>
											<Button
												variant="primary"
												loading={submitMutation.isPending}
												loadingText="Submitting..."
												onClick={() => void handleConfirmSubmit()}
											>
												Submit quiz
											</Button>
										</div>
									</Dialog>
								</div>
							);

						default: {
							const _exhaustive: never = takeState;
							return _exhaustive;
						}
					}
				})()}
			</>
		);
	}

	return (
		<section
			aria-label={quiz.title || blockTitle || "Quiz player"}
			className="flex flex-col gap-5"
		>
			<header className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<span className="text-xs font-semibold uppercase tracking-wider text-primary">
							Quiz
						</span>
						<h2 className="font-heading text-2xl font-bold text-ink">
							{quiz.title || blockTitle}
						</h2>
					</div>

					{aggregatedScore !== null ? (
						<span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary">
							Quiz score: {aggregatedScore}%
						</span>
					) : null}
				</div>

				<dl className="grid grid-cols-1 gap-3 border-t border-border pt-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
					<div className="flex flex-col gap-0.5">
						<dt className="text-muted">Questions</dt>
						<dd className="font-semibold text-ink">
							{sortedQuestions.length}{" "}
							{sortedQuestions.length === 1 ? "question" : "questions"}
						</dd>
					</div>

					<div className="flex flex-col gap-0.5">
						<dt className="text-muted">Attempts</dt>
						<dd className="font-semibold text-ink">
							{attemptsUsed !== undefined
								? `Attempts used: ${attemptsUsed} / ${quiz.maxAttempts}`
								: `Max attempts: ${quiz.maxAttempts}`}
						</dd>
					</div>

					<div className="flex flex-col gap-0.5">
						<dt className="text-muted">Scoring mode</dt>
						<dd className="font-semibold text-ink">
							Scoring mode: {quiz.scoringMode}
						</dd>
					</div>

					<div className="flex flex-col gap-0.5">
						<dt className="text-muted">Available from</dt>
						<dd className="font-semibold text-ink">
							{quiz.availableFrom
								? formatQuizDate(quiz.availableFrom)
								: "Open immediately"}
						</dd>
					</div>

					<div className="flex flex-col gap-0.5">
						<dt className="text-muted">Deadline</dt>
						<dd className="font-semibold text-ink">
							{quiz.deadline ? formatQuizDate(quiz.deadline) : "No deadline"}
						</dd>
					</div>

					<div className="flex flex-col gap-0.5">
						<dt className="text-muted">Late policy</dt>
						<dd className="font-semibold text-ink">
							{quiz.allowLate
								? "Late submissions allowed"
								: "Late submissions not accepted"}
						</dd>
					</div>
				</dl>
			</header>

			{renderQuizBody()}
		</section>
	);
}
