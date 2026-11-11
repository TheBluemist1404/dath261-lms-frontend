import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/features/auth/routing/guards";
import { MyCoursesView } from "@/features/courses/components/my-courses-view";
import type { LearnerCourseState } from "@/features/courses/types/enrollment.types";

export interface MyCoursesSearch {
	page: number;
	state?: LearnerCourseState;
}

export const Route = createFileRoute("/_layout/my-courses")({
	validateSearch: (search: Record<string, unknown>): MyCoursesSearch => {
		const pageNum = Number(search.page);
		const page = Number.isInteger(pageNum) && pageNum >= 1 ? pageNum : 1;
		const stateStr = search.state;
		const state =
			stateStr === "IN_PROGRESS" ||
			stateStr === "UNAVAILABLE" ||
			stateStr === "COMPLETED"
				? stateStr
				: undefined;

		return { page, state };
	},
	beforeLoad: requireRole(["student"]),
	component: MyCoursesRouteComponent,
});

function MyCoursesRouteComponent() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<MyCoursesView
			page={search.page}
			state={search.state}
			onFilterChange={(newFilters) => {
				navigate({ search: (prev) => ({ ...prev, ...newFilters }) });
			}}
		/>
	);
}
