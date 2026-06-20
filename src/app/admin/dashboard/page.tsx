import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import DashboardHeader from "./DashboardHeader";
import TicketTable from "./TicketTable";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const adminClient = createAdminClient();
  const { data: tickets } = await adminClient
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader ticketCount={tickets?.length ?? 0} />
      <div className="p-6">
        <TicketTable tickets={tickets ?? []} />
      </div>
    </div>
  );
}