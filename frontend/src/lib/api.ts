const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('perseo_token');
}
export function setToken(token: string) { localStorage.setItem('perseo_token', token); }
export function clearToken() {
  localStorage.removeItem('perseo_token');
  localStorage.removeItem('perseo_user');
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error de red' }));
    throw new Error(err.message || 'Error desconocido');
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (name: string, email: string, password: string) =>
      request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  },

  whatsapp: {
    connect: () => request<{ qr: string | null; status: string }>('/whatsapp/connect', { method: 'POST' }),
    status: () => request<{ status: string; qr: string | null }>('/whatsapp/status'),
    disconnect: () => request('/whatsapp/disconnect', { method: 'POST' }),
    meta: {
      connect: (data: { phone_number_id: string; waba_id: string; access_token: string; phone_number?: string; display_name?: string }) =>
        request<{ success: boolean; session: MetaSession }>('/whatsapp/meta/connect', { method: 'POST', body: JSON.stringify(data) }),
      status: () => request<{ connected: boolean; session: MetaSession | null }>('/whatsapp/meta/status'),
      disconnect: () => request<{ success: boolean }>('/whatsapp/meta/disconnect', { method: 'POST' }),
    },
    dialog360: {
      connectUrl: () => request<{ url: string }>('/whatsapp/dialog360/connect-url'),
      connect: (data: { client_id?: string; channel_id?: string; api_key?: string; phone_number?: string; display_name?: string }) =>
        request<{ success: boolean; session: Dialog360Session }>('/whatsapp/dialog360/connect', { method: 'POST', body: JSON.stringify(data) }),
      status: () => request<{ connected: boolean; session: Dialog360Session | null }>('/whatsapp/dialog360/status'),
      disconnect: () => request<{ success: boolean }>('/whatsapp/dialog360/disconnect', { method: 'POST' }),
    },
    twilio: {
      connect: (data: { account_sid: string; auth_token: string; phone_number: string; phone_number_sid?: string; display_name?: string }) =>
        request<{ success: boolean; session: TwilioSession }>('/whatsapp/twilio/connect', { method: 'POST', body: JSON.stringify(data) }),
      status: () => request<{ connected: boolean; session: TwilioSession | null }>('/whatsapp/twilio/status'),
      disconnect: () => request<{ success: boolean }>('/whatsapp/twilio/disconnect', { method: 'POST' }),
    },
  },

  campaigns: {
    list: () => request<Campaign[]>('/campaigns'),
    create: (data: { name: string; ad_id?: string; color?: string; keywords?: string[] }) =>
      request<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Campaign>) =>
      request<Campaign>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/campaigns/${id}`, { method: 'DELETE' }),
    leads: (id: string, params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return request<LeadsResponse>(`/campaigns/${id}/leads${qs}`);
    },
    addKeyword: (id: string, keyword: string) =>
      request(`/campaigns/${id}/keywords`, { method: 'POST', body: JSON.stringify({ keyword }) }),
    removeKeyword: (id: string, kwId: string) =>
      request(`/campaigns/${id}/keywords/${kwId}`, { method: 'DELETE' }),
  },

  leads: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
      return request<LeadsResponse>(`/leads${qs}`);
    },
    metrics: (params?: { date_from?: string; date_to?: string }) => {
      const qs = params && (params.date_from || params.date_to)
        ? '?' + new URLSearchParams(params as Record<string, string>).toString()
        : '';
      return request<Metrics & { period_label: string | null }>(`/leads/metrics${qs}`);
    },
    messages: (id: string) => request<Message[]>(`/leads/${id}/messages`),
    reply: (id: string, body: string) => request<Message>(`/leads/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }) }),
    convert: (id: string) => request<Lead>(`/leads/${id}/convert`, { method: 'POST' }),
    delete: (id: string) => request(`/leads/${id}`, { method: 'DELETE' }),
    updatePhone: (id: string, phone: string) =>
      request<Lead>(`/leads/${id}/phone`, { method: 'PATCH', body: JSON.stringify({ phone }) }),
  },

  sheets: {
    authUrl: () => request<{ url: string }>('/sheets/auth-url'),
    connect: (spreadsheet_id: string) =>
      request('/sheets/connect', { method: 'POST', body: JSON.stringify({ spreadsheet_id }) }),
    status: () => request<{ is_connected: boolean; spreadsheet_id: string | null }>('/sheets/status'),
    test: () => request('/sheets/test', { method: 'POST' }),
  },

  billing: {
    plans: () => request<Plan[]>('/billing/plans'),
    subscription: () => request<{ subscription: Subscription | null; current_plan: string }>('/billing/subscription'),
    checkout: (plan_id: string) => request<{ url: string }>('/billing/checkout', { method: 'POST', body: JSON.stringify({ plan_id }) }),
    portal: () => request<{ url: string }>('/billing/portal', { method: 'POST' }),
  },

  onboarding: {
    status: () => request<OnboardingStatus>('/onboarding/status'),
    complete: () => request('/onboarding/complete', { method: 'POST' }),
  },

  settings: {
    get: () => request<UserSettings>('/settings'),
    update: (data: Partial<UserSettings & { openai_api_key?: string }>) =>
      request<UserSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User { id: string; email: string; name: string; plan_id: string; }

export interface UserSettings extends User {
  openai_api_key?: string;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Plan {
  id: string; name: string; price_monthly_cents: number; stripe_price_id: string | null;
  max_leads_monthly: number; max_campaigns: number; max_whatsapp_sessions: number; ai_scoring: boolean;
}

export interface Subscription {
  id: string; plan_id: string; plan_name: string; price_monthly_cents: number;
  status: string; current_period_end: string | null; cancel_at_period_end: boolean;
}

export interface Campaign {
  id: string; user_id: string; name: string; ad_id: string | null;
  color: string; is_active: boolean; sheet_tab: string | null;
  leads_count: number; hot_count: number; warm_count: number; cold_count: number;
  today_count: number; keywords: CampaignKeyword[] | null; created_at: string;
}

export interface CampaignKeyword { id: string; keyword: string; is_active: boolean; }

export interface Lead {
  id: string; user_id: string; campaign_id: string | null; campaign_name: string | null;
  campaign_color: string | null; phone: string; name: string | null;
  phone_unresolved: boolean;
  status: 'new' | 'converted' | 'lost';
  ai_score: 'FRIO' | 'TIBIO' | 'CALIENTE' | null;
  ai_reason: string | null; ai_scored_at: string | null;
  received_at: string; converted_at: string | null; sheet_row_index: number | null;
  message_count?: number;
}

export interface Message { id: string; lead_id: string; body: string; from_me: boolean; received_at: string; }

export interface Metrics {
  today: number; month: number; hot: number; converted: number;
  active_campaigns: number; response_rate: number;
  best_campaigns: { id: string; name: string; color: string; total_leads: number; hot_leads: number }[];
}

export interface LeadsResponse { leads: Lead[]; total: number; page: number; pages: number; }

export interface TwilioSession {
  id: string; account_sid: string; phone_number: string;
  display_name: string | null; is_active: boolean; created_at: string;
}

export interface Dialog360Session {
  id: string; channel_id: string; phone_number: string | null;
  display_name: string | null; is_active: boolean; created_at: string;
}

export interface MetaSession {
  id: string; phone_number_id: string; phone_number: string | null;
  display_name: string | null; waba_id?: string; is_active: boolean; created_at: string;
}

export interface OnboardingStatus {
  steps: { account: boolean; whatsapp: boolean; campaigns: boolean; sheets: boolean };
  onboarding_completed: boolean; onboarding_step: number; completedCount: number;
}
