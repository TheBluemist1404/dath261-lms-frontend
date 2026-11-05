import { HttpResponse } from "msw";

export function requireMockAuth(
	request: Request,
): ReturnType<typeof HttpResponse.json> | null {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return HttpResponse.json(
			{
				statusCode: 401,
				message: "Unauthorized: Missing or invalid Bearer access token.",
				error: "Unauthorized",
			},
			{ status: 401 },
		);
	}
	return null;
}
