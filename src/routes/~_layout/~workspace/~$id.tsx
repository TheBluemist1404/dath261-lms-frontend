import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/workspace/$id")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_layout/workspace/$id"!</div>;
}
