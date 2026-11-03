import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthHeader } from "./auth-header";

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		Link: ({
			children,
			to,
			...props
		}: {
			children: React.ReactNode;
			to: string;
		}) => (
			<a href={to} {...props}>
				{children}
			</a>
		),
	};
});

describe("AuthHeader", () => {
	it("renders brand logo and title pointing to homepage", () => {
		render(<AuthHeader />);

		const brandLink = screen.getByRole("link", { name: "Learner LMS home" });
		expect(brandLink).toBeInTheDocument();
		expect(brandLink).toHaveAttribute("href", "/");
		expect(brandLink).toHaveTextContent("Learner LMS");
	});

	it("renders 'Explore courses' navigation link", () => {
		render(<AuthHeader />);

		const coursesLink = screen.getByRole("link", { name: "Explore courses" });
		expect(coursesLink).toBeInTheDocument();
		expect(coursesLink).toHaveAttribute("href", "/catalog");
	});

	it("renders 'Log in' and 'Get started' action links", () => {
		render(<AuthHeader />);

		const loginLink = screen.getByRole("link", { name: "Log in" });
		expect(loginLink).toBeInTheDocument();
		expect(loginLink).toHaveAttribute("href", "/login");

		const registerLink = screen.getByRole("link", { name: "Get started" });
		expect(registerLink).toBeInTheDocument();
		expect(registerLink).toHaveAttribute("href", "/register");
	});
});
