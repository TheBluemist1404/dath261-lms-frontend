import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { requireRole } from "@/features/auth/routing/guards";
import { getCourseEnrollmentState } from "@/features/courses/api/enrollment.api";

export interface LearnSearch {
	blockId?: string;
	positionSeconds?: number;
}

export function validateLearnSearch(
	search: Record<string, unknown>,
): LearnSearch {
	const blockId =
		typeof search.blockId === "string" && search.blockId.trim()
			? search.blockId.trim()
			: undefined;
	const posNum = Number(search.positionSeconds);
	const positionSeconds =
		!Number.isNaN(posNum) && posNum >= 0 ? posNum : undefined;

	return { blockId, positionSeconds };
}

export const Route = createFileRoute("/_layout/courses/$courseId/learn")({
	validateSearch: validateLearnSearch,
	beforeLoad: async ({ params, context, location }) => {
		requireRole(["student"])({ context, location });
		try {
			const enrollment = await getCourseEnrollmentState(params.courseId);
			if (!enrollment?.canAccessCourse) {
				throw redirect({
					to: "/courses/$courseId",
					params: { courseId: params.courseId },
				});
			}
		} catch (error) {
			if (isRedirect(error)) throw error;
			throw redirect({
				to: "/courses/$courseId",
				params: { courseId: params.courseId },
			});
		}
	},
	component: CourseReaderPlaceholder,
});

function CourseReaderPlaceholder() {
	const { courseId } = Route.useParams();
	const { blockId, positionSeconds } = Route.useSearch();

	return (
		<main className="mx-auto flex max-w-4xl flex-col items-center justify-center p-12 text-center">
			<h1 className="font-heading text-2xl font-bold text-ink">
				Course Reader
			</h1>
			<p className="mt-2 text-sm text-muted">
				Course: {courseId}
				{blockId ? ` | Block: ${blockId}` : ""}
				{positionSeconds ? ` (${positionSeconds}s)` : ""}
			</p>
		</main>
	);
}
