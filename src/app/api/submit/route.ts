import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";

const anthropic = new Anthropic();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateReference() {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 90000);
  return `MT-${year}-${num}`;
}

const CATEGORY_CONTEXT: Record<string, string> = {
  Heating:
    "heating systems including boilers, radiators, hot water cylinders, and thermostats in a rented student property",
  Plumbing:
    "plumbing issues including taps, pipes, toilets, blocked drains, and water pressure in a rented student property",
  Electrical:
    "electrical issues including sockets, switches, fuse boxes, tripped circuits, and lighting in a rented student property",
  "Kitchen Appliances":
    "kitchen appliances including washing machines, dryers, fridges, freezers, ovens, microwaves, and dishwashers in a rented student property",
  Bathroom:
    "bathroom issues including showers, baths, toilets, taps, and extractor fans in a rented student property",
  "Doors & Windows":
    "door and window issues including locks, hinges, handles, seals, draughts, and broken panes in a rented student property",
  Garden:
    "garden and outdoor issues including overgrown areas, blocked gutters, and outdoor lighting in a rented student property",
  "Lost Key":
    "lost or broken keys for a rented student property, including what steps to take immediately, who to contact, and what to expect regarding replacement costs",
  Other: "general maintenance issues in a rented student property",
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    tenant_name,
    tenant_email,
    tenant_phone,
    property_address,
    category,
    description,
  } = body;

  if (
    !tenant_name ||
    !tenant_email ||
    !property_address ||
    !category ||
    !description
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const reference = generateReference();
  const context =
    CATEGORY_CONTEXT[category] ||
    "maintenance issues in a rented student property";

  console.log("Calling Claude...");
  const aiResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system: `You are a helpful maintenance assistant for students in rented accommodation. You help tenants troubleshoot ${context}.

When given a description of a problem:
1. Provide clear, numbered troubleshooting steps the student can safely try themselves
2. Use simple, non-technical language — assume no prior knowledge
3. Clearly flag anything dangerous or that must only be handled by a professional (gas leaks, exposed wiring, major structural issues)
4. Be specific and actionable — tell them exactly what to check or do
5. End with one sentence on when to escalate to the landlord

Do not use markdown headers or bullet points. Use plain numbered lists only. Keep the response under 400 words.`,
    messages: [
      {
        role: "user",
        content: `Issue description: ${description}\nCategory: ${category}\nProperty: ${property_address}`,
      },
    ],
  });

  const aiText =
    aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";

  console.log("Claude done. Saving to DB...");
  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("tickets").insert({
    reference_number: reference,
    property_address,
    tenant_name,
    tenant_email,
    tenant_phone: tenant_phone || null,
    category,
    description,
    ai_response: aiText,
    status: "open",
  });

  if (dbError) {
    console.error("DB error:", JSON.stringify(dbError));
    return NextResponse.json(
      { error: "Failed to save ticket" },
      { status: 500 }
    );
  }

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: tenant_email,
    subject: `Maintenance Request Received — ${reference}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #1d4ed8; margin-bottom: 4px;">Maintenance Request Received</h2>
        <p>Hi ${tenant_name},</p>
        <p>We've received your maintenance request. Here are your details:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; line-height: 1.8;">
          <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
          <p style="margin: 0;"><strong>Category:</strong> ${category}</p>
          <p style="margin: 0;"><strong>Property:</strong> ${property_address}</p>
          <p style="margin: 0;"><strong>Issue:</strong> ${description}</p>
        </div>
        <h3 style="color: #1d4ed8;">Before we arrange a visit, please try these steps:</h3>
        <div style="line-height: 1.8; white-space: pre-wrap;">${aiText}</div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          If these steps don't resolve your issue, please go back to the request page and click "I still need help". Keep your reference number: <strong>${reference}</strong>
        </p>
      </div>
    `,
  });

  return NextResponse.json({ reference });
}