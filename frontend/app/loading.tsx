export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="fixed inset-0 -z-10" style={{ background: "var(--color-bg)" }} />
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
        <p className="text-slate-700 font-semibold">Loading…</p>
      </div>
    </div>
  );
}
