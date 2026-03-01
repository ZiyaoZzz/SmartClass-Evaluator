"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-foreground">Admin page error</h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
      <a href="/admin" className="text-sm text-primary underline">
        Back to admin
      </a>
    </div>
  );
}
