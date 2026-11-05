import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/http/errors";
import { useCourseEnrollment } from "../api/enrollment.queries";
import {
	useEnrollCourse,
	useLeaveCourse,
} from "../hooks/use-enrollment-mutations";
import { type Course, isEnrollmentClosed } from "../types/course.types";

export interface CourseActionSidebarProps {
	course: Course;
}

function formatDate(iso: string | null): string {
	if (!iso) return "TBD";
	try {
		return new Date(iso).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return iso;
	}
}

export function CourseActionSidebar({ course }: CourseActionSidebarProps) {
	const { user, status } = useAuth();
	const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [dialogError, setDialogError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const isStudent = user?.role === "student";
	const { data: enrollmentState } = useCourseEnrollment(course.id, {
		enabled: isStudent,
	});

	const enrollMutation = useEnrollCourse(course.id);
	const leaveMutation = useLeaveCourse(course.id);

	const enrollmentStatus = enrollmentState?.enrollmentStatus ?? null;
	const isEnrolledActive = enrollmentStatus === "ACTIVE";
	const isPreviouslyLeft = enrollmentStatus === "LEFT";
	const isCompleted = enrollmentStatus === "COMPLETED";

	const isClosed = isEnrollmentClosed(course);
	const isUpcoming =
		Boolean(course.enrollmentStartAt) &&
		new Date(course.enrollmentStartAt as string).getTime() > Date.now();
	const isInstructorOrAdmin =
		user?.role === "lecturer" || user?.role === "admin";
	const isDraftOrSuspended = course.status === "DRAFT" || course.isSuspended;

	async function handleEnroll() {
		try {
			setErrorMessage(null);
			await enrollMutation.mutateAsync();
		} catch (error) {
			setErrorMessage(getApiErrorMessage(error));
		}
	}

	async function handleConfirmLeave() {
		try {
			setDialogError(null);
			await leaveMutation.mutateAsync();
			setLeaveDialogOpen(false);
		} catch (error) {
			setDialogError(getApiErrorMessage(error));
		}
	}

	function handleCopyShareLink() {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(window.location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	}

	return (
		<aside
			aria-label="Course actions"
			className="sticky top-24 flex flex-col gap-6 rounded-2xl border border-border bg-white p-6 shadow-sm"
		>
			<div className="flex flex-col gap-2">
				<span className="text-xs font-bold uppercase tracking-wider text-muted">
					Course Enrollment
				</span>
				<div className="flex items-baseline gap-2">
					<span className="font-heading text-2xl font-bold text-ink">Free</span>
					<span className="text-xs text-muted">Open access</span>
				</div>
			</div>

			{errorMessage && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-lg border border-error/20 bg-error-subtle p-3 text-xs text-error"
				>
					<Icon name="alertCircle" className="mt-0.5 size-4 shrink-0" />
					<span>{errorMessage}</span>
				</div>
			)}

			<div className="flex flex-col gap-3">
				{status === "unauthenticated" || !user ? (
					<Link
						to="/login"
						search={{ redirect: `/courses/${course.id}` }}
						className={buttonVariants({
							variant: "primary",
							size: "lg",
							className: "w-full justify-center",
						})}
					>
						Log in to enroll
					</Link>
				) : isInstructorOrAdmin ? (
					<div className="flex flex-col gap-2">
						<Button
							variant="secondary"
							size="lg"
							disabled
							className="w-full justify-center"
						>
							Instructor Preview
						</Button>
						<p className="text-center text-xs text-muted">
							You are viewing this course as a faculty member or administrator.
						</p>
					</div>
				) : isDraftOrSuspended ? (
					<div className="flex flex-col gap-2">
						<Button
							variant="secondary"
							size="lg"
							disabled
							className="w-full justify-center"
						>
							Course Unavailable
						</Button>
						<p className="text-center text-xs text-muted">
							This course is currently unavailable.
						</p>
					</div>
				) : isEnrolledActive ? (
					<div className="flex flex-col gap-2">
						<Link
							to="/courses/$courseId/learn"
							params={{ courseId: course.id }}
							className={buttonVariants({
								variant: "primary",
								size: "lg",
								className: "w-full justify-center",
							})}
						>
							Continue learning
						</Link>
						<Button
							variant="danger-ghost"
							size="sm"
							onClick={() => setLeaveDialogOpen(true)}
							className="w-full justify-center"
						>
							Leave course
						</Button>
					</div>
				) : isCompleted ? (
					<div className="flex flex-col gap-2">
						<Link
							to="/courses/$courseId/learn"
							params={{ courseId: course.id }}
							className={buttonVariants({
								variant: "secondary",
								size: "lg",
								className: "w-full justify-center",
							})}
						>
							Review course
						</Link>
						<p className="text-center text-xs font-semibold text-success">
							Completed
						</p>
					</div>
				) : isClosed ? (
					<div className="flex flex-col gap-2">
						<Button
							variant="secondary"
							size="lg"
							disabled
							className="w-full justify-center"
						>
							Enrollment Closed
						</Button>
						<p className="text-center text-xs text-muted">
							The enrollment window for this course closed on{" "}
							{formatDate(course.enrollmentEndAt)}.
						</p>
					</div>
				) : isUpcoming ? (
					<div className="flex flex-col gap-2">
						<Button
							variant="secondary"
							size="lg"
							disabled
							className="w-full justify-center"
						>
							Upcoming Course
						</Button>
						<p className="text-center text-xs text-muted">
							Enrollment begins on {formatDate(course.enrollmentStartAt)}.
						</p>
					</div>
				) : isPreviouslyLeft ? (
					<div className="flex flex-col gap-2">
						<Button
							variant="primary"
							size="lg"
							loading={enrollMutation.isPending}
							loadingText="Re-enrolling..."
							onClick={handleEnroll}
							className="w-full justify-center"
						>
							Re-enroll and restore history
						</Button>
						<p className="text-center text-xs text-muted">
							Your previous progress and submissions will be restored.
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						<Button
							variant="primary"
							size="lg"
							loading={enrollMutation.isPending}
							loadingText="Enrolling..."
							onClick={handleEnroll}
							className="w-full justify-center"
						>
							Enroll in Course
						</Button>
						<p className="text-center text-xs text-muted">
							Enrollment open · Instant access
						</p>
					</div>
				)}

				<Button
					variant="outline"
					size="sm"
					onClick={handleCopyShareLink}
					className="w-full justify-center gap-2"
				>
					<Icon name="file" className="size-4" />
					<span>{copied ? "Link Copied!" : "Share Course"}</span>
				</Button>
			</div>

			<Dialog
				open={leaveDialogOpen}
				onClose={() => setLeaveDialogOpen(false)}
				title="Leave this course?"
				description={`Are you sure you want to leave "${course.title}"? Your enrollment will be paused, but your learning progress, completed items, and submissions will be safely preserved. You can re-enroll at any time while the course enrollment period remains open.`}
			>
				{dialogError && (
					<div
						role="alert"
						className="flex items-start gap-2 rounded-lg border border-error/20 bg-error-subtle p-3 text-xs text-error"
					>
						<Icon name="alertCircle" className="mt-0.5 size-4 shrink-0" />
						<span>{dialogError}</span>
					</div>
				)}
				<div className="flex justify-end gap-3 pt-4 border-t border-border">
					<Button
						variant="secondary"
						onClick={() => setLeaveDialogOpen(false)}
						disabled={leaveMutation.isPending}
					>
						Keep Enrolled
					</Button>
					<Button
						variant="danger"
						loading={leaveMutation.isPending}
						loadingText="Leaving course..."
						onClick={handleConfirmLeave}
					>
						Leave Course
					</Button>
				</div>
			</Dialog>

			<div className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted">
				<div className="flex items-center justify-between">
					<span>Access</span>
					<span className="font-semibold text-ink">Lifetime access</span>
				</div>
				<div className="flex items-center justify-between">
					<span>Delivery</span>
					<span className="font-semibold text-ink">Self-paced modules</span>
				</div>
				{course.enrollmentStartAt ? (
					<div className="flex items-center justify-between">
						<span>Enrollment Start</span>
						<span className="font-semibold text-ink">
							{formatDate(course.enrollmentStartAt)}
						</span>
					</div>
				) : null}
				{course.enrollmentEndAt ? (
					<div className="flex items-center justify-between">
						<span>Enrollment Deadline</span>
						<span className="font-semibold text-ink">
							{formatDate(course.enrollmentEndAt)}
						</span>
					</div>
				) : null}
			</div>
		</aside>
	);
}
