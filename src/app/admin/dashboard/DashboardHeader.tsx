"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import Brand from "@/app/Brand";

export default function DashboardHeader({ ticketCount }: { ticketCount: number }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <header className="bg-[#0f2044] px-5 sm:px-8 py-4">
      <div className="flex items-center justify-between gap-4">
        <Brand size="lg" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
      <p className="text-blue-200 text-sm mt-3">
        Maintenance dashboard · {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"}
      </p>
    </header>
  );
}
