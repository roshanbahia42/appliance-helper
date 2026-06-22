"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { getCategoryBySlug, type QuestionOption } from "@/lib/categories";
import { notFound } from "next/navigation";

type Answers = Record<string, string>;

export default function ReportPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = use(params);
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [form, setForm] = useState({
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    property_address: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeWarning = category.questions.reduce<string | null>((found, q) => {
    if (found) return found;
    const selected = q.options?.find((o) => o.value === answers[q.id]);
    return selected?.warning ?? null;
  }, null);

  const isUrgent = category.questions.some((q) =>
    q.options?.find((o) => o.value === answers[q.id] && o.urgent)
  );

  const requiredAnswered = category.questions
    .filter((q) => q.required)
    .every((q) => answers[q.id]);

  const isValid =
    requiredAnswered &&
    form.tenant_name &&
    form.tenant_email &&
    form.property_address;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          category: category.name,
          answers,
          urgent: isUrgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push(`/confirmation/${data.reference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0f2044] px-6 py-8">
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="text-blue-300 text-sm mb-3 hover:text-white transition-colors flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white">
            {category.icon} {category.name}
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Answer a few quick questions so we can help you faster
          </p>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Category-specific questions */}
          {category.questions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                About the Issue
              </h2>
              {category.questions.map((q) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {q.label}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </p>

                  {q.type === "radio" && q.options && (
                    <div className="flex flex-col gap-2">
                      {q.options.map((opt: QuestionOption) => {
                        const isSelected = answers[q.id] === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? opt.urgent
                                  ? "bg-red-50 border-red-400"
                                  : "bg-blue-50 border-[#0f2044]"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt.value}
                              checked={isSelected}
                              onChange={() =>
                                setAnswers({ ...answers, [q.id]: opt.value })
                              }
                              className="accent-[#0f2044]"
                            />
                            <span className="text-sm text-slate-700">
                              {opt.label}
                            </span>
                            {opt.urgent && (
                              <span className="ml-auto text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                Urgent
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "text" && (
                    <input
                      type="text"
                      value={answers[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                      placeholder={q.placeholder}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Urgent warning banner */}
          {activeWarning && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex gap-3">
              <span className="text-red-500 text-lg shrink-0">⚠️</span>
              <p className="text-sm text-red-800 leading-relaxed">{activeWarning}</p>
            </div>
          )}

          {/* Additional details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              More Detail
            </h2>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Anything else that might help — when it started, what you've already tried, any noises or smells..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Tenant details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Your Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full name *
              </label>
              <input
                value={form.tenant_name}
                onChange={(e) => setForm({ ...form, tenant_name: e.target.value })}
                required
                placeholder="e.g. Jamie Smith"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.tenant_email}
                  onChange={(e) => setForm({ ...form, tenant_email: e.target.value })}
                  required
                  placeholder="you@email.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={form.tenant_phone}
                  onChange={(e) => setForm({ ...form, tenant_phone: e.target.value })}
                  placeholder="07700 000000"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Property address *
              </label>
              <input
                value={form.property_address}
                onChange={(e) => setForm({ ...form, property_address: e.target.value })}
                required
                placeholder="e.g. 12 Example Street, Room 3"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid || loading}
            className={`text-white rounded-xl px-4 py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
              isUrgent
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#0f2044] hover:bg-blue-900"
            }`}
          >
            {loading
              ? "Submitting... (generating your guide)"
              : isUrgent
              ? "Submit Urgent Request"
              : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
