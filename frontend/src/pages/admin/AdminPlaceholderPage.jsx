
import { Construction } from "lucide-react";

export default function AdminPlaceholderPage({ title, description }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Construction size={26} />
        </div>

        <h2 className="mt-4 font-semibold text-slate-900">
          Module coming next
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          This administration module will be implemented
          in the next development stages.
        </p>
      </div>
    </div>
  );
}
