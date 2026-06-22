export type QuestionOption = {
  value: string;
  label: string;
  warning?: string;
  urgent?: boolean;
};

export type Question = {
  id: string;
  label: string;
  type: "radio" | "select" | "text";
  options?: QuestionOption[];
  required: boolean;
  placeholder?: string;
};

export type Category = {
  name: string;
  icon: string;
  slug: string;
  questions: Question[];
};

export const CATEGORIES: Category[] = [
  {
    name: "Heating",
    icon: "🌡️",
    slug: "heating",
    questions: [
      {
        id: "issue_type",
        label: "What is the problem?",
        type: "radio",
        required: true,
        options: [
          { value: "no_heating", label: "No heating anywhere in the property" },
          { value: "radiator_cold", label: "One or more radiators not heating up" },
          { value: "no_hot_water", label: "No hot water" },
          { value: "boiler_noise", label: "Boiler making unusual noises" },
          { value: "boiler_error", label: "Boiler showing an error code" },
          { value: "thermostat", label: "Thermostat not working" },
        ],
      },
      {
        id: "hot_water_affected",
        label: "Is your hot water also affected?",
        type: "radio",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "error_code",
        label: "Boiler error code (if shown on display)",
        type: "text",
        required: false,
        placeholder: "e.g. F22, E1 — leave blank if none",
      },
    ],
  },
  {
    name: "Plumbing",
    icon: "🚿",
    slug: "plumbing",
    questions: [
      {
        id: "issue_type",
        label: "What type of plumbing issue is it?",
        type: "radio",
        required: true,
        options: [
          { value: "blocked_drain", label: "Blocked drain, sink or toilet" },
          { value: "dripping_tap", label: "Dripping or leaking tap" },
          { value: "leaking_pipe", label: "Leaking pipe" },
          { value: "ceiling_leak", label: "Leak coming through ceiling or from above" },
          { value: "no_water", label: "No water supply" },
          { value: "low_pressure", label: "Low water pressure" },
          { value: "toilet_flush", label: "Toilet won't flush" },
        ],
      },
      {
        id: "leak_severity",
        label: "Is water actively leaking?",
        type: "radio",
        required: true,
        options: [
          {
            value: "urgent",
            label: "Yes — significant leak or flooding",
            urgent: true,
            warning: "If there is flooding, turn off the water supply at the stopcock (usually under the sink or in a cupboard) and contact us immediately.",
          },
          { value: "slow", label: "Yes — slow drip" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "location",
        label: "Which room is affected?",
        type: "radio",
        required: true,
        options: [
          { value: "kitchen", label: "Kitchen" },
          { value: "bathroom", label: "Bathroom" },
          { value: "other", label: "Other" },
        ],
      },
    ],
  },
  {
    name: "Electrical",
    icon: "⚡",
    slug: "electrical",
    questions: [
      {
        id: "issue_type",
        label: "What has stopped working?",
        type: "radio",
        required: true,
        options: [
          { value: "single_socket", label: "A single socket or switch" },
          { value: "room_lights", label: "Lights in one room" },
          { value: "multiple", label: "Multiple sockets or lights" },
          { value: "circuit_tripped", label: "A circuit or fuse has tripped" },
          { value: "whole_property", label: "Whole property has no power" },
          { value: "doorbell", label: "Doorbell or intercom" },
        ],
      },
      {
        id: "burning_smell",
        label: "Is there a burning smell or visible scorch marks?",
        type: "radio",
        required: true,
        options: [
          {
            value: "yes",
            label: "Yes",
            warning: "Do not use the affected socket or switch. If there is any risk of fire, leave the property and call 999. Otherwise switch off at the fuse box and contact us immediately.",
            urgent: true,
          },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "fuse_tripped",
        label: "Has anything in the fuse box tripped?",
        type: "radio",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "unsure", label: "Not sure" },
        ],
      },
    ],
  },
  {
    name: "Kitchen Appliances",
    icon: "🍽️",
    slug: "kitchen-appliances",
    questions: [
      {
        id: "appliance",
        label: "Which appliance has the issue?",
        type: "radio",
        required: true,
        options: [
          { value: "washing_machine", label: "Washing machine" },
          { value: "tumble_dryer", label: "Tumble dryer" },
          { value: "fridge", label: "Fridge" },
          { value: "freezer", label: "Freezer" },
          { value: "oven", label: "Oven or cooker" },
          { value: "hob", label: "Hob" },
          { value: "dishwasher", label: "Dishwasher" },
          { value: "microwave", label: "Microwave" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "problem",
        label: "What is the problem?",
        type: "radio",
        required: true,
        options: [
          { value: "wont_turn_on", label: "Won't turn on" },
          { value: "noise", label: "Making unusual noise" },
          { value: "leaking", label: "Leaking water" },
          { value: "not_heating", label: "Not heating or not cooling" },
          { value: "error_code", label: "Error code showing" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "error_code",
        label: "Error code (if shown on the appliance)",
        type: "text",
        required: false,
        placeholder: "e.g. E3, F08 — leave blank if none",
      },
    ],
  },
  {
    name: "Bathroom",
    icon: "🛁",
    slug: "bathroom",
    questions: [
      {
        id: "issue_type",
        label: "What is the issue?",
        type: "radio",
        required: true,
        options: [
          { value: "shower", label: "Shower not working" },
          { value: "bath_taps", label: "Bath or taps" },
          { value: "toilet_flush", label: "Toilet won't flush" },
          { value: "toilet_leak", label: "Toilet leaking at base" },
          { value: "extractor_fan", label: "Extractor fan not working" },
          { value: "blocked_drain", label: "Blocked drain" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "water_leak",
        label: "Is there any water leaking or flooding?",
        type: "radio",
        required: true,
        options: [
          {
            value: "yes_flooding",
            label: "Yes — significant flooding",
            urgent: true,
            warning: "Turn off the water supply at the stopcock immediately and contact us.",
          },
          { value: "yes_minor", label: "Yes — minor leak" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    name: "Doors & Windows",
    icon: "🚪",
    slug: "doors-windows",
    questions: [
      {
        id: "issue_type",
        label: "What is the issue?",
        type: "radio",
        required: true,
        options: [
          { value: "lock", label: "Lock not working" },
          { value: "wont_close", label: "Won't close properly" },
          { value: "wont_open", label: "Won't open" },
          { value: "broken_glass", label: "Broken or cracked glass" },
          { value: "draught", label: "Draught coming through" },
          { value: "handle_hinge", label: "Handle or hinge broken" },
        ],
      },
      {
        id: "which_one",
        label: "Which door or window?",
        type: "radio",
        required: true,
        options: [
          { value: "front_door", label: "Front door" },
          { value: "back_door", label: "Back or side door" },
          { value: "internal_door", label: "Internal room door" },
          { value: "window", label: "Window" },
        ],
      },
      {
        id: "security",
        label: "Can you still lock the property securely?",
        type: "radio",
        required: true,
        options: [
          { value: "no", label: "No — property cannot be locked", urgent: true, warning: "As your property cannot be secured, please contact us immediately so we can arrange an emergency repair." },
          { value: "yes", label: "Yes" },
        ],
      },
    ],
  },
  {
    name: "Garden",
    icon: "🌿",
    slug: "garden",
    questions: [
      {
        id: "issue_type",
        label: "What is the issue?",
        type: "radio",
        required: true,
        options: [
          { value: "overgrown", label: "Overgrown lawn or weeds" },
          { value: "guttering", label: "Blocked guttering" },
          { value: "fence", label: "Broken or damaged fence" },
          { value: "outdoor_tap", label: "Outdoor tap not working" },
          { value: "outdoor_light", label: "Outdoor lighting not working" },
          { value: "path_patio", label: "Path or patio damage" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "safety",
        label: "Is it affecting access or safety?",
        type: "radio",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    name: "Lost Key",
    icon: "🔑",
    slug: "lost-key",
    questions: [
      {
        id: "key_type",
        label: "What key have you lost?",
        type: "radio",
        required: true,
        options: [
          { value: "front_door", label: "Front door key" },
          { value: "room", label: "Room key" },
          { value: "post_box", label: "Post box key" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "quantity",
        label: "How many keys?",
        type: "radio",
        required: true,
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3+", label: "3 or more" },
        ],
      },
      {
        id: "when",
        label: "When did this happen?",
        type: "radio",
        required: true,
        options: [
          { value: "today", label: "Today" },
          { value: "yesterday", label: "Yesterday" },
          { value: "few_days", label: "A few days ago" },
        ],
      },
    ],
  },
  {
    name: "Other",
    icon: "🔧",
    slug: "other",
    questions: [],
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
