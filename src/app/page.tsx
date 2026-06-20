"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { name: "Heating", icon: "🌡️" },
  { name: "Plumbing", icon: "🚿" },
  { name: "Electrical", icon: "⚡" },
  { name: "Kitchen Appliances", icon: "🍽️" },
  { name: "Bathroom", icon: "🛁" },
  { name: "Doors & Windows", icon: "🚪" },
  { name: "Garden", icon: "🌿" },
  { name: "Lost Key", icon: "🔑" },
  { name: "Other", icon: "🔧" },
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    property_address: "",
    category: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      router.push(`/confirmation/${data.reference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const isValid =
    form.tenant_name &&
    form.tenant_email &&
    form.property_address &&
    form.category &&
    form.description;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0f2044] px-6 py-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-white">
            Student Maintenance Hub
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Report an issue at your property — we'll help you troubleshoot
            before arranging a visit
          </p>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Your Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full name *
              </label>
              <input
                name="tenant_name"
                value={form.tenant_name}
                onChange={handleChange}
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
                  name="tenant_email"
                  type="email"
                  value={form.tenant_email}
                  onChange={handleChange}
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
                  name="tenant_phone"
                  type="tel"
                  value={form.tenant_phone}
                  onChange={handleChange}
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
                name="property_address"
                value={form.property_address}
                onChange={handleChange}
                required
                placeholder="e.g. 12 Example Street, Room 3"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Issue Type
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.name })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                    form.category === cat.name
                      ? "bg-[#0f2044] border-[#0f2044] text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-xs font-medium leading-tight">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Describe the Issue
            </h2>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Please describe what's happening in as much detail as possible — when it started, what you've already tried, any error messages or noises..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid || loading}
            className="bg-[#0f2044] text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Submitting... (generating your guide)"
              : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
