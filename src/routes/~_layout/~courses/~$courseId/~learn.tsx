import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { requireRole } from "@/features/auth/routing/guards";
import { getCourseEnrollmentState } from "@/features/courses/api/enrollment.api";
import { CourseLearnView } from "@/features/courses/components/course-learn-view";

export interface LearnSearch {
	blockId?: string;
	positionSeconds?: number;
}

function parseNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function parseNonNegativeNumber(value: unknown): number | undefined {
	if (value === undefined || value === null || typeof value === "boolean") {
		return undefined;
	}
	if (typeof value === "string" && value.trim().length === 0) {
		return undefined;
	}
	const num = Number(value);
	return !Number.isNaN(num) && Number.isFinite(num) && num >= 0
		? num
		: undefined;
}

export function validateLearnSearch(
	search: Record<string, unknown>,
): LearnSearch {
	const blockId =
		parseNonEmptyString(search.blockId) ?? parseNonEmptyString(search.block);
	const positionSeconds =
		parseNonNegativeNumber(search.positionSeconds) ??
		parseNonNegativeNumber(search.t);

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
	component: CourseLearnRouteComponent,
});

function CourseLearnRouteComponent() {
	const { courseId } = Route.useParams();
	const { blockId, positionSeconds } = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<CourseLearnView
			key={courseId}
			courseId={courseId}
			initialBlockId={blockId}
			positionSeconds={positionSeconds}
			onSelectBlock={(nextBlockId) => {
				void navigate({
					to: "/courses/$courseId/learn",
					params: { courseId },
					search: { blockId: nextBlockId },
					replace: true,
				});
			}}
		/>
	);
}
