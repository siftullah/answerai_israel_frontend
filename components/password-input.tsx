"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/**
 * Password input with a show/hide toggle. Drop-in for <Input type="password">
 * — forwards all input props (incl. react-hook-form register spreads).
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupInput>, "type">) {
  const t = useTranslations("ui");
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup>
      <InputGroupInput
        type={visible ? "text" : "password"}
        className={cn("h-min", className)}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          aria-label={visible ? t("passwordInput.hide") : t("passwordInput.show")}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
