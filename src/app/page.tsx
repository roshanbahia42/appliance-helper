"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type Category, type Subcategory } from "@/lib/categories";
import { iconForCategory } from "@/lib/categoryIcons";
import Brand from "./Brand";
import { ArrowLeft, CirclePlay, Info, TriangleAlert, X } from "lucide-react";
import {
  compressImage,
  fileKey,
  isVideo,
  MAX_FILES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/media";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormState {
  name: string;
  room_number: string;
  email: string;
  phone: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  room_number: "",
  email: "",
  phone: "",
  description: "",
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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-medium text-[#0f2044] hover:opacity-70 transition-opacity mb-2"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      Back
    </button>
  );
}

function UrgentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
      <TriangleAlert className="w-3 h-3" aria-hidden="true" />
      {label}
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [emailError, setEmailError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  // Distinguishes "Google rejected us" from "that address doesn't exist", so a
  // suspended key doesn't just look like a tenant mistyping their street.
  const [addressLookupBroken, setAddressLookupBroken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [solved, setSolved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(Math.round((i / files.length) * 100));
      const file = await compressImage(files[i]);

      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const { signedUrl, publicUrl, error } = await res.json();
      if (!res.ok || !signedUrl) {
        throw new Error(`Failed to prepare upload for ${file.name}: ${error ?? "unknown error"}`);
      }

      const upload = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) {
        throw new Error(`Failed to upload ${file.name}`);
      }

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
    const urgent = sub.isUrgent || (category?.isEmergency ?? false);
    goTo(urgent ? 3 : 4);
  };

  const fetchSuggestions = (input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSelectedProperty("");
    if (input.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    setSuggestionsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?input=${encodeURIComponent(input)}`);
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setAddressLookupBroken(Boolean(data.error));
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);
  };

  const isFormValid =
    form.name &&
    form.room_number &&
    form.email &&
    validateEmail(form.email) &&
    form.phone &&
    form.description &&
    files.length > 0 &&
    selectedProperty;

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
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_name: form.name,
          tenant_room: form.room_number,
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
      // Deliberately leaves loading true — the redirect is in flight, and
      // re-enabling the button here invites a double submission.
      router.push(`/confirmation/${data.reference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setIsUploading(false);
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
              setSuggestions([]);
              setForm(EMPTY_FORM);
              setFiles([]);
              setError("");
              setEmailError("");
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
            <Brand />
            <h1 className="text-2xl font-bold text-white mt-4">Report a maintenance issue</h1>
            <p className="text-blue-200 text-sm mt-1">Select the type of issue to get started</p>
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
              What is the issue?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = iconForCategory(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => selectCategory(cat)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-center transition-all h-24 ${
                      cat.isEmergency
                        ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0f2044] hover:bg-blue-50 hover:text-[#0f2044]"
                    }`}
                  >
                    {/* Decorative — the label already names the category, so a
                        screen reader shouldn't read it twice. */}
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    <span className="text-xs font-semibold leading-tight">{cat.name}</span>
                  </button>
                );
              })}
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
            <ProgressBar step={isUrgent ? 3 : 4} />
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
              {isUrgent ? (
                <TriangleAlert className="w-5 h-5 text-red-600" aria-hidden="true" />
              ) : (
                <Info className="w-5 h-5 text-blue-600" aria-hidden="true" />
              )}
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

          {!isUrgent && (
            <a
              href={`https://www.youtube.com/results?search_query=how+to+fix+${encodeURIComponent(subcategory.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <CirclePlay className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Search YouTube for a fix — <span className="text-slate-700 font-medium">{subcategory.name}</span></span>
            </a>
          )}

          <div className="flex flex-col gap-3 mt-2">
            {/* Urgent issues get no "solved" exit — even once it's safe, the
                landlady needs a record that it happened. */}
            {!isUrgent && (
              <>
                <p className="text-sm font-medium text-slate-600 text-center">
                  Did these steps fix your issue?
                </p>
                <button
                  onClick={() => setSolved(true)}
                  className="w-full bg-green-600 text-white rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  ✓ Problem solved!
                </button>
              </>
            )}
            {isUrgent && (
              <p className="text-sm text-slate-600 text-center">
                Even if it is now safe, your landlady needs a record of this.
              </p>
            )}
            <button
              onClick={() => goTo(isUrgent ? 4 : 5)}
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
            <h1 className="text-xl font-bold text-white">Find Your Property</h1>
            <p className="text-blue-200 text-sm mt-0.5">Search your address to link this report to your property.</p>
            <ProgressBar step={history[history.length - 2] === 2 ? 3 : 4} />
          </div>
        </header>
        <div className="max-w-xl mx-auto p-6">
          <BackButton onClick={goBack} />
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <div className="relative">
              <label htmlFor="property" className="block text-sm font-medium text-slate-700 mb-1">Full Address*</label>
              <input
                type="text"
                id="property"
                value={selectedProperty || propertySearch}
                onChange={(e) => {
                  setPropertySearch(e.target.value);
                  setShowSuggestions(true);
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder=""
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
                  {suggestions.map((p) => (
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
                    {addressLookupBroken
                      ? "Address search is temporarily unavailable. Please try again shortly."
                      : "No matches — make sure you start with your house or flat number."}
                  </p>
                )}
            </div>
            <p className="text-xs text-slate-400">Start with your house number, then the street — then pick your address from the list.</p>
          </div>
          <button
            onClick={() => goTo(history[history.length - 2] === 2 ? 3 : 5)}
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
              {/* Read-only confirmation of the earlier steps. Labelled rather
                  than icon-led, matching the label/value pattern used in the
                  admin detail panel. */}
              <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs flex gap-2">
                <span>📍</span>
                <span className="text-slate-600">{selectedProperty}</span>
              </div>
              {category && (
                <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs">
                  <span className="text-slate-400">Issue: </span>
                  <span className="text-slate-600">
                    {category.name}
                    {subcategory ? ` — ${subcategory.name}` : ""}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">* required fields</p>
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">About You</h2>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Full Name*</label>
                  <input
                    id="name"
                    value={form.name}
                    autoComplete="name"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder=""
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="w-28">
                  <label htmlFor="room" className="block text-sm font-medium text-slate-700 mb-1">Room No.*</label>
                  <input
                    id="room"
                    value={form.room_number}
                    onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                    placeholder=""
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email*</label>
                  <input
                    type="text"
                    id="email"
                    value={form.email}
                    autoComplete="email"
                    inputMode="email"
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
                    placeholder=""
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      emailError ? "border-red-400" : "border-slate-300"
                    }`}
                  />
                  {emailError && (
                    <p className="text-red-600 text-xs mt-1">{emailError}</p>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone*</label>
                  <input
                    type="tel"
                    id="phone"
                    value={form.phone}
                    autoComplete="tel"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder=""
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Description*</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                rows={3}
                placeholder="When did it start, what have you already tried, any unusual sounds..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Photos or videos*
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Up to 5 files. Videos must be under 25MB — photos are compressed automatically.
                </p>
                {/* The native input is hidden: because we clear its value after
                    every pick, its own "No file chosen" label would always read
                    empty even with files staged. The list below is the truth. */}
                <label
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    files.length >= MAX_FILES
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-[#0f2044] text-white hover:bg-blue-900 cursor-pointer"
                  }`}
                >
                  {files.length === 0
                    ? "Choose photos or videos"
                    : files.length >= MAX_FILES
                      ? `${MAX_FILES} files added`
                      : `Add more (${files.length}/${MAX_FILES})`}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    disabled={files.length >= MAX_FILES}
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      // Clearing lets the camera be used repeatedly — otherwise
                      // the second shot replaces the first.
                      e.target.value = "";
                      if (picked.length === 0) return;

                      const oversized = picked.filter(
                        (f) => f.size > (isVideo(f) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)
                      );
                      if (oversized.length > 0) {
                        setError(
                          `${oversized.map((f) => f.name).join(", ")} is too large — videos must be under 25MB, photos under 50MB`
                        );
                        return;
                      }

                      const seen = new Set(files.map(fileKey));
                      const combined = [...files, ...picked.filter((f) => !seen.has(fileKey(f)))];
                      setError(
                        combined.length > MAX_FILES ? `You can attach up to ${MAX_FILES} files` : ""
                      );
                      setFiles(combined.slice(0, MAX_FILES));
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              {files.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {files.map((file) => (
                    <li key={fileKey(file)} className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setFiles(files.filter((f) => fileKey(f) !== fileKey(file)))}
                        className="ml-2 w-8 h-8 -my-1 shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
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
