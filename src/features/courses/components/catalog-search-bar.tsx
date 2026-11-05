import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

export interface CatalogSearchBarProps {
	value?: string;
	onChange: (search: string) => void;
}

export function CatalogSearchBar({
	value = "",
	onChange,
}: CatalogSearchBarProps) {
	const [localValue, setLocalValue] = useState(value);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (localValue !== value) {
				onChange(localValue);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [localValue, value, onChange]);

	return (
		<div className="relative flex-1 min-w-[240px]">
			<label htmlFor="catalog-search" className="sr-only">
				Search courses
			</label>
			<div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
				<Icon name="search" className="size-4" />
			</div>
			<input
				id="catalog-search"
				type="text"
				value={localValue}
				onChange={(e) => setLocalValue(e.target.value)}
				placeholder="Search by title, topic, or keywords..."
				className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-10 text-sm text-ink placeholder:text-muted/60 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
			/>
			{localValue ? (
				<button
					type="button"
					onClick={() => {
						setLocalValue("");
						onChange("");
					}}
					aria-label="Clear search input"
					className="absolute inset-y-0 right-2 flex size-7 my-auto items-center justify-center rounded-lg text-muted hover:text-ink focus-visible:outline-2"
				>
					<Icon name="xMark" className="size-4" />
				</button>
			) : null}
		</div>
	);
}
