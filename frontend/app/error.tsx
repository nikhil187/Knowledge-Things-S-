"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
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
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 -z-10" style={{ background: "var(--color-bg)" }} />
      <div className="card-game max-w-md w-full p-8 text-center">
        <span className="text-5xl mb-4 block">😵</span>
        <h1 className="text-xl font-bold text-slate-800 mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Something went wrong
        </h1>
        <p className="text-slate-600 mb-6 text-sm">
          We hit an unexpected error. Try again or head back home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary text-white"
          >
            Try again
          </button>
          <Link href="/" className="btn-secondary text-center">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
