import {
  LucideAngularModule,

  // ─── Daily Operation ──────────────────
  LayoutDashboard,
  ClipboardList,
  Hotel,
  Tag,
  UserRound,
  SprayCan,
  SlidersHorizontal,

  // ─── Guest Experience ─────────────────
  ConciergeBell,
  MessageCircle,
  Gift,
  Heart,
  Shield,

  // ─── F&B & Facilities ─────────────────
  Utensils,
  BookOpen,
  Sparkles,
  Dumbbell,
  Bath,

  // ─── Finance & Reports ────────────────
  FolderOpen,
  FileText,
  Receipt,
  Moon,
  TrendingUp,
  Users,
  ChartBar,
  FileChartColumn,
  ShieldAlert,
  ShieldCheck,
  Banknote,
  CalendarCheck,

  // ─── Human Resources ──────────────────
  UserRoundCog,
  Clock,
  TreePalm,
  HandCoins,
  Star,
  Briefcase,

  // ─── Maintenance & Assets ─────────────
  Package,
  TriangleAlert,
  Wrench,
  HardHat,

  // ─── Integrations ─────────────────────
  Globe,
  Smartphone,
  Wifi,
  Handshake,

  // ─── System ───────────────────────────
  Building,
  Puzzle,
  Zap,
  CreditCard,
  Settings,
  Bell,
  LogOut,

  // ─── Navigation / UI ──────────────────
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Home,
  BedDouble,
  DoorOpen,
  CalendarDays,
  ArrowDownRight,
  ArrowUpRight,
  CircleCheck,
  CircleX,
} from 'lucide-angular';

/**
 * All icons used across the Lodgik apps.
 */
export const LODGIK_ICONS = {
  LayoutDashboard,
  ClipboardList,
  Hotel,
  Tag,
  UserRound,
  SprayCan,
  SlidersHorizontal,
  ConciergeBell,
  MessageCircle,
  Gift,
  Heart,
  Shield,
  Utensils,
  BookOpen,
  Sparkles,
  Dumbbell,
  Bath,
  FolderOpen,
  FileText,
  Receipt,
  Moon,
  TrendingUp,
  Users,
  ChartBar,
  FileChartColumn,
  ShieldAlert,
  ShieldCheck,
  Banknote,
  CalendarCheck,
  UserRoundCog,
  Clock,
  TreePalm,
  HandCoins,
  Star,
  Briefcase,
  Package,
  TriangleAlert,
  Wrench,
  HardHat,
  Globe,
  Smartphone,
  Wifi,
  Handshake,
  Building,
  Puzzle,
  Zap,
  CreditCard,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Home,
  BedDouble,
  DoorOpen,
  CalendarDays,
  ArrowDownRight,
  ArrowUpRight,
  CircleCheck,
  CircleX,
};

/**
 * Pre-configured LucideAngularModule with all Lodgik icons.
 * Use in standalone component imports: `LucideModule`
 */
export const LucideModule = LucideAngularModule.pick(LODGIK_ICONS);
