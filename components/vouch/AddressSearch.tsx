"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress, getAddress } from "viem";
import Button from "@/components/ui/Button";

export default function AddressSearch() {
  const router = useRouter();
  const [inputVal, setInputVal] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    if (!isAddress(clean)) {
      setErrorMsg("Please enter a valid 0x… address.");
      return;
    }

    setErrorMsg(null);
    router.push(`/a/${getAddress(clean)}`);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setErrorMsg(null);
          }}
          placeholder="Look up any address (0x…)"
          className="flex-1 px-4 py-2.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          aria-label="Look up wallet address constellation"
        />
        <Button type="submit" tone="subtle" scale="regular">
          Explore Star
        </Button>
      </form>
      {errorMsg && (
        <p className="mt-2 text-xs text-[var(--danger)] text-center font-mono" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
