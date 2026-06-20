import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  const supabase = createAdminClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("reference_number", reference)
    .single();

  await supabase
    .from("tickets")
    .update({ status: "escalated", updated_at: new Date().toISOString() })
    .eq("reference_number", reference);

  if (ticket) {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.LANDLORD_EMAIL!,
      subject: `Action Required: Maintenance Issue ${reference}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
          <h2 style="color: #dc2626;">Tenant Needs Assistance</h2>
          <p>A tenant has confirmed that the troubleshooting guide did not resolve their issue and requires attention.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; line-height: 1.8;">
            <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
            <p style="margin: 0;"><strong>Tenant:</strong> ${ticket.tenant_name}</p>
            <p style="margin: 0;"><strong>Email:</strong> ${ticket.tenant_email}</p>
            <p style="margin: 0;"><strong>Phone:</strong> ${ticket.tenant_phone ?? "Not provided"}</p>
            <p style="margin: 0;"><strong>Property:</strong> ${ticket.property_address}</p>
            <p style="margin: 0;"><strong>Category:</strong> ${ticket.category}</p>
            <p style="margin: 0;"><strong>Issue:</strong> ${ticket.description}</p>
          </div>
          <p>Please log in to your dashboard to manage this ticket.</p>
        </div>
      `,
    });
  }

  return NextResponse.json({ success: true });
}