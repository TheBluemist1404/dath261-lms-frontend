import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type {
	QuizAttemptResponse,
	StudentAttemptAnswerResult,
	StudentQuizQuestion,
} from "../../types/student-quiz.types";
import {
	formatCorrectAnswerText,
	formatStudentAnswerText,
	resolveAttemptReviewState,
} from "../../utils/student-quiz-domain";

export interface QuizAttemptResultsProps {
	attempts: readonly QuizAttemptResponse[];
	questions: readonly StudentQuizQuestion[];
	maxAttempts: number;
	selectedAttemptId: string | null;
	justSubmittedAttemptId: string | null;
	onSelectAttempt: (attemptId: string) => void;
}

function formatAttemptTimestamp(iso: string | null): string {
	if (!iso) return "Not submitted";
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

function formatAttemptScore(score: number | null): string {
	return score !== null ? `${score}%` : "Pending";
}

export function QuizAttemptResults({
	attempts,
	questions,
	maxAttempts,
	selectedAttemptId,
	justSubmittedAttemptId,
	onSelectAttempt,
}: QuizAttemptResultsProps) {
	const sortedAttempts = [...attempts].sort(
		(a, b) => b.attemptNumber - a.attemptNumber,
	);

	if (sortedAttempts.length === 0) {
		return null;
	}

	const selectedAttempt =
		sortedAttempts.find((attempt) => attempt.id === selectedAttemptId) ??
		sortedAttempts[0];
	const reviewState = resolveAttemptReviewState(selectedAttempt);
	const sortedQuestions = [...questions].sort(
		(a, b) => a.position - b.position,
	);

	function renderBreakdown() {
		switch (reviewState.kind) {
			case "withheld":
				return (
					<output className="flex items-start gap-3 rounded-xl border border-border bg-subtle p-4 text-sm text-muted">
						<Icon name="lock" className="mt-0.5 size-4 shrink-0 text-primary" />
						<p>
							Detailed per-question results and correct answers will be visible
							once the lecturer releases results.
						</p>
					</output>
				);

			case "released": {
				const answersByQuestionId = new Map<
					string,
					StudentAttemptAnswerResult
				>();
				for (const answerResult of reviewState.answers) {
					answersByQuestionId.set(answerResult.questionId, answerResult);
				}

				return (
					<div className="flex flex-col gap-3">
						<h4 className="font-heading text-sm font-semibold text-ink">
							Question Breakdown
						</h4>
						{sortedQuestions.map((question, index) => {
							const result = answersByQuestionId.get(question.id);
							if (!result) return null;

							return (
								<article
									key={question.id}
									className="rounded-xl border border-border bg-white p-4"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span className="text-xs font-semibold uppercase tracking-wider text-muted">
											Question {index + 1}
										</span>
										<div className="flex items-center gap-2">
											<span
												className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
													result.isCorrect
														? "bg-success-subtle text-success"
														: "bg-error-subtle text-error"
												}`}
											>
												{result.isCorrect ? "Correct" : "Incorrect"}
											</span>
											<span className="text-xs font-semibold text-ink">
												{result.earnedPoints} / {result.points} pts
											</span>
										</div>
									</div>

									<p className="mt-2 font-medium text-ink">{question.text}</p>

									<dl className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-subtle p-3 text-xs sm:grid-cols-2">
										<div>
											<dt className="font-semibold text-muted">Your answer:</dt>
											<dd className="mt-0.5 text-ink">
												{formatStudentAnswerText(
													question,
													result.studentAnswer,
												)}
											</dd>
										</div>
										<div>
											<dt className="font-semibold text-muted">
												Correct answer:
											</dt>
											<dd className="mt-0.5 font-medium text-ink">
												{formatCorrectAnswerText(
													question,
													result.correctAnswer,
												)}
											</dd>
										</div>
									</dl>
								</article>
							);
						})}
					</div>
				);
			}

			default: {
				const _exhaustive: never = reviewState;
				return _exhaustive;
			}
		}
	}

	return (
		<section
			aria-label="Quiz attempt results"
			className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-5 sm:p-6"
		>
			{justSubmittedAttemptId === selectedAttempt.id ? (
				<output className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-subtle px-4 py-3 text-sm font-medium text-success">
					<Icon name="checkCircle" className="size-4 shrink-0" />
					<span>Attempt #{selectedAttempt.attemptNumber} submitted.</span>
				</output>
			) : null}

			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
				<div className="flex flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="font-heading text-lg font-bold text-ink">
							Attempt #{selectedAttempt.attemptNumber} of {maxAttempts}
						</h3>
						{selectedAttempt.isLate ? (
							<span className="rounded-full bg-warning-subtle px-2.5 py-0.5 text-xs font-semibold text-warning">
								Late
							</span>
						) : null}
					</div>
					<p className="text-xs text-muted">
						Submitted {formatAttemptTimestamp(selectedAttempt.submittedAt)}
					</p>
				</div>

				<div className="rounded-xl bg-primary-subtle px-4 py-2 text-right">
					<span className="block text-xs font-medium text-muted">Score</span>
					<span className="font-heading text-lg font-bold text-primary">
						Score: {formatAttemptScore(selectedAttempt.score)}
					</span>
				</div>
			</div>

			{renderBreakdown()}

			<div className="flex flex-col gap-3 border-t border-border pt-4">
				<h4 className="font-heading text-sm font-semibold text-ink">
					Attempt History
				</h4>
				<ul className="flex flex-col gap-2">
					{sortedAttempts.map((attempt) => {
						const isSelected = attempt.id === selectedAttempt.id;
						return (
							<li
								key={attempt.id}
								className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
									isSelected
										? "border-primary bg-primary-subtle"
										: "border-border bg-canvas"
								}`}
							>
								<div className="flex flex-wrap items-center gap-2.5">
									<span className="font-semibold text-ink">
										Attempt #{attempt.attemptNumber}
									</span>
									{attempt.isLate ? (
										<span className="rounded-full bg-warning-subtle px-2 py-0.5 text-xs font-semibold text-warning">
											Late
										</span>
									) : null}
									<span className="text-xs text-muted">
										{formatAttemptTimestamp(attempt.submittedAt)}
									</span>
								</div>

								<div className="flex items-center gap-3">
									<span className="font-semibold text-ink">
										{formatAttemptScore(attempt.score)}
									</span>
									{sortedAttempts.length > 1 ? (
										<Button
											variant={isSelected ? "secondary" : "outline"}
											size="sm"
											aria-pressed={isSelected}
											onClick={() => onSelectAttempt(attempt.id)}
										>
											{isSelected ? "Viewing" : "Inspect"}
										</Button>
									) : null}
								</div>
							</li>
						);
					})}
				</ul>
			</div>
		</section>
	);
}
