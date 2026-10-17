"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  Product,
  ProductImportPayload,
  ProductImportPreview,
  ProductListFilters,
  ProductPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useProducts(businessUuid: string, filters: ProductListFilters = {}) {
  return useQuery<Product[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "products", filters),
    queryFn: () =>
      api
        .get<{ data: Product[] }>(endpoints.products.index, { params: filters })
        .then((r) => r.data.data),
    placeholderData: (previous) => previous,
  });
}

function invalidateProducts(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "products") };
}

export function useCreateProduct(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Product, ApiError, ProductPayload>({
    mutationFn: (payload) =>
      api
        .post<{ data: Product }>(endpoints.products.index, payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateProducts(businessUuid)),
  });
}

export function useUpdateProduct(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<Product, ApiError, { id: string; payload: ProductPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: Product }>(endpoints.products.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateProducts(businessUuid)),
  });
}

export function useDeleteProduct(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.products.show(id)).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries(invalidateProducts(businessUuid)),
  });
}

export function useProductsImportPreview() {
  return useMutation<ProductImportPreview, ApiError, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<ProductImportPreview>(endpoints.products.importPreview, form)
        .then((r) => r.data);
    },
  });
}

export function useProductsImport(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, ApiError, ProductImportPayload>({
    mutationFn: (payload) =>
      api.post<{ message: string }>(endpoints.products.import, payload).then((r) => r.data),
    // The queued import lands later, but a refetch on settle is harmless
    // and catches synchronous local-queue runs.
    onSuccess: () => queryClient.invalidateQueries(invalidateProducts(businessUuid)),
  });
}
