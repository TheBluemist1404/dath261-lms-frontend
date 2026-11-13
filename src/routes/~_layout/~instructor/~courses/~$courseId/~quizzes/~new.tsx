import { createFileRoute } from "@tanstack/react-router";

import { requireRole } from "@/features/auth/routing/guards";

import { QuizAuthoringPage } from "@/features/instructor/quizzes/components/quiz-authoring-page";

export const Route = createFileRoute(
	"/_layout/instructor/courses/$courseId/quizzes/new",
)({
	beforeLoad: requireRole(["lecturer"]),

	component: NewQuizRoute,
});

function NewQuizRoute() {
	const { courseId } = Route.useParams();

	return <QuizAuthoringPage courseId={courseId} />;
}
