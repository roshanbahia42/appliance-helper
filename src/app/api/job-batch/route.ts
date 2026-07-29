import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(request: NextRequest) {
  const { reference_numbers } = await request.json();

  if (!Array.isArray(reference_numbers) || reference_numbers.length === 0) {
    return NextResponse.json({ error: "No tickets selected" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  const { error: batchError } = await supabase.from("job_batches").insert({
    token,
    reference_numbers,
  });

  if (batchError) {
    console.error("Job batch error:", JSON.stringify(batchError));
    return NextResponse.json(
      { error: `Failed to create job sheet: ${batchError.message}` },
      { status: 500 }
    );
  }

  await supabase
    .from("tickets")
    .update({ sent_to_handyman_at: new Date().toISOString() })
    .in("reference_number", reference_numbers);

  return NextResponse.json({ token });
}
