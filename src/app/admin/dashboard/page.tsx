import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { deleteTicketMedia } from "@/lib/storage";
import DashboardHeader from "./DashboardHeader";
import TicketTable from "./TicketTable";

const BIN_RETENTION_DAYS = 30;

/** Permanently removes anything that has sat in the bin past the retention window. */
async function purgeExpiredBin(supabase: ReturnType<typeof createAdminClient>) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - BIN_RETENTION_DAYS);

  const { data: expired } = await supabase
    .from("tickets")
    .select("reference_number, media_urls")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff.toISOString());

  if (!expired?.length) return;

  await deleteTicketMedia(supabase, expired);
  await supabase
    .from("tickets")
    .delete()
    .in(
      "reference_number",
      expired.map((t) => t.reference_number)
    );
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const adminClient = createAdminClient();
  await purgeExpiredBin(adminClient);

  const { data: tickets } = await adminClient
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  const all = tickets ?? [];
  const activeCount = all.filter((t) => !t.deleted_at).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader ticketCount={activeCount} />
      <div className="p-6">
        <TicketTable tickets={all} />
      </div>
    </div>
  );
}
