import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProductsView } from "@/components/business-profile/products/products-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.products") };
}

export default function ProductsPage() {
  return <ProductsView />;
}
