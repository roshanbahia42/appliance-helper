"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type Category, type Subcategory } from "@/lib/categories";
import { PROPERTIES } from "@/lib/properties";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormState {
  name: string;
  email: string;
  phone: string;
  description: string;
}

const STEP_LABELS: Record<Step, string> = {
  1: "Category",
  2: "Issue Type",
  3: "Help Guide",
  4: "Property",
  5: "Your Details",
};

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="flex gap-1.5 mt-4">
      {([1, 2, 3, 4, 5] as Step[]).map((s) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            s <= step ? "bg-white" : "bg-white/25"
          }`}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [history, setHistory] = useState<Step[]>([1]);
  const step = history[history.length - 1];

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [solved, setSolved] = useState(false);

  const goTo = (s: Step) => setHistory((prev) => [...prev, s]);
  const goBack = () => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1));
      setSolved(false);
    }
  };

  const hasSubcategories = (cat: Category) => cat.subcategories.length > 0;

  const selectCategory = (cat: Category) => {
    setCategory(cat);
    setSubcategory(null);
    if (hasSubcategories(cat)) {
      goTo(2);
    } else {
      goTo(4);
    }
  };

  const selectSubcategory = (sub: Subcategory) => {
    setSubcategory(sub);
    goTo(3);
  };

  const filteredProperties = PROPERTIES.filter((p) =>
    propertySearch.length > 1 &&
    p.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const requiresDescription = !hasSubcategories(category ?? { subcategories: [] } as unknown as Category);
  const isFormValid =
    form.name &&
    form.email &&
    selectedProperty &&
    (!requiresDescription || form.description);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_name: form.name,
          tenant_email: form.email,
          tenant_phone: form.phone,
          property_address: selectedProperty,
          category: category!.name,
          subcategory: subcategory?.name ?? null,
          description: form.description,
          isEmergency: category!.isEmergency ?? false,
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

  // ─── SOLVED SCREEN ────────────────────────────────────────────────────────
  if (solved) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-[#0f2044] px-6 pt-6 pb-5">
          <div className="max-w-xl mx-auto">
            <h1 className="text-xl font-bold text-white">All sorted!</h1>
            <p className="text-blue-200 text-sm mt-0.5">Glad the issue is resolved</p>
            <ProgressBar step={3} />
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6 flex flex-col gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="font-semibold text-green-900 text-lg">Great, glad it is sorted!</h2>
            <p className="text-green-700 text-sm mt-1">No further action needed.</p>
          </div>
          <button
            onClick={() => {
              setSolved(false);
              setHistory([1]);
              setCategory(null);
              setSubcategory(null);
              setPropertySearch("");
              setSelectedProperty("");
              setForm({ name: "", email: "", phone: "", description: "" });
            }}
            className="text-sm text-slate-500 underline text-center"
          >
            Report a different issue
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 1: CATEGORY GRID ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-[#0f2044] px-6 py-8">
          <div className="max-w-xl mx-auto">
            <h1 className="text-2xl font-bold text-white">Student Maintenance Hub</h1>
            <p className="text-blue-200 text-sm mt-1">Select the type of issue to get started</p>
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
              What is the issue?
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                    cat.isEmergency
                      ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0f2044] hover:bg-blue-50 hover:text-[#0f2044]"
                  }`}
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-xs font-medium leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2: SUBCATEGORY LIST ─────────────────────────────────────────────
  if (step === 2 && category) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className={`px-6 pt-6 pb-5 ${category.isEmergency ? "bg-red-700" : "bg-[#0f2044]"}`}>
          <div className="max-w-xl mx-auto">
            <button onClick={goBack} className="text-white/60 text-sm mb-3 flex items-center gap-1 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">
              {category.icon} {category.name}
            </h1>
            <p className="text-white/70 text-sm mt-0.5">Select the specific issue</p>
            <ProgressBar step={2} />
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6 flex flex-col gap-3">
          {category.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => selectSubcategory(sub)}
              className={`w-full text-left p-4 rounded-xl border bg-white transition-all ${
                sub.isUrgent
                  ? "border-red-200 hover:border-red-400 hover:bg-red-50"
                  : "border-slate-200 hover:border-[#0f2044] hover:bg-blue-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`font-medium text-sm ${sub.isUrgent ? "text-red-800" : "text-slate-800"}`}>
                    {sub.name}
                  </p>
                  {sub.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{sub.description}</p>
                  )}
                </div>
                <span className="text-slate-400 text-lg shrink-0">›</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── STEP 3: TROUBLESHOOTING TIPS ────────────────────────────────────────
  if (step === 3 && category && subcategory) {
    const isUrgent = subcategory.isUrgent || category.isEmergency;

    return (
      <div className="min-h-screen bg-slate-50">
        <header className={`px-6 pt-6 pb-5 ${isUrgent ? "bg-red-700" : "bg-[#0f2044]"}`}>
          <div className="max-w-xl mx-auto">
            <button onClick={goBack} className="text-white/60 text-sm mb-3 flex items-center gap-1 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">{subcategory.name}</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {isUrgent ? "Follow these steps immediately" : "Before you report, please try these steps"}
            </p>
            <ProgressBar step={3} />
          </div>
        </header>

        <div className="max-w-xl mx-auto p-6 flex flex-col gap-4">
          <div className={`rounded-xl border p-5 ${
            isUrgent
              ? "bg-red-50 border-red-200"
              : "bg-blue-50 border-blue-200"
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{isUrgent ? "⚠️" : "ℹ️"}</span>
              <h2 className={`font-semibold text-sm ${isUrgent ? "text-red-900" : "text-blue-900"}`}>
                {isUrgent ? "Emergency steps" : "Troubleshooting tips"}
              </h2>
            </div>
            <ol className="flex flex-col gap-3">
              {subcategory.tips.map((tip, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isUrgent ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                  }`}>
                    {i + 1}
                  </span>
                  <p className={`text-sm leading-relaxed ${isUrgent ? "text-red-900 font-medium" : "text-blue-900"}`}>
                    {tip}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <p className="text-sm font-medium text-slate-600 text-center">Did these steps fix your issue?</p>
            <button
              onClick={() => setSolved(true)}
              className="w-full bg-green-600 text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              ✓ {isUrgent ? "I have followed these steps — all safe" : "Problem solved!"}
            </button>
            <button
              onClick={() => goTo(4)}
              className={`w-full text-white rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                isUrgent ? "bg-red-700 hover:bg-red-800" : "bg-[#0f2044] hover:bg-blue-900"
              }`}
            >
              {isUrgent ? "Report to landlord →" : "I still need help →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 4: PROPERTY SELECTION ───────────────────────────────────────────
  if (step === 4) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-[#0f2044] px-6 pt-6 pb-5">
          <div className="max-w-xl mx-auto">
            <button onClick={goBack} className="text-white/60 text-sm mb-3 flex items-center gap-1 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">Which property?</h1>
            <p className="text-blue-200 text-sm mt-0.5">Select your property address</p>
            <ProgressBar step={4} />
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start typing your address *
              </label>
              <input
                type="text"
                value={selectedProperty || propertySearch}
                onChange={(e) => {
                  setPropertySearch(e.target.value);
                  setSelectedProperty("");
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="e.g. 12 Example Street"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedProperty && (
                <span className="absolute right-3 top-9 text-green-600 text-sm">✓</span>
              )}
              {showSuggestions && filteredProperties.length > 0 && !selectedProperty && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {filteredProperties.map((p) => (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProperty(p);
                          setPropertySearch(p);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-[#0f2044] border-b border-slate-100 last:border-0"
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showSuggestions && propertySearch.length > 1 && filteredProperties.length === 0 && !selectedProperty && (
                <p className="mt-2 text-xs text-red-600">
                  No matching properties found. Please check your address or contact the landlady directly.
                </p>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Your address must match one of the managed properties. If yours is not showing, please get in touch.
            </p>
          </div>
          <button
            onClick={() => goTo(5)}
            disabled={!selectedProperty}
            className="w-full mt-5 bg-[#0f2044] text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 5: TENANT DETAILS ───────────────────────────────────────────────
  if (step === 5) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-[#0f2044] px-6 pt-6 pb-5">
          <div className="max-w-xl mx-auto">
            <button onClick={goBack} className="text-white/60 text-sm mb-3 flex items-center gap-1 hover:text-white">
              ← Back
            </button>
            <h1 className="text-xl font-bold text-white">Your Details</h1>
            <p className="text-blue-200 text-sm mt-0.5">Almost done — just a few more details</p>
            <ProgressBar step={5} />
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex gap-2">
                <span>📍</span>
                <span>{selectedProperty}</span>
              </div>
              {category && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}{subcategory ? ` — ${subcategory.name}` : ""}</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">About You</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Jamie Smith"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="you@email.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="07700 000000"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {requiresDescription ? "Please describe the issue *" : "Anything else to add? (optional)"}
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required={requiresDescription}
                rows={3}
                placeholder="When did it start, what have you already tried, any error codes or unusual sounds..."
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
              disabled={!isFormValid || loading}
              className="bg-[#0f2044] text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
