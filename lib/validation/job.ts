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
import { centsToDollarsInput, dollarsToCents } from "@/lib/money";

/**
 * Loose mirror of Store/UpdateBusinessJobRequest. The site address is a flat
 * group of optional inputs — but once any of it is filled in, street and
 * suburb become required (the backend's required_with rule); `details` only
 * exists on create (it seeds the first timeline note — edits add notes
 * instead).
 */
export const jobFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the job a short title")
      .max(200, "Keep the title under 200 characters"),
    contact_id: z.string().min(1, "Choose a contact"),
    description: z.string().max(5000, "Keep the description under 5,000 characters"),
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
      }, "Enter whole minutes between 1 and 1440"),
    address_line1: z.string().max(200, "Keep the street under 200 characters"),
    address_line2: z.string().max(200, "Keep this under 200 characters"),
    address_city: z.string().max(100, "Keep the suburb under 100 characters"),
    address_region: z.string().max(100, "Keep the state under 100 characters"),
    address_postal_code: z.string().max(20, "Keep the postcode under 20 characters"),
    details: z.string().max(5000, "Keep the notes under 5,000 characters"),
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
      ctx.addIssue({ code: "custom", message: "Add the street address", path: ["address_line1"] });
    }
    if (values.address_city.trim() === "") {
      ctx.addIssue({ code: "custom", message: "Add the suburb or city", path: ["address_city"] });
    }
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

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
export const scheduleJobSchema = z.object({
  /** Calendar key "YYYY-MM-DD". */
  date: z.string().min(1, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
});

export type ScheduleJobValues = z.infer<typeof scheduleJobSchema>;

/**
 * The items editor (mirrors Store/UpdateBusinessJobLineItemRequest). Prices
 * are edited in dollars and converted to integer cents at the payload
 * boundary; job items carry no tax — GST applies when the job is invoiced.
 */
const jobLineItemSchema = z.object({
  /** Present = an existing row (PATCH); absent = a new one (POST). */
  itemId: z.string().optional(),
  kind: z.enum(LINE_ITEM_KINDS),
  description: z
    .string()
    .trim()
    .min(1, "Describe the work or part")
    .max(300, "Keep the description under 300 characters"),
  quantity: z.string().refine((value) => {
    const quantity = Number(value);
    return value.trim() !== "" && Number.isFinite(quantity) && quantity > 0 && quantity <= 99999;
  }, "Enter a quantity above zero"),
  unit_price: z
    .string()
    .refine((value) => dollarsToCents(value) !== null, "Enter a price like 180 or 180.50"),
});

export type JobLineItemFormValues = z.infer<typeof jobLineItemSchema>;

export const jobLineItemsSchema = z.object({
  items: z.array(jobLineItemSchema).min(1, "Add at least one line item"),
});

export type JobLineItemsFormValues = z.infer<typeof jobLineItemsSchema>;

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
