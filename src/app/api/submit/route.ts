import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateReference() {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 90000);
  return `MT-${year}-${num}`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    tenant_name,
    tenant_email,
    tenant_phone,
    property_address,
    category,
    subcategory,
    description,
    isEmergency = false,
    media_urls = [],
  } = body;

  if (!tenant_name || !tenant_email || !property_address || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const reference = generateReference();

  const issueDetail = subcategory ? `${category} — ${subcategory}` : category;

  console.log("Saving to DB...");
  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("tickets").insert({
    reference_number: reference,
    property_address,
    tenant_name,
    tenant_email,
    tenant_phone: tenant_phone || null,
    category: issueDetail,
    description: description || "",
    media_urls,
    status: isEmergency ? "escalated" : "open",
  });

  if (dbError) {
    console.error("DB error:", JSON.stringify(dbError));
    return NextResponse.json({ error: "Failed to save ticket" }, { status: 500 });
  }

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: tenant_email,
    subject: `${isEmergency ? "⚠️ Urgent — " : ""}Maintenance Request Received — ${reference}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #1d4ed8; margin-bottom: 4px;">Maintenance Request Received</h2>
        <p>Hi ${tenant_name},</p>
        <p>We've received your maintenance request and your landlord has been notified.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; line-height: 1.8;">
          <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
          <p style="margin: 0;"><strong>Issue:</strong> ${issueDetail}</p>
          <p style="margin: 0;"><strong>Property:</strong> ${property_address}</p>
          ${isEmergency ? '<p style="margin: 0; color: #dc2626;"><strong>⚠️ Flagged as urgent</strong></p>' : ""}
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Keep your reference number handy: <strong>${reference}</strong>
        </p>
      </div>
    `,
  });

  return NextResponse.json({ reference });
}
