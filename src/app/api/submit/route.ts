import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createAdminClient } from "@/utils/supabase/admin";
import { CATEGORIES } from "@/lib/categories";

const anthropic = new Anthropic();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateReference() {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 90000);
  return `MT-${year}-${num}`;
}

function buildAnswerSummary(
  category: string,
  answers: Record<string, string>
): string {
  const cat = CATEGORIES.find((c) => c.name === category);
  if (!cat || cat.questions.length === 0) return "";

  const lines = cat.questions
    .filter((q) => answers[q.id])
    .map((q) => {
      const selected = q.options?.find((o) => o.value === answers[q.id]);
      const answerLabel = selected?.label ?? answers[q.id];
      return `- ${q.label}: ${answerLabel}`;
    });

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    tenant_name,
    tenant_email,
    tenant_phone,
    property_address,
    category,
    answers = {},
    urgent = false,
    description,
  } = body;

  if (!tenant_name || !tenant_email || !property_address || !category) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const reference = generateReference();
  const answerSummary = buildAnswerSummary(category, answers);

  const userMessage = [
    `Category: ${category}`,
    `Property: ${property_address}`,
    answerSummary ? `Reported details:\n${answerSummary}` : "",
    description ? `Additional context: ${description}` : "",
    urgent ? "⚠️ This has been flagged as urgent by the tenant." : "",
  ]
    .filter(Boolean)
    .join("\n");

  console.log("Calling Claude...");
  const aiResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system: `You are a helpful maintenance assistant for students in rented accommodation in the UK.

You will be given structured details about a maintenance issue — the category, specific answers to diagnostic questions, and any additional context the tenant has provided.

Your job:
1. Use the specific answers provided to give targeted, actionable troubleshooting steps — not generic advice
2. Number each step clearly. Use plain text only — no markdown headers or bullet points
3. Be direct and non-technical — assume the tenant has no prior knowledge
4. If any answer suggests a safety risk (burning smell, flooding, no security), lead with clear safety instructions before anything else
5. End with one sentence telling the tenant when to use the "I still need help" button

Keep the response under 350 words.`,
    messages: [
      {
        role: "user",
        content: userMessage,
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
    description: answerSummary
      ? `${answerSummary}${description ? `\n\nAdditional context: ${description}` : ""}`
      : description || "",
    ai_response: aiText,
    status: urgent ? "escalated" : "open",
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
    subject: `${urgent ? "⚠️ Urgent — " : ""}Maintenance Request Received — ${reference}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
        <h2 style="color: #1d4ed8; margin-bottom: 4px;">Maintenance Request Received</h2>
        <p>Hi ${tenant_name},</p>
        <p>We've received your maintenance request. Here are your details:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; line-height: 1.8;">
          <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
          <p style="margin: 0;"><strong>Category:</strong> ${category}</p>
          <p style="margin: 0;"><strong>Property:</strong> ${property_address}</p>
          ${urgent ? '<p style="margin: 0; color: #dc2626;"><strong>⚠️ Flagged as urgent</strong></p>' : ""}
        </div>
        ${
          urgent
            ? '<p style="color: #dc2626; font-weight: bold;">Your request has been flagged as urgent. We will be in touch as soon as possible.</p>'
            : `<h3 style="color: #1d4ed8;">Before we arrange a visit, please try these steps:</h3>
        <div style="line-height: 1.8; white-space: pre-wrap;">${aiText}</div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          If these steps don't resolve your issue, go back to your confirmation page and click "I still need help". Keep your reference number: <strong>${reference}</strong>
        </p>`
        }
      </div>
    `,
  });

  return NextResponse.json({ reference });
}
