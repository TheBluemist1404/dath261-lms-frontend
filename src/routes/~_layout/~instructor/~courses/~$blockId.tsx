import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/instructor/courses/$blockId")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_layout/instructor/courses/$blockId"!</div>;
}
