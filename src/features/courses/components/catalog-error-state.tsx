import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getApiErrorMessage } from "@/lib/http/errors";

export interface CatalogErrorStateProps {
	error: unknown;
	onRetry: () => void;
}

export function CatalogErrorState({ error, onRetry }: CatalogErrorStateProps) {
	const message = getApiErrorMessage(
		error,
		"Unable to load courses. Please check your connection and try again.",
	);

	return (
		<div
			role="alert"
			className="flex flex-col items-center justify-center rounded-2xl border border-error/20 bg-error-subtle p-10 text-center"
		>
			<div className="flex size-12 items-center justify-center rounded-xl bg-error text-white">
				<Icon name="alertTriangle" className="size-6" />
			</div>
			<h3 className="mt-4 font-heading text-lg font-bold text-error">
				Error loading courses
			</h3>
			<p className="mt-1 max-w-md text-sm text-ink/80">{message}</p>
			<div className="mt-6">
				<Button variant="primary" size="md" onClick={onRetry}>
					Retry
				</Button>
			</div>
		</div>
	);
}
