"use client";

import { useRef, useState } from "react";
import { FileTextIcon, ImagePlusIcon, Trash2Icon } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { ErrorState } from "@/components/error-state";
import { useDeleteJobPhoto, useJobPhotos, useUploadJobPhoto } from "@/hooks/use-jobs";
import type { JobPhoto } from "@/lib/api/types";

const ACCEPTED = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function PhotoTile({ photo, onDelete }: { photo: JobPhoto; onDelete: () => void }) {
  const isImage = photo.mime_type.startsWith("image/");

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border">
      <a
        href={photo.url}
        target="_blank"
        rel="noreferrer"
        className="block"
        aria-label={`Open ${photo.name}`}
      >
        {isImage ? (
          // Signed, expiring URL off the private disk — a plain <img>, not
          // next/image (the optimizer would refetch after the signature dies).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={photo.name}
            loading="lazy"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 bg-muted/50 p-2 text-muted-foreground">
            <FileTextIcon className="size-6" />
            <span className="max-w-full truncate text-[11px]">{photo.name}</span>
          </div>
        )}
      </a>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <span className="truncate text-[11px] text-white">{formatSize(photo.size)}</span>
        <Button
          size="icon"
          variant="ghost"
          className="pointer-events-auto size-7 text-white hover:bg-white/20 hover:text-white"
          onClick={onDelete}
          aria-label={`Delete ${photo.name}`}
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Site photos and attachments — JPEG/PNG/WebP/PDF up to 10 MB each. */
export function JobPhotosCard({
  businessUuid,
  jobUuid,
}: {
  businessUuid: string;
  jobUuid: string;
}) {
  const photosQuery = useJobPhotos(businessUuid, jobUuid);
  const uploadPhoto = useUploadJobPhoto(businessUuid);
  const deletePhoto = useDeleteJobPhoto(businessUuid);

  const inputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState<JobPhoto | null>(null);

  const upload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error("That file is over 10 MB — resize it and try again.");
      return;
    }

    uploadPhoto.mutate(
      { jobId: jobUuid, file },
      {
        onSuccess: () => toast.success("Photo added"),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deletePhoto.mutate(
      { jobId: jobUuid, photoId: deleting.id },
      {
        onSuccess: () => toast.success("Photo deleted"),
        onError: (error) => toast.error(error.message),
        onSettled: () => setDeleting(null),
      }
    );
  };

  return (
    <DetailCard title="Photos & files" accent>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => {
          upload(event.target.files);
          event.target.value = "";
        }}
      />

      {photosQuery.isPending ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      ) : photosQuery.isError ? (
        <ErrorState
          title="Couldn't load photos"
          message={photosQuery.error.message}
          onRetry={() => photosQuery.refetch()}
        />
      ) : (
        <>
          {photosQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No photos yet — site shots and paperwork live here with the job.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photosQuery.data.map((photo) => (
                <PhotoTile key={photo.id} photo={photo} onDelete={() => setDeleting(photo)} />
              ))}
            </div>
          )}

          <div className="flex justify-start">
            <Button
              size="sm"
              variant="outline"
              disabled={uploadPhoto.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlusIcon />
              {uploadPhoto.isPending ? "Uploading…" : "Add photo or file"}
            </Button>
          </div>
        </>
      )}

      {deleting && (
        <AlertDialog open onOpenChange={(next) => !next && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleting.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                The file is removed from this job permanently.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep file</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deletePhoto.isPending}
                onClick={confirmDelete}
              >
                {deletePhoto.isPending ? "Deleting…" : "Delete file"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </DetailCard>
  );
}
