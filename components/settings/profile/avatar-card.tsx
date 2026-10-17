"use client";

import { useRef } from "react";
import { UserRoundIcon } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteAvatar, useUploadAvatar } from "@/hooks/use-profile";
import type { UserAvatar } from "@/lib/api/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarCard({ avatar }: { avatar: UserAvatar | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();
  const remove = useDeleteAvatar();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use a JPEG, PNG, WebP or SVG image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("The photo must be 2 MB or smaller.");
      return;
    }
    upload.mutate(file, {
      onSuccess: () => toast.success("Photo updated"),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">Profile picture</CardTitle>
        <CardDescription>JPEG, PNG, WebP or SVG, up to 2 MB.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not an optimizable static asset
          <img
            src={avatar.url}
            alt="Profile picture"
            className="size-16 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground">
            <UserRoundIcon className="size-6" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending && <Spinner />}
            {avatar ? "Replace" : "Upload photo"}
          </Button>
          {avatar && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button type="button" variant="ghost" disabled={remove.isPending} />}
              >
                {remove.isPending && <Spinner />}
                Remove
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove your photo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You can upload a new one at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      remove.mutate(undefined, {
                        onSuccess: () => toast.success("Photo removed"),
                        onError: (error) => toast.error(error.message),
                      })
                    }
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
