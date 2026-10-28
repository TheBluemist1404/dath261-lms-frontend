import * as Y from "yjs";

/**
 * Name of the Yjs XML fragment the editor binds to. The collaboration server
 * seeds and reads the same fragment, so the two must stay in step.
 */
export const DOCUMENT_FRAGMENT = "document-store";

const paragraphDefaults = {
	backgroundColor: "default",
	textAlignment: "left",
	textColor: "default",
};

/**
 * Builds a shared document from stored page content, the way the server seeds
 * a page on first open: one paragraph block per line. Used where no server is
 * involved (development mocks).
 */
export function seedSharedDocument(text: string): Y.Doc {
	const doc = new Y.Doc();
	const lines = text.split(/\r?\n/);
	const group = new Y.XmlElement("blockGroup");
	group.insert(
		0,
		lines.map((line) => {
			const container = new Y.XmlElement("blockContainer");
			container.setAttribute("id", crypto.randomUUID());
			const paragraph = new Y.XmlElement("paragraph");
			for (const [key, value] of Object.entries(paragraphDefaults)) {
				paragraph.setAttribute(key, value);
			}
			if (line) paragraph.insert(0, [new Y.XmlText(line)]);
			container.insert(0, [paragraph]);
			return container;
		}),
	);
	doc.getXmlFragment(DOCUMENT_FRAGMENT).insert(0, [group]);
	return doc;
}

/** Plain text of a shared document, one line per block. */
export function sharedDocumentText(fragment: Y.XmlFragment): string {
	const lines: string[] = [];
	const visit = (node: Y.XmlFragment | Y.XmlElement) => {
		const children = node.toArray();
		const text = children
			.filter((child) => child instanceof Y.XmlText)
			.map((child) => child.toString())
			.join("");
		if (text) lines.push(text);
		for (const child of children) {
			if (child instanceof Y.XmlElement) visit(child);
		}
	};
	visit(fragment);
	return lines.join("\n");
}
