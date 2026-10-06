export interface WorkspaceSummary {
	id: string;
	title: string;
	pageCount: number;
	collaboratorCount: number;
}

// Preview data until workspace and page-history APIs are available.
export const previewWorkspaces: WorkspaceSummary[] = [
	{
		id: "research-journal",
		title: "Research journal",
		pageCount: 4,
		collaboratorCount: 0,
	},
	{
		id: "systems-study-group",
		title: "Systems study group",
		pageCount: 8,
		collaboratorCount: 3,
	},
];

export const previewRecentPages = [
	{ id: "understanding-processes", title: "Understanding processes" },
	{ id: "scheduling-notes", title: "Scheduling notes" },
	{ id: "exam-revision", title: "Exam revision" },
];
