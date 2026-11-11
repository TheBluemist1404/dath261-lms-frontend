import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/hooks/use-auth";
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
	const [enrollmentNotice, setEnrollmentNotice] = useState(false);
	const [copied, setCopied] = useState(false);

	const isClosed = isEnrollmentClosed(course);
	const isUpcoming =
		Boolean(course.enrollmentStartAt) &&
		new Date(course.enrollmentStartAt as string).getTime() > Date.now();

	const isInstructorOrAdmin =
		user?.role === "lecturer" || user?.role === "admin";

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

			<div className="flex flex-col gap-3">
				{status === "unauthenticated" || !user ? (
					<Link
						to="/login"
						search={{ redirect: `/courses/${course.id}` }}
						className={buttonVariants({
							variant: "primary",
							size: "lg",
							className: "w-full",
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
				) : (
					<div className="flex flex-col gap-2">
						<Button
							variant="primary"
							size="lg"
							onClick={() => setEnrollmentNotice(true)}
							className="w-full justify-center"
						>
							Enroll in Course
						</Button>
						{enrollmentNotice ? (
							<output className="block rounded-lg bg-primary-subtle p-3 text-xs leading-relaxed text-primary">
								Student enrollment workflows will be enabled in the upcoming
								release.
							</output>
						) : null}
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
