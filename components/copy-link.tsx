"use client";

import { useState } from "react";

interface CopyLinkProps {
  url: string;
  label?: string;
}

export function CopyLink({ url, label = "Copy link" }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-[8px] bg-violet px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-violet-dark"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
