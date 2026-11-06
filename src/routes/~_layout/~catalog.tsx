import { createFileRoute } from "@tanstack/react-router";
import { CatalogPlaceholder } from "@/features/catalog/components/catalog-placeholder";

// Public: guests may browse the catalog (Figma PA-01 is Guest / Student).
export const Route = createFileRoute("/_layout/catalog")({
	component: CatalogPlaceholder,
});
