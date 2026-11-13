import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/features/auth/routing/guards";
import { QuizAuthoringPage } from "@/features/instructor/quizzes/components/quiz-authoring-page";

export const Route = createFileRoute(
	"/_layout/instructor/courses/$courseId/quizzes/$blockId/edit",
)({
	beforeLoad: requireRole(["lecturer"]),
	component: EditQuizRoute,
});

function EditQuizRoute() {
	const { courseId, blockId } = Route.useParams();

	return <QuizAuthoringPage courseId={courseId} blockId={blockId} />;
}
