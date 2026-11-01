import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { type RoleOption, RoleToggle } from "./role-toggle";

describe("RoleToggle", () => {
	it("renders both role tabs with proper accessibility attributes", () => {
		const handleChange = vi.fn();
		render(<RoleToggle value="STUDENT" onChange={handleChange} />);

		const tablist = screen.getByRole("tablist", { name: /account role/i });
		expect(tablist).toBeInTheDocument();

		const studentTab = screen.getByRole("tab", { name: "Student" });
		const lecturerTab = screen.getByRole("tab", { name: "Lecturer" });

		expect(studentTab).toHaveAttribute("aria-selected", "true");
		expect(studentTab).toHaveAttribute("tabindex", "0");
		expect(lecturerTab).toHaveAttribute("aria-selected", "false");
		expect(lecturerTab).toHaveAttribute("tabindex", "-1");
	});

	it("renders the contextual role hint for Student and Lecturer", () => {
		const { rerender } = render(
			<RoleToggle value="STUDENT" onChange={vi.fn()} />,
		);
		expect(
			screen.getByText("Students enroll, learn and build personal knowledge."),
		).toBeInTheDocument();

		rerender(<RoleToggle value="LECTURER" onChange={vi.fn()} />);
		expect(
			screen.getByText("Lecturers create courses and manage learning."),
		).toBeInTheDocument();
	});

	it("calls onChange when clicking inactive tab", async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();

		render(<RoleToggle value="STUDENT" onChange={handleChange} />);
		await user.click(screen.getByRole("tab", { name: "Lecturer" }));

		expect(handleChange).toHaveBeenCalledWith("LECTURER");
	});

	it("navigates and selects tabs using keyboard arrow keys", async () => {
		const user = userEvent.setup();

		function ControlledToggle() {
			const [role, setRole] = useState<RoleOption>("STUDENT");
			return <RoleToggle value={role} onChange={setRole} />;
		}

		render(<ControlledToggle />);
		const studentTab = screen.getByRole("tab", { name: "Student" });
		const lecturerTab = screen.getByRole("tab", { name: "Lecturer" });

		studentTab.focus();
		expect(studentTab).toHaveFocus();

		await user.keyboard("{ArrowRight}");
		expect(lecturerTab).toHaveFocus();
		expect(lecturerTab).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByText("Lecturers create courses and manage learning."),
		).toBeInTheDocument();

		await user.keyboard("{ArrowLeft}");
		expect(studentTab).toHaveFocus();
		expect(studentTab).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByText("Students enroll, learn and build personal knowledge."),
		).toBeInTheDocument();
	});

	it("supports Home and End keyboard keys", async () => {
		const user = userEvent.setup();

		function ControlledToggle() {
			const [role, setRole] = useState<RoleOption>("STUDENT");
			return <RoleToggle value={role} onChange={setRole} />;
		}

		render(<ControlledToggle />);
		const studentTab = screen.getByRole("tab", { name: "Student" });
		const lecturerTab = screen.getByRole("tab", { name: "Lecturer" });

		studentTab.focus();
		await user.keyboard("{End}");
		expect(lecturerTab).toHaveFocus();
		expect(lecturerTab).toHaveAttribute("aria-selected", "true");

		await user.keyboard("{Home}");
		expect(studentTab).toHaveFocus();
		expect(studentTab).toHaveAttribute("aria-selected", "true");
	});
});
