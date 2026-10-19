import { z } from "zod";
import type {
  Job,
  JobLineItem,
  JobPriority,
  JobServiceAddress,
  StoreJobLineItemPayload,
  StoreJobPayload,
  UpdateJobPayload,
} from "@/lib/api/types";
import { LINE_ITEM_KINDS } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { centsToDollarsInput, dollarsToCents } from "@/lib/money";

/**
 * Loose mirror of Store/UpdateBusinessJobRequest. The site address is a flat
 * group of optional inputs — but once any of it is filled in, street and
 * suburb become required (the backend's required_with rule); `details` only
 * exists on create (it seeds the first timeline note — edits add notes
 * instead). Schema factories take a translator scoped to the `validation`
 * namespace.
 */
export function jobFormSchema(t: Translator) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, t("job.titleRequired"))
        .max(200, t("length.title", { max: 200 })),
      contact_id: z.string().min(1, t("common.contactRequired")),
      description: z.string().max(5000, t("length.description", { max: 5000 })),
      priority: z.enum(["low", "normal", "high"]),
      /** "" = unassigned. */
      assignee_user_id: z.string(),
      /** Minutes input; "" = use the module default. */
      estimated_minutes: z
        .string()
        .refine((value) => {
          if (value.trim() === "") return true;
          const minutes = Number(value);
          return Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440;
        }, t("job.estimatedMinutesRange", { min: 1, max: 1440 })),
      address_line1: z.string().max(200, t("length.street", { max: 200 })),
      address_line2: z.string().max(200, t("length.generic", { max: 200 })),
      address_city: z.string().max(100, t("length.suburb", { max: 100 })),
      address_region: z.string().max(100, t("length.state", { max: 100 })),
      address_postal_code: z.string().max(20, t("length.postcode", { max: 20 })),
      details: z.string().max(5000, t("length.notes", { max: 5000 })),
    })
    .superRefine((values, ctx) => {
      const anyAddress =
        values.address_line1.trim() !== "" ||
        values.address_line2.trim() !== "" ||
        values.address_city.trim() !== "" ||
        values.address_region.trim() !== "" ||
        values.address_postal_code.trim() !== "";
      if (!anyAddress) return;

      if (values.address_line1.trim() === "") {
        ctx.addIssue({
          code: "custom",
          message: t("job.streetRequired"),
          path: ["address_line1"],
        });
      }
      if (values.address_city.trim() === "") {
        ctx.addIssue({
          code: "custom",
          message: t("job.cityRequired"),
          path: ["address_city"],
        });
      }
    });
}

export type JobFormValues = z.infer<ReturnType<typeof jobFormSchema>>;

export function defaultJobValues(): JobFormValues {
  return {
    title: "",
    contact_id: "",
    description: "",
    priority: "normal",
    assignee_user_id: "",
    estimated_minutes: "",
    address_line1: "",
    address_line2: "",
    address_city: "",
    address_region: "",
    address_postal_code: "",
    details: "",
  };
}

export function jobToFormValues(job: Job): JobFormValues {
  return {
    title: job.title,
    contact_id: job.contact?.id ?? "",
    description: job.description ?? "",
    priority: job.priority,
    assignee_user_id: job.assignee?.id ?? "",
    estimated_minutes: job.estimated_minutes !== null ? String(job.estimated_minutes) : "",
    address_line1: job.service_address?.line1 ?? "",
    address_line2: job.service_address?.line2 ?? "",
    address_city: job.service_address?.city ?? "",
    address_region: job.service_address?.region ?? "",
    address_postal_code: job.service_address?.postal_code ?? "",
    details: "",
  };
}

function toServiceAddress(values: JobFormValues): JobServiceAddress | null {
  const line1 = values.address_line1.trim();
  const line2 = values.address_line2.trim();
  const city = values.address_city.trim();
  const region = values.address_region.trim();
  const postal = values.address_postal_code.trim();

  if (line1 === "" && line2 === "" && city === "" && region === "" && postal === "") {
    return null;
  }

  return {
    line1,
    ...(line2 !== "" ? { line2 } : {}),
    city,
    ...(region !== "" ? { region } : {}),
    ...(postal !== "" ? { postal_code: postal } : {}),
  };
}

export function toStoreJobPayload(values: JobFormValues): StoreJobPayload {
  const description = values.description.trim();
  const details = values.details.trim();
  const address = toServiceAddress(values);

  return {
    title: values.title.trim(),
    contact_id: values.contact_id,
    priority: values.priority as JobPriority,
    ...(description !== "" ? { description } : {}),
    ...(address !== null ? { service_address: address } : {}),
    ...(values.assignee_user_id !== "" ? { assignee_user_id: values.assignee_user_id } : {}),
    ...(values.estimated_minutes.trim() !== ""
      ? { estimated_minutes: Number(values.estimated_minutes) }
      : {}),
    ...(details !== "" ? { details } : {}),
  };
}

/** PATCH counterpart — explicit nulls clear stored values. */
export function toUpdateJobPayload(values: JobFormValues): UpdateJobPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    priority: values.priority as JobPriority,
    service_address: toServiceAddress(values),
    assignee_user_id: values.assignee_user_id || null,
    estimated_minutes:
      values.estimated_minutes.trim() !== "" ? Number(values.estimated_minutes) : null,
  };
}

/** The schedule/reschedule dialog — a business-local date + time pair. */
export function scheduleJobSchema(t: Translator) {
  return z.object({
    /** Calendar key "YYYY-MM-DD". */
    date: z.string().min(1, t("common.dateRequired")),
    time: z.string().regex(/^\d{2}:\d{2}$/, t("common.timeRequired")),
  });
}

export type ScheduleJobValues = z.infer<ReturnType<typeof scheduleJobSchema>>;

/**
 * The items editor (mirrors Store/UpdateBusinessJobLineItemRequest). Prices
 * are edited in dollars and converted to integer cents at the payload
 * boundary; job items carry no tax — VAT applies when the job is invoiced.
 */
function jobLineItemSchema(t: Translator) {
  return z.object({
    /** Present = an existing row (PATCH); absent = a new one (POST). */
    itemId: z.string().optional(),
    kind: z.enum(LINE_ITEM_KINDS),
    description: z
      .string()
      .trim()
      .min(1, t("lineItem.descriptionRequired"))
      .max(300, t("length.description", { max: 300 })),
    quantity: z.string().refine((value) => {
      const quantity = Number(value);
      return value.trim() !== "" && Number.isFinite(quantity) && quantity > 0 && quantity <= 99999;
    }, t("lineItem.quantityInvalid")),
    unit_price: z
      .string()
      .refine((value) => dollarsToCents(value) !== null, t("lineItem.unitPriceInvalid")),
  });
}

export type JobLineItemFormValues = z.infer<ReturnType<typeof jobLineItemSchema>>;

export function jobLineItemsSchema(t: Translator) {
  return z.object({
    items: z.array(jobLineItemSchema(t)).min(1, t("lineItem.itemsRequired")),
  });
}

export type JobLineItemsFormValues = z.infer<ReturnType<typeof jobLineItemsSchema>>;

export function emptyJobLineItem(): JobLineItemFormValues {
  return { kind: "labour", description: "", quantity: "1", unit_price: "" };
}

export function jobLineItemToFormValues(item: JobLineItem): JobLineItemFormValues {
  return {
    itemId: item.id,
    kind: item.kind,
    description: item.description,
    quantity: String(Number(item.quantity)),
    unit_price: centsToDollarsInput(item.unit_price_cents),
  };
}

export function toJobLineItemPayload(
  values: JobLineItemFormValues,
  position: number
): StoreJobLineItemPayload {
  return {
    kind: values.kind,
    description: values.description.trim(),
    quantity: Number(values.quantity),
    unit_price_cents: dollarsToCents(values.unit_price) ?? 0,
    position,
  };
}
