import {
  Bug,
  Building2,
  CircleHelp,
  CookingPot,
  DoorOpen,
  Droplets,
  Lightbulb,
  PaintRoller,
  ShieldCheck,
  ShowerHead,
  Siren,
  Sofa,
  Thermometer,
  Trees,
  WashingMachine,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Category id → icon. Kept out of categories.ts so that stays plain data with
 * no React in it, and so the icon choice lives next to nothing else.
 *
 * Icons inherit currentColor, so the emergency tile's red and the rest of the
 * grid's slate come from the existing button classes with nothing extra.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  emergency: Siren,
  "heating-cooling": Thermometer,
  "plumbing-water": Droplets,
  electrical: Zap,
  appliances: WashingMachine,
  "doors-windows": DoorOpen,
  pests: Bug,
  bathroom: ShowerHead,
  kitchen: CookingPot,
  lighting: Lightbulb,
  "walls-ceilings": PaintRoller,
  security: ShieldCheck,
  garden: Trees,
  furniture: Sofa,
  internet: Wifi,
  communal: Building2,
  other: CircleHelp,
};

/** Falls back rather than rendering a hole if a new category lands without one. */
export const iconForCategory = (id: string): LucideIcon =>
  CATEGORY_ICONS[id] ?? CircleHelp;
