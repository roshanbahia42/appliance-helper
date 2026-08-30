import { createAdminClient } from "@/utils/supabase/admin";
import { notFound } from "next/navigation";
import Brand from "@/app/Brand";

type Ticket = {
  reference_number: string;
  tenant_room: string | null;
  property_address: string;
  category: string;
  description: string;
  status: string;
  media_urls: string[] | null;
  created_at: string;
};

export default async function JobSheetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: batch } = await supabase
    .from("job_batches")
    .select("reference_numbers, created_at")
    .eq("token", token)
    .single();

  if (!batch) notFound();

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .in("reference_number", batch.reference_numbers)
    .is("deleted_at", null);

  const jobs: Ticket[] = tickets ?? [];

  const byProperty = jobs.reduce<Record<string, Ticket[]>>((acc, t) => {
    (acc[t.property_address] ??= []).push(t);
    return acc;
  }, {});

  const properties = Object.keys(byProperty).sort();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0f2044]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-7">
          <div className="shrink-0">
            <Brand size="lg" />
          </div>
          <div className="flex-1 min-w-0 sm:border-l sm:border-white/15 sm:pl-7">
            <h1 className="text-xl font-bold text-white">Maintenance Jobs</h1>
            <p className="text-blue-200 text-sm mt-0.5">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"} across{" "}
              {properties.length} {properties.length === 1 ? "property" : "properties"} ·{" "}
              {new Date(batch.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-5 flex flex-col gap-6">
        {properties.map((address) => (
          <section key={address}>
            <h2 className="font-bold text-slate-900 mb-2 text-sm uppercase tracking-wide">
              {address}
            </h2>
            <div className="flex flex-col gap-3">
              {byProperty[address].map((job) => (
                <div
                  key={job.reference_number}
                  className="bg-white rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="font-semibold text-slate-900 text-sm">
                      {job.tenant_room ? `Room ${job.tenant_room}: ` : ""}
                      {job.category}
                    </p>
                    {job.status === "escalated" && (
                      <span className="shrink-0 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Urgent
                      </span>
                    )}
                  </div>

                  {job.description && (
                    <p className="text-sm text-slate-600 leading-relaxed mt-2 bg-slate-50 rounded-lg p-3">
                      {job.description}
                    </p>
                  )}

                  {(job.media_urls ?? []).length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {job.media_urls!.map((url, i) => {
                        const ext = url.split(".").pop()?.toLowerCase() ?? "";
                        const isVideo = ["mp4", "mov", "avi", "webm", "mkv"].includes(ext);
                        const canPreview = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);

                        if (isVideo) {
                          return (
                            <video
                              key={i}
                              src={url}
                              controls
                              className="w-full rounded-lg col-span-2"
                            />
                          );
                        }
                        if (canPreview) {
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              {/* Plain img by choice: arbitrary Supabase Storage
                                  URLs that next/image would need whitelisted. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Photo ${i + 1}`}
                                className="w-full rounded-lg object-cover aspect-square"
                              />
                            </a>
                          );
                        }
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-xs text-blue-700 bg-slate-50 rounded-lg px-3 py-4 hover:bg-slate-100"
                          >
                            📎 Photo {i + 1}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {job.tenant_room && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500">Room {job.tenant_room}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {jobs.length === 0 && (
          <p className="text-center text-slate-400 py-12 text-sm">
            These jobs are no longer available.
          </p>
        )}
      </div>
    </div>
  );
}
