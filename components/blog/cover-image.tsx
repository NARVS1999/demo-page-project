"use client";

// Cover image (client): plain <img> with onError → null so broken/mock URLs
// (https://mock.storage/...) render nothing — a text-only card is a valid
// newspaper card (RESEARCH A5). Always sets alt (UI-SPEC a11y).

import * as React from "react";
import { cn } from "@/lib/utils";

export function CoverImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
