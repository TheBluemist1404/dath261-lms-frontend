import type { ReactNode } from "react";
import Header from "@/components/layout/header";
import { Icon } from "@/components/ui/icon";

export interface AuthLayoutProps {
	heroTitle: string;
	heroSubtitle: string;
	heroTag?: string;
	title: string;
	subtitle: string;
	children: ReactNode;
	className?: string;
}

export function AuthLayout({
	heroTitle,
	heroSubtitle,
	heroTag = "Private by default. Shared by choice.",
	title,
	subtitle,
	children,
	className = "",
}: AuthLayoutProps) {
	return (
		<div className={`flex min-h-dvh flex-col bg-canvas ${className}`}>
			<Header />
			<main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
				<div className="flex w-full max-w-5xl items-stretch justify-center gap-8 lg:gap-12">
					<div className="hidden lg:flex w-full max-w-[460px] flex-col justify-between rounded-2xl bg-primary-subtle p-10 text-ink">
						<div className="flex flex-col gap-8">
							<div className="flex size-12 items-center justify-center rounded-xl bg-primary text-white">
								<Icon name="workspace" className="size-6" />
							</div>
							<div className="flex flex-col gap-4">
								<h2 className="font-heading text-3xl font-bold leading-tight text-ink lg:text-4xl">
									{heroTitle}
								</h2>
								<p className="text-base text-muted leading-relaxed">
									{heroSubtitle}
								</p>
							</div>
						</div>
						<div className="pt-8">
							<span className="text-sm font-semibold text-primary">
								{heroTag}
							</span>
						</div>
					</div>

					<div className="w-full max-w-[480px] rounded-xl border border-border bg-white p-6 shadow-xs sm:p-8">
						<div className="mb-6 flex flex-col gap-1">
							<h1 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
								{title}
							</h1>
							<p className="text-sm text-muted">{subtitle}</p>
						</div>

						{children}
					</div>
				</div>
			</main>
		</div>
	);
}
