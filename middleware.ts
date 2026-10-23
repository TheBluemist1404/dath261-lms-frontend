/// <reference types="node" />

// Vercel Routing Middleware: forwards /api/* to the backend named by the
// BACKEND_URL environment variable, so the backend address stays out of the
// public repository. Same-origin /api keeps the backend's SameSite=Strict
// refresh cookie first-party, like the Vite dev proxy does locally.

export const config = { matcher: "/api/:path*" };

export function backendTarget(
	requestUrl: string,
	backendUrl: string | undefined,
) {
	if (!backendUrl) return null;
	const { pathname, search } = new URL(requestUrl);
	// Only the backend's origin is used, so the request path cannot change the host.
	return `${new URL(backendUrl).origin}${pathname}${search}`;
}

export default function middleware(request: Request) {
	const target = backendTarget(request.url, process.env.BACKEND_URL);
	if (!target) {
		return new Response("BACKEND_URL is not configured", { status: 500 });
	}
	// Vercel proxies the request (method, headers, body) to this URL.
	return new Response(null, { headers: { "x-middleware-rewrite": target } });
}
