import type { Metadata } from "next";
import { ProductsView } from "@/components/business-profile/products/products-view";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return <ProductsView />;
}
