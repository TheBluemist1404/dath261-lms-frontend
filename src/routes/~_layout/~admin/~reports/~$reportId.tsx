import { createFileRoute } from "@tanstack/react-router";
import { ReportReviewPage } from "@/features/admin/components/report-review-page";

export const Route = createFileRoute("/_layout/admin/reports/$reportId")({
	component: ReportReviewRoute,
});

function ReportReviewRoute() {
	const { reportId } = Route.useParams();
	return <ReportReviewPage key={reportId} reportId={reportId} />;
}
