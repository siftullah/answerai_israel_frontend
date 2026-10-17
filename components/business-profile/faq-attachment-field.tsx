"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CopyIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { OwnedFaqDialog } from "@/components/business-profile/faqs/owned-faq-dialog";
import { useBusiness } from "@/components/business/business-provider";
import { useCreateFaq, useDeleteFaq, useDuplicateFaq, useFaqs } from "@/hooks/use-faqs";
import type { Faq, FaqMode } from "@/lib/api/types";
import type { PendingOwnFaq } from "@/lib/validation/knowledge";

export interface FaqOwner {
  type: "service" | "product";
  id: string;
}

/** Inline add/edit form for an own FAQ — no nested dialog. */
function OwnFaqComposer({
  idPrefix,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  idPrefix: string;
  initial?: PendingOwnFaq;
  busy?: boolean;
  onSave: (row: PendingOwnFaq) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();
    if (!trimmedQuestion || !trimmedAnswer) {
      setError("Add both a question and an answer.");
      return;
    }
    if (trimmedQuestion.length > 500 || trimmedAnswer.length > 5000) {
      setError("Keep the question under 500 and the answer under 5,000 characters.");
      return;
    }
    onSave({ question: trimmedQuestion, answer: trimmedAnswer });
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border p-3">
      <Input
        id={`${idPrefix}-own-faq-question`}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Do you offer free quotes?"
        autoComplete="off"
        aria-label="Question"
      />
      <Textarea
        id={`${idPrefix}-own-faq-answer`}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        className="min-h-28"
        placeholder="Yes — we quote most jobs within one business day…"
        aria-label="Answer"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={save}>
          {busy && <Spinner />}
          Save FAQ
        </Button>
      </div>
    </div>
  );
}

/**
 * The FAQ step for services/products. Section A manages the item's OWN
 * FAQs — server-backed when editing a saved item (`owner`), collected into
 * `pending_own_faqs` while creating (`allowPendingOwn`), hidden in draft
 * review. Section B is a checkbox list over business-wide FAQs that
 * derives `faq_mode`/`faq_ids`: everything checked ⇒ inherit, a subset ⇒
 * custom.
 */
export function FaqAttachmentField({
  idPrefix,
  owner,
  allowPendingOwn,
}: {
  idPrefix: string;
  owner?: FaqOwner;
  allowPendingOwn?: boolean;
}) {
  const { business } = useBusiness();
  const faqsQuery = useFaqs(business.id);
  const ownedQuery = useFaqs(
    business.id,
    owner
      ? owner.type === "service"
        ? { service_id: owner.id }
        : { product_id: owner.id }
      : {}
  );
  const createFaq = useCreateFaq(business.id);
  const duplicate = useDuplicateFaq(business.id);
  const deleteFaq = useDeleteFaq(business.id);

  const form = useFormContext();
  const mode = useWatch({ name: "faq_mode" }) as FaqMode;
  const ids = (useWatch({ name: "faq_ids" }) ?? []) as string[];
  const pendingRows = (useWatch({ name: "pending_own_faqs" }) ?? []) as PendingOwnFaq[];

  const [search, setSearch] = useState("");
  /** null = closed; -1 = adding; >= 0 = editing that pending row. */
  const [composerIndex, setComposerIndex] = useState<number | null>(null);
  const [editingOwned, setEditingOwned] = useState<Faq | null>(null);
  const [deletingOwned, setDeletingOwned] = useState<Faq | null>(null);

  const ownedFaqs = owner ? (ownedQuery.data ?? []) : [];
  const ownerNoun = owner?.type ?? "service";
  const businessFaqs = faqsQuery.data ?? [];
  const allIds = businessFaqs.map((faq) => faq.id);
  const checkedIds = mode === "inherit" ? allIds : ids;

  const query = search.trim().toLowerCase();
  const visibleFaqs = query
    ? businessFaqs.filter((faq) => faq.question.toLowerCase().includes(query))
    : businessFaqs;

  /** Writes the checked set back as inherit (everything) or custom (subset). */
  const applyChecked = (next: string[]) => {
    const coversAll = allIds.length > 0 && allIds.every((id) => next.includes(id));
    form.setValue("faq_mode", coversAll ? "inherit" : "custom", { shouldDirty: true });
    form.setValue("faq_ids", coversAll ? [] : next, { shouldDirty: true });
  };

  const toggle = (faqId: string) => {
    applyChecked(
      checkedIds.includes(faqId)
        ? checkedIds.filter((id) => id !== faqId)
        : [...checkedIds, faqId]
    );
  };

  const duplicateFaq = (faqId: string) => {
    if (!owner) return;
    duplicate.mutate(
      {
        faqId,
        owner: owner.type === "service" ? { service_id: owner.id } : { product_id: owner.id },
      },
      {
        onSuccess: () => {
          // The backend removed the source from this owner's selection —
          // mirror that locally (inherit flips to custom-minus-one) so
          // saving doesn't re-attach it.
          applyChecked(checkedIds.filter((id) => id !== faqId));
          toast.success(
            `Copy created — it now belongs to this ${ownerNoun} and can be edited independently.`
          );
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const savePendingRow = (row: PendingOwnFaq) => {
    const next = [...pendingRows];
    if (composerIndex === null || composerIndex === -1) {
      next.push(row);
    } else {
      next[composerIndex] = row;
    }
    form.setValue("pending_own_faqs", next, { shouldDirty: true });
    setComposerIndex(null);
  };

  const removePendingRow = (index: number) => {
    form.setValue(
      "pending_own_faqs",
      pendingRows.filter((_, i) => i !== index),
      { shouldDirty: true }
    );
  };

  const saveOwnedRow = (row: PendingOwnFaq) => {
    if (!owner) return;
    createFaq.mutate(
      {
        question: row.question,
        answer: row.answer,
        ...(owner.type === "service" ? { service_id: owner.id } : { product_id: owner.id }),
      },
      {
        onSuccess: () => {
          toast.success(`FAQ added to this ${ownerNoun}`);
          setComposerIndex(null);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const showOwnSection = Boolean(owner) || allowPendingOwn;
  const composerOpen = composerIndex !== null;
  const editingPending =
    composerIndex !== null && composerIndex >= 0 ? pendingRows[composerIndex] : undefined;

  return (
    <div className="flex flex-col gap-5">
      {showOwnSection && (
        <>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-medium">
                  This {ownerNoun}&apos;s own FAQs
                </p>
                <p className="text-sm text-muted-foreground">
                  Only used when discussing this {ownerNoun} — they live here, not on
                  the FAQs page.
                </p>
              </div>
              {!composerOpen && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setComposerIndex(-1)}
                >
                  <PlusIcon />
                  Add FAQ
                </Button>
              )}
            </div>

            {owner && ownedFaqs.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {ownedFaqs.map((faq) => (
                  <li
                    key={faq.id}
                    className="flex items-center gap-1.5 rounded-xl border px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{faq.question}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${faq.question}`}
                      onClick={() => setEditingOwned(faq)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${faq.question}`}
                      onClick={() => setDeletingOwned(faq)}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {allowPendingOwn && pendingRows.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {pendingRows.map((row, index) => (
                  <li
                    key={`${row.question}-${index}`}
                    className="flex items-center gap-1.5 rounded-xl border px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{row.question}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${row.question}`}
                      onClick={() => setComposerIndex(index)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${row.question}`}
                      onClick={() => removePendingRow(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {composerOpen && (
              <OwnFaqComposer
                idPrefix={idPrefix}
                initial={editingPending}
                busy={createFaq.isPending}
                onSave={owner ? saveOwnedRow : savePendingRow}
                onCancel={() => setComposerIndex(null)}
              />
            )}

            {!composerOpen &&
              ownedFaqs.length === 0 &&
              pendingRows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No own FAQs yet — add answers specific to this {ownerNoun}.
                </p>
              )}
          </div>

          <Separator />
        </>
      )}

      <div className="flex flex-col gap-2.5">
        <div>
          <p className="text-base font-medium">Business-wide FAQs</p>
          <p className="text-sm text-muted-foreground">
            {mode === "inherit"
              ? "All selected — new business FAQs apply automatically."
              : "A custom selection — new business FAQs won't apply until you tick them."}
          </p>
        </div>

        {faqsQuery.isSuccess && businessFaqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No business-wide FAQs yet — add them in the FAQs section.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search FAQs"
                autoComplete="off"
                className="max-w-56"
              />
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => applyChecked(allIds)}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => applyChecked([])}
              >
                Select none
              </button>
            </div>

            <div className="flex max-h-64 flex-col overflow-y-auto rounded-2xl border">
              {visibleFaqs.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-muted-foreground">
                  {faqsQuery.isPending ? "Loading…" : "No FAQs match your search."}
                </p>
              ) : (
                visibleFaqs.map((faq, index) => (
                  <label
                    key={faq.id}
                    htmlFor={`${idPrefix}-faq-${faq.id}`}
                    className={
                      "flex cursor-pointer items-center gap-2.5 px-3 py-2.5 hover:bg-muted/40" +
                      (index > 0 ? " border-t" : "")
                    }
                  >
                    <Checkbox
                      id={`${idPrefix}-faq-${faq.id}`}
                      checked={checkedIds.includes(faq.id)}
                      onCheckedChange={() => toggle(faq.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{faq.question}</span>
                    {owner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title={`Make a copy just for this ${ownerNoun}`}
                        aria-label={`Copy FAQ into this ${ownerNoun}`}
                        disabled={duplicate.isPending}
                        onClick={(event) => {
                          event.preventDefault();
                          duplicateFaq(faq.id);
                        }}
                      >
                        <CopyIcon />
                      </Button>
                    )}
                  </label>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {editingOwned && (
        <OwnedFaqDialog
          open
          onOpenChange={(next) => {
            if (!next) setEditingOwned(null);
          }}
          faq={editingOwned}
        />
      )}

      <AlertDialog
        open={deletingOwned !== null}
        onOpenChange={(next) => {
          if (!next) setDeletingOwned(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              Only this {ownerNoun}&apos;s own FAQ is removed — business-wide FAQs are
              unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deletingOwned) return;
                deleteFaq.mutate(deletingOwned.id, {
                  onSuccess: () => toast.success("FAQ deleted"),
                  onError: (error) => toast.error(error.message),
                });
                setDeletingOwned(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
