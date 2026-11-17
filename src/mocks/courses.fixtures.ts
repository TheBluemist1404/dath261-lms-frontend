import type { Course, CoursePage } from "@/features/courses/types/course.types";
import type { CourseBlock } from "@/features/courses/types/course-block.types";

const seededAt = "2026-10-01T08:00:00.000Z";

export const mockLecturerElena = {
	id: "lecturer-1",
	name: "Dr. Elena Rostova",
};

export const mockLecturerMarcus = {
	id: "lecturer-2",
	name: "Prof. Marcus Vance",
};

function publishedCourse(
	id: string,
	title: string,
	description: string,
	options: Partial<Course> = {},
): Course {
	return {
		id,
		title,
		description,
		prerequisites: null,
		status: "PUBLISHED",
		enrollmentStartAt: null,
		enrollmentEndAt: null,
		createdAt: seededAt,
		updatedAt: seededAt,
		enrollmentCount: 42,
		lecturer: mockLecturerElena,
		...options,
	};
}

export const mockPublishedCourses: Course[] = [
	publishedCourse(
		"course-os",
		"Operating Systems",
		"Processes, memory and file systems, from scheduling to virtual memory.",
		{
			prerequisites: "Basic C programming and computer architecture.",
			enrollmentCount: 128,
		},
	),
	publishedCourse(
		"course-intro-cs",
		"Introduction to Computer Science",
		"Problem solving, algorithms and your first programs.",
		{
			lecturer: mockLecturerMarcus,
			enrollmentCount: 256,
		},
	),
	publishedCourse(
		"course-db",
		"Database Design",
		"Model data, normalise schemas and write the queries that use them.",
		{
			prerequisites: "Introductory programming experience.",
			enrollmentCount: 94,
		},
	),
	publishedCourse(
		"course-networks",
		"Computer Networks",
		"How packets travel, from links and routing to the web.",
		{
			lecturer: mockLecturerMarcus,
			enrollmentCount: 86,
		},
	),
	publishedCourse(
		"course-web-dev",
		"Full-Stack Web Engineering",
		"Modern web architecture with React, TypeScript, APIs and production deployment.",
		{
			prerequisites: "HTML, CSS and JavaScript fundamentals.",
			enrollmentCount: 310,
		},
	),
	publishedCourse(
		"course-ai-foundations",
		"Artificial Intelligence Foundations",
		"Search algorithms, probabilistic reasoning, machine learning basics and neural networks.",
		{
			prerequisites: "Linear algebra, calculus and Python programming.",
			enrollmentCount: 175,
		},
	),
	publishedCourse(
		"course-cloud-arch",
		"Cloud Systems & Distributed Computing",
		"Designing fault-tolerant, scalable architectures on modern containerized cloud platforms.",
		{
			enrollmentEndAt: "2026-01-01T00:00:00.000Z",
			enrollmentCount: 64,
		},
	),
	publishedCourse(
		"course-security",
		"Software Security & Cryptography",
		"Vulnerability analysis, threat modeling, modern ciphers and secure engineering.",
		{
			lecturer: mockLecturerMarcus,
			enrollmentCount: 112,
		},
	),
];

export const mockDraftCourse: Course = {
	id: "course-draft-hidden",
	title: "Advanced Quantum Computing (Draft)",
	description:
		"Internal syllabus draft in progress. Not yet open to the public.",
	prerequisites: null,
	status: "DRAFT",
	enrollmentStartAt: null,
	enrollmentEndAt: null,
	createdAt: seededAt,
	updatedAt: seededAt,
	lecturer: mockLecturerElena,
};

export const mockCourseBlocks: CourseBlock[] = [
	{
		id: "mod-1",
		courseId: "course-os",
		type: "MODULE",
		title: "Module 1: Kernel Architecture & System Calls",
		parentModuleId: null,
		position: 1,
		content: null,
		children: [
			{
				id: "block-1-1",
				courseId: "course-os",
				type: "TEXT",
				title: "Introduction to Operating System Abstractions",
				parentModuleId: "mod-1",
				position: 1,
				content: { text: "Overview of operating system responsibilities." },
			},
			{
				id: "block-1-2",
				courseId: "course-os",
				type: "VIDEO",
				title: "User Mode vs. Kernel Mode Traps",
				parentModuleId: "mod-1",
				position: 2,
				content: { durationSeconds: 780 },
			},
			{
				id: "block-1-3",
				courseId: "course-os",
				type: "QUIZ",
				title: "System Call Knowledge Check",
				parentModuleId: "mod-1",
				position: 3,
				content: { questionCount: 5 },
			},
		],
	},
	{
		id: "mod-2",
		courseId: "course-os",
		type: "MODULE",
		title: "Module 2: Process Scheduling & Threads",
		parentModuleId: null,
		position: 2,
		content: null,
		children: [
			{
				id: "block-2-1",
				courseId: "course-os",
				type: "TEXT",
				title: "Process Control Blocks & Context Switching",
				parentModuleId: "mod-2",
				position: 1,
				content: { text: "Structure and lifecycle of processes in memory." },
			},
			{
				id: "block-2-2",
				courseId: "course-os",
				type: "FILE",
				title: "Scheduling Algorithms Reference Notes",
				parentModuleId: "mod-2",
				position: 2,
				content: { fileName: "scheduling-algorithms.pdf", fileSize: 248000 },
			},
		],
	},
	{
		id: "mod-3",
		courseId: "course-os",
		type: "MODULE",
		title: "Module 3: Virtual Memory & Page Replacement",
		parentModuleId: null,
		position: 3,
		content: null,
		children: [
			{
				id: "block-3-1",
				courseId: "course-os",
				type: "VIDEO",
				title: "Paging, TLB, and Multi-level Page Tables",
				parentModuleId: "mod-3",
				position: 1,
				content: { durationSeconds: 1240 },
			},
			{
				id: "block-3-2",
				courseId: "course-os",
				type: "TEXT",
				title: "Page Fault Handling & LRU In Practice",
				parentModuleId: "mod-3",
				position: 2,
				content: { text: "Hardware MMU interaction during page faults." },
			},
		],
	},
];

export function coursePage(
	courses: Course[],
	page = 1,
	limit = 20,
): CoursePage {
	const total = courses.length;
	const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
	const startIndex = (page - 1) * limit;
	const paginatedData = courses.slice(startIndex, startIndex + limit);

	return {
		data: paginatedData,
		meta: {
			total,
			page,
			limit,
			totalPages,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1,
		},
	};
}
