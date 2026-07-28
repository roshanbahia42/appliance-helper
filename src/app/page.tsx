"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { CATEGORIES, type Category, type Subcategory } from "@/lib/categories";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormState {
  name: string;
  email: string;
  phone: string;
  description: string;
}

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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-medium text-[#0f2044] hover:opacity-70 transition-opacity mb-2"
    >
      ← Back
    </button>
  );
}

function UrgentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
      ⚠ {label}
    </span>
  );
}

const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

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
  const [emailError, setEmailError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [solved, setSolved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const folderId = crypto.randomUUID();
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(Math.round((i / files.length) * 100));
      const file = files[i];
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${folderId}/${i}-${Date.now()}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("ticket-media")
        .upload(path, file);
      if (uploadError || !data) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError?.message ?? "no response from storage"}`);
      }
      const { data: { publicUrl } } = supabase.storage
        .from("ticket-media")
        .getPublicUrl(data.path);
      urls.push(publicUrl);
    }
    setUploadProgress(100);
    return urls;
  };

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

  const fetchSuggestions = (input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSelectedProperty("");
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?input=${encodeURIComponent(input)}`);
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);
  };

  const requiresDescription = !hasSubcategories(
    category ?? ({ subcategories: [] } as unknown as Category)
  );

  const isFormValid =
    form.name &&
    form.email &&
    validateEmail(form.email) &&
    selectedProperty &&
    (!requiresDescription || form.description);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateEmail(form.email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setIsUploading(true);
      const mediaUrls = await uploadFiles();
      setIsUploading(false);
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
          media_urls: mediaUrls,
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
                  className={`flex items-center justify-center p-4 rounded-xl border text-center transition-all min-h-[72px] ${
                    cat.isEmergency
                      ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0f2044] hover:bg-blue-50 hover:text-[#0f2044]"
                  }`}
                >
                  <span className="text-xs font-semibold leading-tight">{cat.name}</span>
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
        <header className="bg-[#0f2044] px-6 pt-6 pb-5">
          <div className="max-w-xl mx-auto">
            {category.isEmergency && <UrgentBadge label="Emergency" />}
            <h1 className="text-xl font-bold text-white">{category.name}</h1>
            <p className="text-white/70 text-sm mt-0.5">Select the specific issue</p>
            <ProgressBar step={2} />
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6 flex flex-col gap-3">
          <BackButton onClick={goBack} />
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
        <header className="bg-[#0f2044] px-6 pt-6 pb-5">
          <div className="max-w-xl mx-auto">
            {isUrgent && <UrgentBadge label={category.isEmergency ? "Emergency" : "Urgent"} />}
            <h1 className="text-xl font-bold text-white">{subcategory.name}</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {isUrgent ? "Follow these steps immediately" : "Before you report, please try these steps"}
            </p>
            <ProgressBar step={3} />
          </div>
        </header>

        <div className="max-w-xl mx-auto p-6 flex flex-col gap-4">
          <BackButton onClick={goBack} />
          <div
            className={`rounded-xl border p-5 ${
              isUrgent ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{isUrgent ? "⚠️" : "ℹ️"}</span>
              <h2 className={`font-semibold text-sm ${isUrgent ? "text-red-900" : "text-blue-900"}`}>
                {isUrgent ? "Emergency steps" : "Troubleshooting tips"}
              </h2>
            </div>
            <ol className="flex flex-col gap-3">
              {subcategory.tips.map((tip, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isUrgent ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                    }`}
                  >
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
            <h1 className="text-xl font-bold text-white">Which property?</h1>
            <p className="text-blue-200 text-sm mt-0.5">Select your property address</p>
            <ProgressBar step={4} />
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6">
          <BackButton onClick={goBack} />
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
                  setShowSuggestions(true);
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="e.g. 12 Example Street, London"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedProperty && (
                <span className="absolute right-3 top-9 text-green-600 text-sm">✓</span>
              )}
              {suggestionsLoading && propertySearch.length > 1 && !selectedProperty && (
                <p className="mt-2 text-xs text-slate-400">Searching...</p>
              )}
              {showSuggestions && suggestions.length > 0 && !selectedProperty && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {suggestions.map((p: string) => (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProperty(p);
                          setPropertySearch(p);
                          setShowSuggestions(false);
                          setSuggestions([]);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-[#0f2044] border-b border-slate-100 last:border-0"
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!suggestionsLoading &&
                showSuggestions &&
                propertySearch.length > 1 &&
                suggestions.length === 0 &&
                !selectedProperty && (
                  <p className="mt-2 text-xs text-slate-500">
                    No suggestions found — try a different format, e.g. house number then street name.
                  </p>
                )}
            </div>
            <p className="text-xs text-slate-400">
              Start typing your full address and select it from the suggestions.
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
            <h1 className="text-xl font-bold text-white">Your Details</h1>
            <p className="text-blue-200 text-sm mt-0.5">Almost done — just a few more details</p>
            <ProgressBar step={5} />
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6">
          <BackButton onClick={goBack} />
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex gap-2">
                <span>📍</span>
                <span>{selectedProperty}</span>
              </div>
              {category && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex gap-2">
                  <span>{category.icon}</span>
                  <span>
                    {category.name}
                    {subcategory ? ` — ${subcategory.name}` : ""}
                  </span>
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
                    type="text"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      setEmailError("");
                    }}
                    onBlur={(e) => {
                      if (e.target.value && !validateEmail(e.target.value)) {
                        setEmailError("Please enter a valid email address");
                      }
                    }}
                    required
                    placeholder="you@email.com"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      emailError ? "border-red-400" : "border-slate-300"
                    }`}
                  />
                  {emailError && (
                    <p className="text-red-600 text-xs mt-1">{emailError}</p>
                  )}
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
                {requiresDescription ? "Please describe the issue *" : "Description (optional)"}
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

            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Photos or videos (optional)
                </label>
                <p className="text-xs text-slate-400 mb-2">Up to 5 files, 50MB each</p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    const oversized = selected.filter((f) => f.size > 50 * 1024 * 1024);
                    if (oversized.length > 0) {
                      setError(`${oversized.map((f) => f.name).join(", ")} exceeds the 50MB limit`);
                      e.target.value = "";
                      return;
                    }
                    setError("");
                    setFiles(selected.slice(0, 5));
                  }}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#0f2044] file:text-white hover:file:bg-blue-900 file:cursor-pointer"
                />
              </div>
              {files.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {files.map((file, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="ml-2 text-slate-400 hover:text-slate-600 shrink-0 text-base leading-none"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isUploading && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-[#0f2044] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!isFormValid || loading || isUploading}
              className="bg-[#0f2044] text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? `Uploading ${uploadProgress}%...` : loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
