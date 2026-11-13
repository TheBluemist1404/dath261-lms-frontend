import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Link, useNavigate } from "@tanstack/react-router";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { getApiErrorMessage } from "@/lib/http/errors";

import {
	createQuiz,
	getQuiz,
	replaceQuizQuestions,
	updateQuizConfig,
} from "../api/quiz.api";

import type {
	QuizConfigUpdateInput,
	QuizQuestionInput,
	QuizResponse,
} from "../types/quiz.types";

import { validateQuestions } from "../validation/quiz-validation";

import { QuizConfigForm, type QuizConfigValues } from "./quiz-config-form";

import { QuizQuestionList } from "./quiz-question-list";

import { QuizSaveStatus } from "./quiz-save-status";

interface QuizAuthoringPageProps {
	courseId: string;
	blockId?: string;
}

function responseToQuestions(quiz: QuizResponse): QuizQuestionInput[] {
	return quiz.questions.map((question) => ({
		type: question.type,
		text: question.text,
		points: question.points,
		options: question.options?.map((option) => ({
			text: option.text,
			isCorrect: option.isCorrect,
		})),
		correctBoolean: question.correctBoolean ?? undefined,
		acceptedAnswers: question.acceptedAnswers
			? [...question.acceptedAnswers]
			: undefined,
	}));
}

export function QuizAuthoringPage({
	courseId,
	blockId,
}: QuizAuthoringPageProps) {
	const navigate = useNavigate();

	const queryClient = useQueryClient();

	const editing = Boolean(blockId);

	const [quiz, setQuiz] = useState<QuizResponse | null>(null);

	const [configDraft, setConfigDraft] = useState<QuizConfigValues | null>(null);

	const [questions, setQuestions] = useState<QuizQuestionInput[]>([]);

	const [configDirty, setConfigDirty] = useState(false);

	const [questionsDirty, setQuestionsDirty] = useState(false);

	const [createError, setCreateError] = useState<string | null>(null);

	const [saved, setSaved] = useState(false);

	const quizQuery = useQuery({
		queryKey: ["quiz", courseId, blockId],
		queryFn: () => getQuiz(courseId, blockId as string),
		enabled: editing,
	});

	useEffect(() => {
		if (!quizQuery.data) {
			return;
		}

		setQuiz(quizQuery.data);

		setQuestions(responseToQuestions(quizQuery.data));

		setQuestionsDirty(false);

		setConfigDirty(false);

		setSaved(false);
	}, [quizQuery.data]);

	useEffect(() => {
		if (!configDirty && !questionsDirty) {
			return;
		}

		function warnBeforeUnload(event: BeforeUnloadEvent) {
			event.preventDefault();
			event.returnValue = "";
		}

		window.addEventListener("beforeunload", warnBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", warnBeforeUnload);
		};
	}, [configDirty, questionsDirty]);

	const configMutation = useMutation({
		mutationFn: (config: QuizConfigUpdateInput) =>
			updateQuizConfig(courseId, blockId as string, config),

		onSuccess: async (updatedQuiz) => {
			setQuiz(updatedQuiz);

			setConfigDirty(false);

			setSaved(true);

			await queryClient.invalidateQueries({
				queryKey: ["quiz", courseId, blockId],
			});
		},
	});

	const questionsMutation = useMutation({
		mutationFn: (nextQuestions: QuizQuestionInput[]) =>
			replaceQuizQuestions(courseId, blockId as string, nextQuestions),

		onSuccess: async (updatedQuiz) => {
			setQuiz(updatedQuiz);

			setQuestions(responseToQuestions(updatedQuiz));

			setQuestionsDirty(false);

			setSaved(true);

			await queryClient.invalidateQueries({
				queryKey: ["quiz", courseId, blockId],
			});
		},
	});

	const isSaving = configMutation.isPending || questionsMutation.isPending;

	const saveError = configMutation.error
		? getApiErrorMessage(configMutation.error)
		: questionsMutation.error
			? getApiErrorMessage(questionsMutation.error)
			: createError;

	const questionErrors = useMemo(
		() => validateQuestions(questions),
		[questions],
	);

	async function saveConfig(config: QuizConfigValues) {
		setSaved(false);

		if (!editing) {
			setConfigDraft(config);

			setConfigDirty(false);

			setCreateError(null);

			return;
		}

		await configMutation.mutateAsync({
			maxAttempts: config.maxAttempts,
			scoringMode: config.scoringMode,
			availableFrom: config.availableFrom,
			deadline: config.deadline,
			allowLate: config.allowLate,
		});
	}

	function changeQuestions(nextQuestions: QuizQuestionInput[]) {
		setQuestions(nextQuestions);

		setQuestionsDirty(true);

		setSaved(false);
	}

	async function saveQuestions() {
		if (!editing) {
			return;
		}

		if (Object.keys(questionErrors).length > 0) {
			return;
		}

		setSaved(false);

		await questionsMutation.mutateAsync(questions);
	}

	async function createQuizDefinition() {
		setCreateError(null);
		setSaved(false);

		if (!configDraft) {
			setCreateError("Save the quiz settings first.");
			return;
		}

		if (questions.length === 0) {
			setCreateError("Add at least one question before creating the quiz.");
			return;
		}

		if (Object.keys(questionErrors).length > 0) {
			setCreateError(
				"Fix the question validation errors before creating the quiz.",
			);
			return;
		}

		try {
			const created = await createQuiz(courseId, {
				title: configDraft.title,
				maxAttempts: configDraft.maxAttempts,
				scoringMode: configDraft.scoringMode,
				availableFrom: configDraft.availableFrom,
				deadline: configDraft.deadline,
				allowLate: configDraft.allowLate,
				questions,
			});

			await navigate({
				to: "/instructor/courses/$courseId/quizzes/$blockId/edit",
				params: {
					courseId,
					blockId: created.id,
				},
			});
		} catch (error) {
			setCreateError(getApiErrorMessage(error, "Unable to create the quiz."));
		}
	}

	if (editing && quizQuery.isPending) {
		return (
			<div className="rounded-xl border border-border bg-white p-8 text-center">
				<p className="font-semibold">Loading quiz…</p>

				<p className="mt-1 text-sm text-muted">
					Retrieving the saved quiz definition.
				</p>
			</div>
		);
	}

	if (editing && quizQuery.isError) {
		return (
			<div
				role="alert"
				className="rounded-xl border border-border bg-white p-6"
			>
				<h1 className="font-heading text-xl font-bold">Unable to load quiz</h1>

				<p className="mt-2 text-sm text-error">
					{getApiErrorMessage(quizQuery.error, "The quiz could not be loaded.")}
				</p>

				<Button className="mt-4" onClick={() => void quizQuery.refetch()}>
					Retry
				</Button>
			</div>
		);
	}

	if (editing && !quiz) {
		return (
			<div className="rounded-xl border border-dashed border-border bg-white p-8 text-center">
				<h1 className="font-heading text-xl font-bold">Quiz not found</h1>

				<p className="mt-2 text-sm text-muted">
					The quiz may have been removed or you may not own this course.
				</p>
			</div>
		);
	}

	const initialConfig =
		editing && quiz
			? {
					title: quiz.title,
					maxAttempts: quiz.maxAttempts,
					scoringMode: quiz.scoringMode,
					availableFrom: quiz.availableFrom,
					deadline: quiz.deadline,
					allowLate: quiz.allowLate,
				}
			: configDraft;

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<div>
				<Link
					to="/instructor/courses/$courseId"
					params={{
						courseId,
					}}
					className="text-sm font-semibold text-primary hover:underline"
				>
					← Back to course
				</Link>

				<p className="mt-4 text-sm font-semibold uppercase tracking-wide text-primary">
					{editing ? "Quiz authoring" : "New quiz"}
				</p>

				<h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
					{initialConfig?.title || "Create quiz"}
				</h1>

				<p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
					Configure attempts, availability, late submissions, scoring, and
					question answer keys.
				</p>
			</div>

			<QuizSaveStatus
				isDirty={configDirty || questionsDirty}
				isSaving={isSaving}
				isError={Boolean(saveError)}
				isSuccess={saved}
			/>

			<section className="rounded-xl border border-border bg-white p-5 sm:p-6">
				<div className="mb-5">
					<h2 className="font-heading text-xl font-bold">Quiz settings</h2>

					<p className="mt-1 text-sm text-muted">
						{editing
							? "Update the saved quiz configuration."
							: "Save these settings before creating the quiz."}
					</p>
				</div>

				<QuizConfigForm
					initialQuiz={initialConfig}
					titleEditable={!editing}
					submitLabel={editing ? "Save settings" : "Save quiz settings"}
					onDirtyChange={setConfigDirty}
					onSave={saveConfig}
				/>
			</section>

			<section className="rounded-xl border border-border bg-white p-5 sm:p-6">
				<QuizQuestionList
					questions={questions}
					onChange={changeQuestions}
					onSave={editing ? saveQuestions : undefined}
					saving={questionsMutation.isPending}
					saveError={
						questionsMutation.error
							? getApiErrorMessage(questionsMutation.error)
							: null
					}
				/>
			</section>

			{!editing && (
				<section className="sticky bottom-4 rounded-xl border border-border bg-white p-4 shadow-lg sm:p-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="font-semibold">Ready to create?</p>

							<p className="text-sm text-muted">
								{configDraft
									? `${questions.length} question(s) ready.`
									: "Save quiz settings first."}
							</p>
						</div>

						<Button
							disabled={!configDraft || questions.length === 0}
							onClick={() => void createQuizDefinition()}
						>
							Create quiz
						</Button>
					</div>

					{createError && (
						<p role="alert" className="mt-3 text-sm text-error">
							{createError}
						</p>
					)}
				</section>
			)}
		</main>
	);
}
