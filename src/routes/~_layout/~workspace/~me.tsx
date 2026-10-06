import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/workspace/me")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_layout/workspace/me"!</div>;
}
