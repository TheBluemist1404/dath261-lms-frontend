import alertCircle from "@/assets/icons/alert-circle.svg";
import alertTriangle from "@/assets/icons/alert-triangle.svg";
import bell from "@/assets/icons/bell.svg";
import book from "@/assets/icons/book-open.svg";
import calendar from "@/assets/icons/calendar-days.svg";
import checkCircle from "@/assets/icons/check-circle.svg";
import eye from "@/assets/icons/eye.svg";
import eyeOff from "@/assets/icons/eye-off.svg";
import file from "@/assets/icons/file-text.svg";
import courses from "@/assets/icons/graduation-cap.svg";
import dashboard from "@/assets/icons/layout-dashboard.svg";
import lock from "@/assets/icons/lock.svg";
import workspace from "@/assets/icons/notebook-pen.svg";
import play from "@/assets/icons/play.svg";
import reports from "@/assets/icons/shield-check.svg";
import users from "@/assets/icons/users.svg";
import xMark from "@/assets/icons/x-mark.svg";

const icons = {
	alertCircle,
	alertTriangle,
	bell,
	book,
	calendar,
	checkCircle,
	courses,
	dashboard,
	eye,
	eyeOff,
	file,
	lock,
	play,
	reports,
	users,
	workspace,
	xMark,
};
export type IconName = keyof typeof icons;

export interface IconProps {
	name: IconName;
	className?: string;
}

const BASE_ICON_CLASSES = "inline-block shrink-0 bg-current";

export function Icon({ name, className = "size-6" }: IconProps) {
	return (
		<span
			aria-hidden="true"
			className={`${BASE_ICON_CLASSES} ${className}`}
			style={{
				mask: `url("${icons[name]}") center / contain no-repeat`,
				WebkitMask: `url("${icons[name]}") center / contain no-repeat`,
			}}
		/>
	);
}
