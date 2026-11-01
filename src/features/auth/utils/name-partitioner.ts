export interface NamePartitionResult {
	firstName: string;
	lastName: string;
}

export class NameValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NameValidationError";
	}
}

export function partitionFullName(rawFullName: string): NamePartitionResult {
	if (
		rawFullName === null ||
		rawFullName === undefined ||
		typeof rawFullName !== "string"
	) {
		throw new NameValidationError("Full name is required.");
	}

	const normalized = rawFullName.trim().replace(/\s+/g, " ");

	if (normalized.length === 0) {
		throw new NameValidationError("Full name cannot be empty.");
	}

	const firstSpaceIndex = normalized.indexOf(" ");
	if (firstSpaceIndex === -1) {
		throw new NameValidationError(
			"Please enter your full name (both first and last name).",
		);
	}

	const firstName = normalized.slice(0, firstSpaceIndex).trim();
	const lastName = normalized.slice(firstSpaceIndex + 1).trim();

	if (firstName.length > 100) {
		throw new NameValidationError(
			"First name exceeds maximum length of 100 characters.",
		);
	}
	if (lastName.length > 100) {
		throw new NameValidationError(
			"Last name exceeds maximum length of 100 characters.",
		);
	}

	return { firstName, lastName };
}
