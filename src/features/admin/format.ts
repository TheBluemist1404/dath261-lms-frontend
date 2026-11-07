// Figma AD-02 to AD-05 show times in Indochina Time (ICT, UTC+7).
const timeZone = "Asia/Ho_Chi_Minh";

function parts(value: string, options: Intl.DateTimeFormatOptions) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	const map: Record<string, string> = {};
	for (const part of new Intl.DateTimeFormat("en-US", {
		timeZone,
		hourCycle: "h23",
		...options,
	}).formatToParts(date)) {
		map[part.type] = part.value;
	}
	return map;
}

/** "Oct 02, 14:20" (report queue, action history). */
export function formatShortDateTime(value: string) {
	const p = parts(value, {
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
	return p ? `${p.month} ${p.day}, ${p.hour}:${p.minute}` : "—";
}

/** "Oct 02, 2026 · 14:20 ICT" (report review). */
export function formatLongDateTime(value: string) {
	const p = parts(value, {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
	return p ? `${p.month} ${p.day}, ${p.year} · ${p.hour}:${p.minute} ICT` : "—";
}

/** "Sep 21, 2026" (user registration). */
export function formatDate(value: string) {
	const p = parts(value, { year: "numeric", month: "short", day: "2-digit" });
	return p ? `${p.month} ${p.day}, ${p.year}` : "—";
}
