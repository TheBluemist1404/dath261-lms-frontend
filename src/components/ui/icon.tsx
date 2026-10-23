import bell from "@/assets/icons/bell.svg";
import book from "@/assets/icons/book-open.svg";
import calendar from "@/assets/icons/calendar-days.svg";
import file from "@/assets/icons/file-text.svg";
import courses from "@/assets/icons/graduation-cap.svg";
import dashboard from "@/assets/icons/layout-dashboard.svg";
import lock from "@/assets/icons/lock.svg";
import workspace from "@/assets/icons/notebook-pen.svg";
import play from "@/assets/icons/play.svg";
import reports from "@/assets/icons/shield-check.svg";
import users from "@/assets/icons/users.svg";

const icons = {
	bell,
	book,
	calendar,
	courses,
	dashboard,
	file,
	lock,
	play,
	workspace,
	reports,
	users,
};
export type IconName = keyof typeof icons;

export function Icon({ name }: { name: IconName }) {
	return (
		<span
			aria-hidden="true"
			className="inline-block size-6 shrink-0 bg-current"
			style={{ mask: `url("${icons[name]}") center / 24px 24px no-repeat` }}
		/>
	);
}
