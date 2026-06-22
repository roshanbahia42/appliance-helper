"use client";

import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0f2044] px-6 py-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-white">
            Student Maintenance Hub
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Select the type of issue to get started
          </p>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            What is the issue?
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => router.push(`/report/${cat.slug}`)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0f2044] hover:bg-blue-50 hover:text-[#0f2044] transition-all text-center"
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-xs font-medium leading-tight">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
