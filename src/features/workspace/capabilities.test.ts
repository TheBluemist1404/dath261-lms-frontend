import { describe, expect, it } from "vitest";
import { getWorkspaceCapabilities } from "./capabilities";

const collaborative = { type: "COLLABORATIVE", archivedAt: null } as const;

describe("getWorkspaceCapabilities", () => {
	it("follows the Owner, Co-owner and Member table", () => {
		expect(
			getWorkspaceCapabilities({ ...collaborative, currentUserRole: "OWNER" }),
		).toEqual({
			canEditPages: true,
			canManageMembers: true,
			canManageCoOwners: true,
			canArchive: true,
		});
		expect(
			getWorkspaceCapabilities({
				...collaborative,
				currentUserRole: "CO_OWNER",
			}),
		).toMatchObject({
			canManageMembers: true,
			canManageCoOwners: false,
			canArchive: false,
		});
		expect(
			getWorkspaceCapabilities({ ...collaborative, currentUserRole: "MEMBER" }),
		).toMatchObject({
			canEditPages: true,
			canManageMembers: false,
			canArchive: false,
		});
	});

	it("gives the personal workspace no member or archive controls", () => {
		expect(
			getWorkspaceCapabilities({
				type: "PERSONAL",
				archivedAt: null,
				currentUserRole: "OWNER",
			}),
		).toEqual({
			canEditPages: true,
			canManageMembers: false,
			canManageCoOwners: false,
			canArchive: false,
		});
	});

	it("makes an archived workspace read-only but restorable by its Owner", () => {
		expect(
			getWorkspaceCapabilities({
				...collaborative,
				archivedAt: "2026-10-10T00:00:00.000Z",
				currentUserRole: "OWNER",
			}),
		).toEqual({
			canEditPages: false,
			canManageMembers: false,
			canManageCoOwners: false,
			canArchive: true,
		});
	});
});
