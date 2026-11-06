import type { ModerationDialogProps } from "./moderation-dialog";

type DialogCopy = Pick<
	ModerationDialogProps,
	"title" | "description" | "confirmLabel" | "tone"
>;

// Wording from the Figma AD-OV dialogs.
export const dialogCopy = {
	dismissReport: (reportId: string): DialogCopy => ({
		title: `Dismiss report #${reportId}?`,
		description:
			"Record the reason for dismissing this report. No suspension action will be taken.",
		confirmLabel: "Dismiss report",
		tone: "primary",
	}),
	suspendUser: (name: string): DialogCopy => ({
		title: `Suspend ${name}?`,
		description:
			"Protected account actions stop. Account data, learning history and memberships are retained.",
		confirmLabel: "Suspend account",
		tone: "danger",
	}),
	restoreUser: (name: string): DialogCopy => ({
		title: `Restore ${name}?`,
		description:
			"Account actions resume subject to existing course and workspace permissions.",
		confirmLabel: "Restore account",
		tone: "primary",
	}),
	suspendCourse: (title: string): DialogCopy => ({
		title: `Suspend ${title}?`,
		description:
			"Protected course content and canonical references become unavailable. Publication status and learner history are retained.",
		confirmLabel: "Suspend course",
		tone: "danger",
	}),
	restoreCourse: (title: string): DialogCopy => ({
		title: `Restore ${title}?`,
		description:
			"Learning access returns only if the course is Published and the viewer has active enrollment.",
		confirmLabel: "Restore course",
		tone: "primary",
	}),
};
