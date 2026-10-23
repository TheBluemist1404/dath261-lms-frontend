import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/http/errors";

export function LoadingState({ label }: { label: string }) {
	return <output className="block text-sm text-muted">{label}</output>;
}

export function ErrorState({
	title,
	error,
	onRetry,
}: {
	title: string;
	error: unknown;
	onRetry: () => void;
}) {
	return (
		<div
			role="alert"
			className="flex flex-col items-start gap-3 rounded-xl border border-border bg-white p-6"
		>
			<h2 className="font-heading text-base font-semibold">{title}</h2>
			<p className="text-sm text-muted">{getApiErrorMessage(error)}</p>
			<Button variant="secondary" onClick={onRetry}>
				Try again
			</Button>
		</div>
	);
}
