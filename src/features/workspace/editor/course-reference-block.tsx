import { createReactBlockSpec } from "@blocknote/react";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { pageReferencesQuery } from "../api/workspace.queries";
import { ReferenceCard } from "../components/course-references";

/** The page whose references the blocks resolve against. */
export const ReferencesContext = createContext<{ pageId: string } | null>(null);

/**
 * A course file or video placed in the page text. The block stores only the
 * reference id; the card is resolved from the page's references for whoever is
 * viewing, so course access is still checked per person.
 */
export const courseReferenceBlock = createReactBlockSpec(
	{
		type: "courseReference",
		propSchema: { referenceId: { default: "" } },
		content: "none",
	},
	{
		render: ({ block }) => (
			<CourseReferenceView referenceId={block.props.referenceId} />
		),
	},
);

function CourseReferenceView({ referenceId }: { referenceId: string }) {
	const context = useContext(ReferencesContext);
	const references = useQuery({
		...pageReferencesQuery(context?.pageId ?? ""),
		enabled: Boolean(context),
	});
	const reference = references.data?.find((entry) => entry.id === referenceId);
	const [refetched, setRefetched] = useState(false);
	const { isSuccess, refetch } = references;

	// Another member may have just added it; look once more before giving up.
	useEffect(() => {
		if (isSuccess && !reference && !refetched) {
			setRefetched(true);
			void refetch();
		}
	}, [isSuccess, reference, refetched, refetch]);

	return (
		<div className="my-1 w-full" contentEditable={false}>
			{reference ? (
				<ReferenceCard reference={reference} />
			) : references.isPending || references.isFetching ? (
				<p className="rounded-lg border border-border p-4 text-sm text-muted">
					Loading course reference…
				</p>
			) : (
				<p className="rounded-lg border border-border p-4 text-sm text-muted">
					This course reference was removed from the page.
				</p>
			)}
		</div>
	);
}
