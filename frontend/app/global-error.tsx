"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f8f6f3]">
        <div className="max-w-md w-full rounded-2xl p-8 text-center bg-white border border-slate-200 shadow-lg">
          <span className="text-5xl mb-4 block">😵</span>
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Something went wrong
          </h1>
          <p className="text-slate-600 mb-6 text-sm">
            A critical error occurred. Please refresh the page.
          </p>
          <button
            onClick={reset}
            className="rounded-2xl text-white px-6 py-3 font-semibold transition-all"
            style={{ background: "#7c3aed" }}
          >
            Refresh page
          </button>
        </div>
      </body>
    </html>
  );
}
