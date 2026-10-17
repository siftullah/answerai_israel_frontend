"use client";

import { useState } from "react";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import {
  useCreateFaqCategory,
  useDeleteFaqCategory,
  useFaqCategories,
  useUpdateFaqCategory,
} from "@/hooks/use-faq-categories";
import type { FaqCategory } from "@/lib/api/types";

export function ManageCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const categoriesQuery = useFaqCategories(business.id);
  const create = useCreateFaqCategory(business.id);
  const update = useUpdateFaqCategory(business.id);
  const remove = useDeleteFaqCategory(business.id);

  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<FaqCategory | null>(null);

  const add = () => {
    const name = newName.trim();
    if (!name || name.length > 100) return;
    create.mutate(
      { name },
      {
        onSuccess: () => setNewName(""),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const rename = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name || name.length > 100) return;
    update.mutate(
      { id: editing.id, name },
      {
        onSuccess: () => setEditing(null),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>FAQ categories</DialogTitle>
            <DialogDescription>Group FAQs so they&apos;re easier to manage.</DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder="New category"
              maxLength={100}
              autoComplete="off"
            />
            <Button
              type="button"
                onClick={add}
              disabled={create.isPending || newName.trim() === ""}
            >
              {create.isPending ? <Spinner /> : <PlusIcon />}
              Add
            </Button>
          </div>

          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {(categoriesQuery.data ?? []).map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/50"
              >
                {editing?.id === category.id ? (
                  <>
                    <Input
                      value={editing.name}
                      onChange={(event) =>
                        setEditing({ id: category.id, name: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          rename();
                        }
                      }}
                      maxLength={100}
                      autoFocus
                      className="h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Save name"
                      disabled={update.isPending}
                      onClick={rename}
                    >
                      <CheckIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Cancel rename"
                      onClick={() => setEditing(null)}
                    >
                      <XIcon />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {category.name}
                      {typeof category.faqs_count === "number" && (
                        <span className="ml-1.5 text-sm text-muted-foreground">
                          {category.faqs_count}
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rename ${category.name}`}
                      onClick={() => setEditing({ id: category.id, name: category.name })}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => setDeleting(category)}
                    >
                      <Trash2Icon />
                    </Button>
                  </>
                )}
              </li>
            ))}
            {categoriesQuery.data && categoriesQuery.data.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted-foreground">No categories yet.</p>
            )}
          </ul>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              FAQs in this category keep their answers but lose the category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                remove.mutate(deleting.id, {
                  onSuccess: () => toast.success("Category deleted"),
                  onError: (error) => toast.error(error.message),
                });
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
