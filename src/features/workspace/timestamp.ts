/** Formats seconds as m:ss, or h:mm:ss from one hour. */
export function formatTimestamp(totalSeconds: number) {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const ss = String(seconds).padStart(2, "0");
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, "0")}:${ss}`
		: `${minutes}:${ss}`;
}

/**
 * Parses m:ss or h:mm:ss into seconds. Returns null for anything else, including
 * minute or second fields of 60 or more.
 */
export function parseTimestamp(value: string): number | null {
	const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match) return null;
	const [, h, m, s] = match;
	const hours = h === undefined ? 0 : Number(h);
	const minutes = Number(m);
	const seconds = Number(s);
	if (seconds > 59 || (h !== undefined && minutes > 59)) return null;
	return hours * 3600 + minutes * 60 + seconds;
}
