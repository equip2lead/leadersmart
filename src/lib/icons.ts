import {
  Baby,
  BookOpen,
  Building2,
  Camera,
  ChurchIcon,
  Clapperboard,
  Coffee,
  Crown,
  DoorOpen,
  Drum,
  Flame,
  Gift,
  HandHeart,
  HeadphonesIcon,
  Heart,
  Hospital,
  Landmark,
  Megaphone,
  Mic2,
  Music,
  ParkingCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  UserSquare2,
  Utensils,
  Video,
  type LucideIcon,
} from 'lucide-react';

// Curated set of lucide icons appropriate for ministry departments.
// Storing icon *name* as text means the DB never depends on a specific icon
// library — swap the library later and only this map changes.
export const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  Baby,
  BookOpen,
  Building2,
  Camera,
  Church: ChurchIcon,
  Clapperboard,
  Coffee,
  Crown,
  DoorOpen,
  Drum,
  Flame,
  Gift,
  HandHeart,
  Headphones: HeadphonesIcon,
  Heart,
  Hospital,
  Landmark,
  Megaphone,
  Mic2,
  Music,
  ParkingCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  UserSquare2,
  Utensils,
  Video,
};

export const DEPARTMENT_ICON_NAMES = Object.keys(DEPARTMENT_ICONS).sort();

export function getDepartmentIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  return DEPARTMENT_ICONS[name] ?? null;
}
