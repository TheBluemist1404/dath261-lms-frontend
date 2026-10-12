import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoleToggle } from "./role-toggle";

describe("RoleToggle", () => {
	it("renders student and lecturer options with appropriate accessible attributes", () => {
		render(<RoleToggle value="student" onChange={vi.fn()} />);

		const studentRadio = screen.getByRole("radio", { name: /student/i });
		const lecturerRadio = screen.getByRole("radio", { name: /lecturer/i });

		expect(studentRadio).toBeInTheDocument();
		expect(lecturerRadio).toBeInTheDocument();
		expect(studentRadio).toBeChecked();
		expect(lecturerRadio).not.toBeChecked();
	});

	it("triggers onChange with lecturer when clicked", async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();

		render(<RoleToggle value="student" onChange={handleChange} />);

		const lecturerRadio = screen.getByRole("radio", { name: /lecturer/i });
		await user.click(lecturerRadio);

		expect(handleChange).toHaveBeenCalledTimes(1);
		expect(handleChange).toHaveBeenCalledWith("lecturer");
	});

	it("disables both options when disabled prop is true", () => {
		render(<RoleToggle value="student" onChange={vi.fn()} disabled />);

		const studentRadio = screen.getByRole("radio", { name: /student/i });
		const lecturerRadio = screen.getByRole("radio", { name: /lecturer/i });

		expect(studentRadio).toBeDisabled();
		expect(lecturerRadio).toBeDisabled();
	});
});
