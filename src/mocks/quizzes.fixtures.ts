import type {
	QuizAttemptResponse,
	QuizAttemptStatus,
	QuizScoringMode,
	StudentAttemptAnswerResult,
	StudentQuizQuestion,
	StudentQuizResponse,
} from "@/features/courses/types/student-quiz.types";

export interface MockQuizOption {
	id: string;
	text: string;
	position: number;
	isCorrect: boolean;
}

export type MockQuizQuestion =
	| {
			id: string;
			type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
			text: string;
			points: number;
			position: number;
			options: MockQuizOption[];
	  }
	| {
			id: string;
			type: "TRUE_FALSE";
			text: string;
			points: number;
			position: number;
			correctBoolean: boolean;
	  }
	| {
			id: string;
			type: "FILL_IN_BLANK";
			text: string;
			points: number;
			position: number;
			acceptedAnswers: string[];
	  };

export interface MockQuizDefinition {
	id: string;
	courseId: string;
	title: string;
	maxAttempts: number;
	scoringMode: QuizScoringMode;
	availableFrom: string | null;
	deadline: string | null;
	allowLate: boolean;
	resultsReleasedAt: string | null;
	questions: MockQuizQuestion[];
}

export interface StoredQuizAttempt {
	id: string;
	courseBlockId: string;
	attemptNumber: number;
	status: QuizAttemptStatus;
	score: number | null;
	isLate: boolean;
	submittedAt: string | null;
	answers: StudentAttemptAnswerResult[];
}

const seededQuizDefinitions: readonly MockQuizDefinition[] = [
	{
		id: "block-1-3",
		courseId: "course-os",
		title: "System Call Knowledge Check",
		maxAttempts: 3,
		scoringMode: "HIGHEST",
		availableFrom: null,
		deadline: null,
		allowLate: false,
		resultsReleasedAt: null,
		questions: [
			{
				id: "q-sys-1",
				type: "SINGLE_CHOICE",
				text: "Which system call creates a new child process in POSIX operating systems?",
				points: 25,
				position: 1,
				options: [
					{ id: "opt-sys-1a", text: "execve()", position: 1, isCorrect: false },
					{ id: "opt-sys-1b", text: "fork()", position: 2, isCorrect: true },
					{
						id: "opt-sys-1c",
						text: "waitpid()",
						position: 3,
						isCorrect: false,
					},
					{ id: "opt-sys-1d", text: "brk()", position: 4, isCorrect: false },
				],
			},
			{
				id: "q-sys-2",
				type: "MULTIPLE_CHOICE",
				text: "Which events trigger a transition from user mode to kernel mode?",
				points: 25,
				position: 2,
				options: [
					{
						id: "opt-sys-2a",
						text: "Executing a system call trap instruction",
						position: 1,
						isCorrect: true,
					},
					{
						id: "opt-sys-2b",
						text: "A hardware timer interrupt",
						position: 2,
						isCorrect: true,
					},
					{
						id: "opt-sys-2c",
						text: "Adding two local integer variables",
						position: 3,
						isCorrect: false,
					},
					{
						id: "opt-sys-2d",
						text: "A page fault exception",
						position: 4,
						isCorrect: true,
					},
				],
			},
			{
				id: "q-sys-3",
				type: "TRUE_FALSE",
				text: "User-space programs can directly modify kernel page tables without a privileged trap.",
				points: 25,
				position: 3,
				correctBoolean: false,
			},
			{
				id: "q-sys-4",
				type: "FILL_IN_BLANK",
				text: "What CPU execution mode is active when the processor executes operating system kernel code?",
				points: 25,
				position: 4,
				acceptedAnswers: ["kernel mode", "kernel", "supervisor mode"],
			},
		],
	},
	{
		id: "quiz-released",
		courseId: "course-os",
		title: "Released Quiz Assessment",
		maxAttempts: 3,
		scoringMode: "HIGHEST",
		availableFrom: null,
		deadline: null,
		allowLate: false,
		resultsReleasedAt: "2026-10-15T12:00:00.000Z",
		questions: [
			{
				id: "q-rel-1",
				type: "SINGLE_CHOICE",
				text: "Which scheduling algorithm minimizes average waiting time for known burst lengths?",
				points: 10,
				position: 1,
				options: [
					{
						id: "opt-rel-1a",
						text: "Round Robin",
						position: 1,
						isCorrect: false,
					},
					{
						id: "opt-rel-1b",
						text: "Shortest Job First",
						position: 2,
						isCorrect: true,
					},
					{
						id: "opt-rel-1c",
						text: "First-Come, First-Served",
						position: 3,
						isCorrect: false,
					},
				],
			},
			{
				id: "q-rel-2",
				type: "MULTIPLE_CHOICE",
				text: "Which resources are shared across threads within the same process?",
				points: 20,
				position: 2,
				options: [
					{
						id: "opt-rel-2a",
						text: "Heap memory",
						position: 1,
						isCorrect: true,
					},
					{
						id: "opt-rel-2b",
						text: "Open file descriptors",
						position: 2,
						isCorrect: true,
					},
					{
						id: "opt-rel-2c",
						text: "Per-thread call stack",
						position: 3,
						isCorrect: false,
					},
				],
			},
			{
				id: "q-rel-3",
				type: "TRUE_FALSE",
				text: "A mutex allows multiple threads to enter a critical section simultaneously.",
				points: 10,
				position: 3,
				correctBoolean: false,
			},
			{
				id: "q-rel-4",
				type: "FILL_IN_BLANK",
				text: "Which synchronization primitive uses wait and signal operations on a counter?",
				points: 20,
				position: 4,
				acceptedAnswers: ["semaphore", "counting semaphore"],
			},
		],
	},
	{
		id: "quiz-not-available",
		courseId: "course-os",
		title: "Upcoming Kernel Quiz",
		maxAttempts: 3,
		scoringMode: "HIGHEST",
		availableFrom: "2099-01-01T00:00:00.000Z",
		deadline: null,
		allowLate: false,
		resultsReleasedAt: null,
		questions: [
			{
				id: "q-unavail-1",
				type: "TRUE_FALSE",
				text: "Virtual memory decouples logical addresses from physical frames.",
				points: 50,
				position: 1,
				correctBoolean: true,
			},
			{
				id: "q-unavail-2",
				type: "FILL_IN_BLANK",
				text: "Name the hardware cache that accelerates virtual-to-physical address translation.",
				points: 50,
				position: 2,
				acceptedAnswers: ["tlb", "translation lookaside buffer"],
			},
		],
	},
	{
		id: "quiz-exhausted",
		courseId: "course-os",
		title: "Process States Checkpoint",
		maxAttempts: 1,
		scoringMode: "HIGHEST",
		availableFrom: null,
		deadline: null,
		allowLate: false,
		resultsReleasedAt: null,
		questions: [
			{
				id: "q-exh-1",
				type: "SINGLE_CHOICE",
				text: "Which state holds a runnable process waiting for CPU allocation?",
				points: 25,
				position: 1,
				options: [
					{ id: "opt-exh-1a", text: "Ready", position: 1, isCorrect: true },
					{ id: "opt-exh-1b", text: "Blocked", position: 2, isCorrect: false },
				],
			},
			{
				id: "q-exh-2",
				type: "MULTIPLE_CHOICE",
				text: "Which transitions enter the Waiting state?",
				points: 25,
				position: 2,
				options: [
					{
						id: "opt-exh-2a",
						text: "I/O request initiated",
						position: 1,
						isCorrect: true,
					},
					{
						id: "opt-exh-2b",
						text: "Waiting on semaphore",
						position: 2,
						isCorrect: true,
					},
					{
						id: "opt-exh-2c",
						text: "Time quantum expired",
						position: 3,
						isCorrect: false,
					},
				],
			},
			{
				id: "q-exh-3",
				type: "TRUE_FALSE",
				text: "A zombie process has terminated execution but retains an entry in the process table.",
				points: 25,
				position: 3,
				correctBoolean: true,
			},
			{
				id: "q-exh-4",
				type: "FILL_IN_BLANK",
				text: "Which POSIX call reaps a terminated child process?",
				points: 25,
				position: 4,
				acceptedAnswers: ["wait", "waitpid"],
			},
		],
	},
	{
		id: "quiz-late-allowed",
		courseId: "course-os",
		title: "Scheduling Lab Quiz (Late Open)",
		maxAttempts: 3,
		scoringMode: "LATEST",
		availableFrom: null,
		deadline: "2025-01-01T00:00:00.000Z",
		allowLate: true,
		resultsReleasedAt: null,
		questions: [
			{
				id: "q-late-ok-1",
				type: "TRUE_FALSE",
				text: "Preemptive scheduling can interrupt a running process before it yields.",
				points: 50,
				position: 1,
				correctBoolean: true,
			},
			{
				id: "q-late-ok-2",
				type: "SINGLE_CHOICE",
				text: "Which parameter controls time-slice length in Round Robin?",
				points: 50,
				position: 2,
				options: [
					{
						id: "opt-late-ok-2a",
						text: "Quantum",
						position: 1,
						isCorrect: true,
					},
					{
						id: "opt-late-ok-2b",
						text: "Stride",
						position: 2,
						isCorrect: false,
					},
				],
			},
		],
	},
	{
		id: "quiz-late-blocked",
		courseId: "course-os",
		title: "Memory Quiz (Closed)",
		maxAttempts: 3,
		scoringMode: "AVERAGE",
		availableFrom: null,
		deadline: "2025-01-01T00:00:00.000Z",
		allowLate: false,
		resultsReleasedAt: null,
		questions: [
			{
				id: "q-late-blk-1",
				type: "TRUE_FALSE",
				text: "External fragmentation occurs in contiguous variable-size memory allocation.",
				points: 50,
				position: 1,
				correctBoolean: true,
			},
			{
				id: "q-late-blk-2",
				type: "FILL_IN_BLANK",
				text: "Which page replacement algorithm evicts the least recently used page?",
				points: 50,
				position: 2,
				acceptedAnswers: ["lru", "least recently used"],
			},
		],
	},
];

const seededAttemptsByBlockId: Readonly<
	Record<string, readonly StoredQuizAttempt[]>
> = {
	"quiz-exhausted": [
		{
			id: "attempt-exhausted-1",
			courseBlockId: "quiz-exhausted",
			attemptNumber: 1,
			status: "GRADED",
			score: 75,
			isLate: false,
			submittedAt: "2026-10-10T10:00:00.000Z",
			answers: [
				{
					questionId: "q-exh-1",
					points: 25,
					earnedPoints: 25,
					isCorrect: true,
					correctAnswer: ["opt-exh-1a"],
					studentAnswer: ["opt-exh-1a"],
				},
				{
					questionId: "q-exh-2",
					points: 25,
					earnedPoints: 25,
					isCorrect: true,
					correctAnswer: ["opt-exh-2a", "opt-exh-2b"],
					studentAnswer: ["opt-exh-2a", "opt-exh-2b"],
				},
				{
					questionId: "q-exh-3",
					points: 25,
					earnedPoints: 25,
					isCorrect: true,
					correctAnswer: true,
					studentAnswer: true,
				},
				{
					questionId: "q-exh-4",
					points: 25,
					earnedPoints: 0,
					isCorrect: false,
					correctAnswer: ["wait", "waitpid"],
					studentAnswer: "fork",
				},
			],
		},
	],
};

function cloneQuizDefinition(quiz: MockQuizDefinition): MockQuizDefinition {
	return {
		...quiz,
		questions: quiz.questions.map((question) => {
			switch (question.type) {
				case "SINGLE_CHOICE":
				case "MULTIPLE_CHOICE":
					return {
						...question,
						options: question.options.map((option) => ({ ...option })),
					};
				case "TRUE_FALSE":
					return { ...question };
				case "FILL_IN_BLANK":
					return {
						...question,
						acceptedAnswers: [...question.acceptedAnswers],
					};
				default: {
					const _exhaustive: never = question;
					return _exhaustive;
				}
			}
		}),
	};
}

function cloneStoredAttempt(attempt: StoredQuizAttempt): StoredQuizAttempt {
	return {
		...attempt,
		answers: attempt.answers.map((answer) => ({ ...answer })),
	};
}

const runtimeQuizDefinitions = new Map<string, MockQuizDefinition>();
const runtimeAttemptsByBlockId = new Map<string, StoredQuizAttempt[]>();
const completedQuizBlocksByCourseId = new Map<string, Set<string>>();

export function resetQuizMockState(): void {
	runtimeQuizDefinitions.clear();
	for (const quiz of seededQuizDefinitions) {
		runtimeQuizDefinitions.set(quiz.id, cloneQuizDefinition(quiz));
	}

	runtimeAttemptsByBlockId.clear();
	for (const [blockId, attempts] of Object.entries(seededAttemptsByBlockId)) {
		runtimeAttemptsByBlockId.set(
			blockId,
			attempts.map((attempt) => cloneStoredAttempt(attempt)),
		);
	}

	completedQuizBlocksByCourseId.clear();
}

resetQuizMockState();

export function getMockQuizDefinition(
	blockId: string,
): MockQuizDefinition | undefined {
	return runtimeQuizDefinitions.get(blockId);
}

export function getMockQuizAttempts(blockId: string): StoredQuizAttempt[] {
	return runtimeAttemptsByBlockId.get(blockId) ?? [];
}

export function appendMockQuizAttempt(
	courseId: string,
	blockId: string,
	attempt: StoredQuizAttempt,
): void {
	const existing = runtimeAttemptsByBlockId.get(blockId) ?? [];
	runtimeAttemptsByBlockId.set(blockId, [...existing, attempt]);

	const completed = completedQuizBlocksByCourseId.get(courseId) ?? new Set();
	completed.add(blockId);
	completedQuizBlocksByCourseId.set(courseId, completed);
}

export function getMockCompletedQuizBlockIds(
	courseId: string,
): ReadonlySet<string> {
	return completedQuizBlocksByCourseId.get(courseId) ?? new Set<string>();
}

export function releaseMockQuizResults(
	blockId: string,
	releasedAt = "2026-10-15T12:00:00.000Z",
): void {
	const quiz = runtimeQuizDefinitions.get(blockId);
	if (quiz) {
		quiz.resultsReleasedAt = releasedAt;
	}
}

export function toStudentQuizResponse(
	quiz: MockQuizDefinition,
	courseId = quiz.courseId,
): StudentQuizResponse {
	const questions: StudentQuizQuestion[] = [...quiz.questions]
		.sort((a, b) => a.position - b.position)
		.map((question) => {
			switch (question.type) {
				case "SINGLE_CHOICE":
				case "MULTIPLE_CHOICE":
					return {
						id: question.id,
						type: question.type,
						text: question.text,
						points: question.points,
						position: question.position,
						options: [...question.options]
							.sort((a, b) => a.position - b.position)
							.map(({ id, text, position }) => ({ id, text, position })),
					};
				case "TRUE_FALSE":
				case "FILL_IN_BLANK":
					return {
						id: question.id,
						type: question.type,
						text: question.text,
						points: question.points,
						position: question.position,
						options: null,
					};
				default: {
					const _exhaustive: never = question;
					return _exhaustive;
				}
			}
		});

	return {
		id: quiz.id,
		courseId,
		title: quiz.title,
		maxAttempts: quiz.maxAttempts,
		scoringMode: quiz.scoringMode,
		availableFrom: quiz.availableFrom,
		deadline: quiz.deadline,
		allowLate: quiz.allowLate,
		resultsReleasedAt: quiz.resultsReleasedAt,
		questions,
	};
}

export function isMockQuizResultsReleased(
	quiz: MockQuizDefinition,
	nowMs = Date.now(),
): boolean {
	if (quiz.resultsReleasedAt === null) {
		return false;
	}
	const releasedAtMs = Date.parse(quiz.resultsReleasedAt);
	return !Number.isNaN(releasedAtMs) && nowMs >= releasedAtMs;
}

export function toPublicAttemptResponse(
	attempt: StoredQuizAttempt,
	quiz: MockQuizDefinition,
	nowMs = Date.now(),
): QuizAttemptResponse {
	const resultsReleased = isMockQuizResultsReleased(quiz, nowMs);

	return {
		id: attempt.id,
		courseBlockId: attempt.courseBlockId,
		attemptNumber: attempt.attemptNumber,
		status: attempt.status,
		score: attempt.score,
		isLate: attempt.isLate,
		submittedAt: attempt.submittedAt,
		resultsReleased,
		answers: resultsReleased
			? attempt.answers.map((answer) => ({ ...answer }))
			: null,
	};
}
