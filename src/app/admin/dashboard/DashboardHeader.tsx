"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function DashboardHeader({
  ticketCount,
}: {
  ticketCount: number;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Maintenance Dashboard
        </h1>
        <p className="text-sm text-gray-500">{ticketCount} tickets total</p>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Log out
      </button>
    </header>
  );
}