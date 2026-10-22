/**
 * Seeds the dashboard with realistic demo data.
 *
 * Built for showing the project to someone, not for testing. Real
 * descriptions, staggered dates so the age column reads naturally, and a
 * spread of states that exercises the features worth demonstrating: unopened
 * tickets, an overdue one, a live conversation, a job already dispatched, a
 * resolved ticket and something in the bin.
 *
 * Deliberately not a tour of all 17 categories. Eight tickets across four
 * properties looks like a system in use; forty looks like a screenshot.
 *
 *   npx tsx scripts/seed-demo.ts          add the demo data
 *   npx tsx scripts/seed-demo.ts --wipe   clear everything first
 *
 * Reads the same environment as the app. Run from the project root.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local the same way Next does, without printing anything from it.
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DAY = 86_400_000;
const ago = (days: number, hour = 10) => {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
};

/** Matches generateReference() in the submit route. */
const reference = (n: number) => `MT-${new Date().getFullYear()}-${10000 + n}`;
const token = () => [...Array(12)]
  .map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)])
  .join("");

const SELSDON = "14 Selsdon Road, Selly Oak, Birmingham B29 7BL";
const TIVERTON = "88 Tiverton Road, Selly Oak, Birmingham B29 6BR";
const HEELEY = "23 Heeley Road, Selly Oak, Birmingham B29 6EN";
const DAWLISH = "7 Dawlish Road, Selly Oak, Birmingham B29 7AT";

type Seed = {
  tenant_name: string;
  tenant_room: string | null;
  tenant_email: string;
  tenant_phone: string;
  property_address: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  seen_at?: string | null;
  sent_to_handyman_at?: string | null;
  deleted_at?: string | null;
  admin_notes?: string | null;
  /** [direction, body, daysAgo, senderName] */
  messages?: [("inbound" | "outbound"), string, number, string?][];
};

const TICKETS: Seed[] = [
  // Unopened and urgent. Lands at the top with a New badge.
  {
    tenant_name: "Priya Raman",
    tenant_room: "3",
    tenant_email: "p.raman@student.bham.ac.uk",
    tenant_phone: "07700 900412",
    property_address: TIVERTON,
    category: "Security and Safety: Smoke Alarm Issues",
    description:
      "The smoke alarm in the upstairs hallway has been beeping every minute since last night. Nobody can sleep. We tried taking the battery out but it is wired in.",
    status: "escalated",
    created_at: ago(0, 8),
    seen_at: null,
  },

  // Unopened, ordinary. Second New badge.
  {
    tenant_name: "Tom Whitfield",
    tenant_room: "1",
    tenant_email: "tomwhitfield02@gmail.com",
    tenant_phone: "07700 900188",
    property_address: SELSDON,
    category: "Kitchen: Extractor Fan Not Working",
    description:
      "Extractor fan over the hob stopped working. It makes a clicking noise when you press the button but the fan does not spin.",
    status: "open",
    created_at: ago(1, 19),
    seen_at: null,
  },

  // The overdue one. Three weeks old, still open, nothing dispatched.
  {
    tenant_name: "Aisha Bello",
    tenant_room: "4",
    tenant_email: "a.bello1@student.bham.ac.uk",
    tenant_phone: "07700 900731",
    property_address: HEELEY,
    category: "Doors and Windows: Window Will Not Close Properly",
    description:
      "The window in my room does not shut fully, there is about a centimetre gap at the top. It is freezing and I can hear everything from the street.",
    status: "open",
    created_at: ago(23, 14),
    seen_at: ago(22, 9),
    admin_notes: "Needs a new handle mechanism, measured 2 Oct.",
  },

  // Live conversation, with an unread reply waiting.
  {
    tenant_name: "Jamie Okafor",
    tenant_room: "2",
    tenant_email: "jamie.okafor@gmail.com",
    tenant_phone: "07700 900255",
    property_address: TIVERTON,
    category: "Plumbing and Water: Leak Under Sink",
    description:
      "Water pooling in the cupboard under the kitchen sink. Put a bowl under it for now, it fills up about twice a day.",
    status: "open",
    created_at: ago(5, 11),
    seen_at: ago(5, 15),
    messages: [
      ["outbound", "Hi Jamie, thanks for reporting this. Is the water clear or discoloured, and is it dripping constantly or only when the tap runs?", 5],
      ["inbound", "It's clear, and only really when someone runs the tap. Stops after a few minutes.", 4, "Jamie Okafor"],
      ["outbound", "That sounds like the waste trap rather than the supply. I'll get Dave out on Thursday morning, will someone be in from 9?", 4],
      ["inbound", "Yeah I'm in all Thursday, no lectures. Cheers.", 1, "Jamie Okafor"],
    ],
  },

  // Whole-house question, answered by a different student. Shows the shared
  // thread and the name resolution on housemates.
  {
    tenant_name: "Ellie Marsh",
    tenant_room: "1",
    tenant_email: "e.marsh@student.bham.ac.uk",
    tenant_phone: "07700 900604",
    property_address: DAWLISH,
    category: "Bathroom Fittings: Shower Draining Slowly",
    description:
      "Shower takes ages to drain, water comes up to your ankles by the end. Been getting worse over the last fortnight.",
    status: "open",
    created_at: ago(8, 17),
    seen_at: ago(8, 18),
    messages: [
      ["outbound", "Could whoever used the shower last night let me know if anything was poured down it? Trying to work out whether this is hair or something else.", 3],
      ["inbound", "Wasn't me but I know someone dyed their hair in there last week, might be related?", 2, "Nadia Hussain"],
    ],
  },

  // Dispatched to the handyman. Shows the green tick and the job sheet.
  {
    tenant_name: "Marcus Lane",
    tenant_room: "5",
    tenant_email: "marcuslane99@outlook.com",
    tenant_phone: "07700 900347",
    property_address: SELSDON,
    category: "Heating and Cooling: Radiator Not Heating Up",
    description:
      "Radiator in the back bedroom stays cold when the heating is on. All the others work fine.",
    status: "open",
    created_at: ago(6, 13),
    seen_at: ago(6, 14),
    sent_to_handyman_at: ago(2, 9),
    admin_notes: "Probably needs bleeding. Dave has the key, going Tuesday.",
  },

  // Resolved, with the closing notice on the thread.
  {
    tenant_name: "Sofia Almeida",
    tenant_room: "2",
    tenant_email: "s.almeida@student.bham.ac.uk",
    tenant_phone: "07700 900922",
    property_address: HEELEY,
    category: "Electrical: Outlet or Light Not Working",
    description:
      "Both sockets on the wall by the desk have stopped working. The rest of the room is fine.",
    status: "resolved",
    created_at: ago(16, 10),
    seen_at: ago(16, 12),
    sent_to_handyman_at: ago(14, 8),
    messages: [
      ["outbound", "Dave is coming Monday afternoon to look at this, he thinks it's the RCD. Is that alright?", 15],
      ["inbound", "Perfect, thank you.", 15, "Sofia Almeida"],
      ["outbound", "Marked as resolved. The tenant was told, and replying to that email reopens the ticket.", 11],
    ],
  },

  // In the bin, so the Bin tab has something and the retention countdown shows.
  {
    tenant_name: "Daniel Price",
    tenant_room: "3",
    tenant_email: "danielprice@gmail.com",
    tenant_phone: "07700 900516",
    property_address: DAWLISH,
    category: "Internet, TV and Phone: Internet Not Working",
    description:
      "Wifi keeps dropping out in the evenings. Think it might be the router rather than the provider.",
    status: "open",
    created_at: ago(27, 20),
    seen_at: ago(26, 9),
    deleted_at: ago(9, 11),
    admin_notes: "Tenant sorted it with the provider directly.",
  },
];

async function main() {
  if (process.argv.includes("--wipe")) {
    console.log("Wiping existing tickets and messages...");
    await supabase.from("ticket_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("tickets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  let inserted = 0;
  for (const [i, seed] of TICKETS.entries()) {
    const { messages, ...ticket } = seed;

    const { data: row, error } = await supabase
      .from("tickets")
      .insert({
        ...ticket,
        reference_number: reference(i + 1),
        public_token: token(),
        media_urls: [],
        tenant_room: ticket.tenant_room,
        sent_to_handyman_at: ticket.sent_to_handyman_at ?? null,
        deleted_at: ticket.deleted_at ?? null,
        admin_notes: ticket.admin_notes ?? null,
        seen_at: ticket.seen_at ?? null,
      })
      .select("id, reference_number")
      .single();

    if (error || !row) {
      console.error(`  failed: ${seed.tenant_name}:`, error?.message);
      continue;
    }
    inserted++;

    for (const [direction, body, daysAgo, senderName] of messages ?? []) {
      await supabase.from("ticket_messages").insert({
        ticket_id: row.id,
        direction,
        sender_name: direction === "outbound" ? "Eastwinds Maintenance" : senderName ?? seed.tenant_name,
        sender_email: direction === "outbound" ? process.env.RESEND_FROM ?? "maintenance@example.com" : seed.tenant_email,
        body,
        attachments: [],
        // The last inbound message on an open ticket stays unread, so the
        // needs-attention badge has something to show.
        read_at: direction === "inbound" && daysAgo <= 2 ? null : new Date(Date.now() - daysAgo * DAY).toISOString(),
        created_at: new Date(Date.now() - daysAgo * DAY).toISOString(),
      });
    }

    console.log(`  ${row.reference_number}  ${seed.tenant_name.padEnd(16)} ${seed.category}`);
  }

  console.log(`\n${inserted} tickets seeded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
