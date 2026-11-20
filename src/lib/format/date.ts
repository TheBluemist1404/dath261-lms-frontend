const ICT_TIME_ZONE = "Asia/Ho_Chi_Minh";

function parts(
	value: string,
	options: Intl.DateTimeFormatOptions,
	timeZone = ICT_TIME_ZONE,
) {
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

export function formatShortDateTime(
	value: string,
	timeZone = ICT_TIME_ZONE,
): string {
	const p = parts(
		value,
		{
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		},
		timeZone,
	);
	return p ? `${p.month} ${p.day}, ${p.hour}:${p.minute}` : "—";
}

export function formatLongDateTime(
	value: string,
	timeZone = ICT_TIME_ZONE,
): string {
	const p = parts(
		value,
		{
			year: "numeric",
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		},
		timeZone,
	);
	return p ? `${p.month} ${p.day}, ${p.year} · ${p.hour}:${p.minute} ICT` : "—";
}

export function formatDeadlineDateTime(
	value: string,
	timeZone = ICT_TIME_ZONE,
): string {
	const p = parts(
		value,
		{
			month: "short",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		},
		timeZone,
	);
	return p ? `${p.month} ${p.day} · ${p.hour}:${p.minute} ICT` : "—";
}

export function formatDate(value: string, timeZone = ICT_TIME_ZONE): string {
	const p = parts(
		value,
		{ year: "numeric", month: "short", day: "2-digit" },
		timeZone,
	);
	return p ? `${p.month} ${p.day}, ${p.year}` : "—";
}
