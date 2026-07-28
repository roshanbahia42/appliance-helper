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

  const emailPromises = [
    resend.emails.send({
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
          <div style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <a href="https://appliance-helper.vercel.app/confirmation/${reference}" style="display: inline-block; background: #0f2044; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-bottom: 12px;">View your request →</a>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">If your issue has since been resolved, you can close this ticket from the link above.</p>
          </div>
        </div>
      `,
    }),
  ];

  if (isEmergency && process.env.LANDLORD_EMAIL) {
    emailPromises.push(
      resend.emails.send({
        from: "onboarding@resend.dev",
        to: process.env.LANDLORD_EMAIL,
        subject: `⚠️ URGENT maintenance request — ${reference}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
            <div style="background: #dc2626; color: white; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 18px;">⚠️ Urgent Maintenance Request</h2>
              <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Immediate attention may be required</p>
            </div>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; line-height: 1.8;">
              <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
              <p style="margin: 0;"><strong>Issue:</strong> ${issueDetail}</p>
              <p style="margin: 0;"><strong>Property:</strong> ${property_address}</p>
              <p style="margin: 0;"><strong>Tenant:</strong> ${tenant_name}</p>
              <p style="margin: 0;"><strong>Email:</strong> ${tenant_email}</p>
              ${tenant_phone ? `<p style="margin: 0;"><strong>Phone:</strong> ${tenant_phone}</p>` : ""}
            </div>
            ${description ? `<div style="margin-top: 16px;"><p style="margin: 0 0 6px; font-weight: 600;">Additional details:</p><p style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin: 0;">${description}</p></div>` : ""}
            <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              View full details in the <a href="https://appliance-helper.vercel.app/admin/dashboard" style="color: #1d4ed8;">admin dashboard</a>.
            </p>
          </div>
        `,
      })
    );
  }

  await Promise.all(emailPromises);

  return NextResponse.json({ reference });
}
