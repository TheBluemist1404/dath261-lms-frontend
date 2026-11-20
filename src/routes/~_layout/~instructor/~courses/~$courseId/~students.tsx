import { createFileRoute } from "@tanstack/react-router";
import { StudentRoster } from "@/features/instructor/enrollments/components/student-roster";

export const Route = createFileRoute(
	"/_layout/instructor/courses/$courseId/students",
)({
	component: StudentRosterPage,
});

function StudentRosterPage() {
	const { courseId } = Route.useParams();

	return <StudentRoster courseId={courseId} />;
}
