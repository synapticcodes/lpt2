export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID || '',
  whatsappApiKey: import.meta.env.VITE_WHATSAPP_API_KEY || '',
  whatsappApiUrl: import.meta.env.VITE_WHATSAPP_API_URL || '',
  leadTable: import.meta.env.VITE_SUPABASE_LEAD_TABLE || 'leads',
  eventTable: import.meta.env.VITE_SUPABASE_EVENT_TABLE || 'lead_events'
}

export const STORAGE_KEYS = {
  sessionId: 'mnok_session_id',
  utm: 'mnok_utm_params',
  formCompleted: 'mnok_form_completed',
  formSubmitted: 'mnok_form_submitted',
  leadPayload: 'mnok_lead_payload'
}

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'utm_adset',
  'utm_placement',
  'utm_site_source_name'
]
