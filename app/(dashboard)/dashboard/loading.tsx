export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 animate-pulse" aria-busy="true" aria-label="Loading forms">
      <div className="mb-8">
        <div className="h-7 w-36 rounded-md bg-slate-200" />
        <div className="mt-2 h-4 w-64 rounded-md bg-slate-200/70" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="h-28 bg-slate-100" />
            <div className="p-5 space-y-3">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/3 rounded bg-slate-200/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
