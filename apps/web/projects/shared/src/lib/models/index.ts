// ─── API Response ─────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string>;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Auth ─────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ─── User ─────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  tenant_id: string | null;
  property_id: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export type UserRole =
  | 'super_admin'
  | 'property_admin'
  | 'manager'
  | 'front_desk'
  | 'housekeeping'
  | 'maintenance'
  | 'bar'
  | 'kitchen'
  | 'restaurant'
  | 'accountant'
  | 'security'
  | 'concierge';

// ─── Tenant ───────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan_id: string | null;
  max_rooms: number;
  max_staff: number;
  max_properties: number;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  is_active: boolean;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  enabled_modules: string[];
  created_at: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'suspended';

// ─── Property ─────────────────────────────────────────────────

export interface Property {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  star_rating: number | null;
  check_in_time: string;
  check_out_time: string;
  is_active: boolean;
}

// ─── Subscription Plan ────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  currency: string;
  max_rooms: number;
  max_staff: number;
  max_properties: number;
  included_modules: string[];
  trial_days: number;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
}

// ─── Feature Module ───────────────────────────────────────────

export interface FeatureModule {
  id: string;
  module_key: string;
  name: string;
  description: string | null;
  category: string;
  min_tier: string;
  is_core: boolean;
  dependencies: string[];
  required_by: string[];
  icon: string | null;
  sort_order: number;
}

export interface TenantFeatures {
  enabled_modules: string[];
  enabled_count: number;
  total_modules: number;
  overrides: { module_key: string; is_enabled: boolean; reason: string | null }[];
  modules: TenantModuleStatus[];
}

export interface TenantModuleStatus {
  module_key: string;
  name: string;
  category: string;
  is_core: boolean;
  is_enabled: boolean;
  min_tier: string;
  dependencies: string[];
  icon: string | null;
}

// ─── App Release ──────────────────────────────────────────────

export interface AppRelease {
  id: string;
  app_type: AppType;
  version: string;
  build_number: number;
  status: 'draft' | 'published' | 'deprecated';
  is_latest: boolean;
  is_mandatory: boolean;
  release_notes: string | null;
  min_os_version: string | null;
  file_size: number | null;
  checksum: string | null;
  download_count: number;
  published_at: string | null;
  created_at: string;
}

export type AppType = 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'pwa' | 'pos_terminal' | 'kds_display';

// ─── Bank Account ─────────────────────────────────────────────

export interface PropertyBankAccount {
  id: string;
  property_id: string;
  bank_name: string;
  bank_code: string | null;
  account_number: string;
  account_name: string;
  is_primary: boolean;
  is_active: boolean;
}

// ─── Dashboard Stats ──────────────────────────────────────────

export interface AdminDashboard {
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  total_users: number;
  total_properties: number;
  total_plans: number;
  tenants_by_status: Record<string, number>;
}

// ─── Onboarding ───────────────────────────────────────────────

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  percent: number;
  is_complete: boolean;
}

export interface OnboardingStep {
  step: number;
  name: string;
  complete: boolean;
}

// ─── Usage ────────────────────────────────────────────────────

export interface UsageCurrent {
  tenant_id: string;
  rooms: { used: number; limit: number; percent: number };
  staff: { used: number; limit: number; percent: number };
  properties: { used: number; limit: number; percent: number };
}

export interface UsageLimits {
  tenant_id: string;
  plan: { id: string; name: string; tier: string } | null;
  limits: { max_rooms: number; max_staff: number; max_properties: number };
}
