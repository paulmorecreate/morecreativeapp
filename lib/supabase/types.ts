export interface Talent {
  id: string
  name: string
  ig_link: string | null
  tiktok_link: string | null
  ig_followers: string | null
  tiktok_followers: string | null
  category: string | null
  talent_level: string | null
  status: string | null
  country: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TalentLevel {
  id: string
  name: string
  created_at: string
}

export interface TalentContact {
  id: string
  talent_id: string
  name: string | null
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface TalentCategory {
  id: string
  name: string
  created_at: string
}

export interface BrandCategory {
  id: string
  name: string
  created_at: string
}

export interface Brand {
  id: string
  name: string
  link: string | null
  tiktok_link: string | null
  ig_followers: string | null
  tiktok_followers: string | null
  category: string | null
  status: string | null
  industry: string | null
  country: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  name: string
  location: string | null
  start_date: string | null
  end_date: string | null
  status: string
  category: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Opportunity {
  id: string
  talent_id: string | null
  brand_id: string | null
  event_id: string | null
  type: string | null
  status: string | null
  estimated_value: number | null
  priority: string | null
  follow_up: string | null
  notes: string | null
  created_at: string
  updated_at: string
  talent?: Talent
  brand?: Brand
  event?: Event
}

export interface TalentEventDetail {
  id: string
  talent_id: string
  event_id: string
  carpet_date: string | null
  hotel: string | null
  ticket: string | null
  driver: string | null
  airport_transfer: string | null
  makeup: string | null
  hair: string | null
  dress: string | null
  jewelry: string | null
  shoes: string | null
  content: string | null
  agent_contact: string | null
  extra_notes: string | null
  created_at: string
  updated_at: string
  talent?: Talent
  event?: Event
}

export interface Conversation {
  id: string
  entity_type: string
  entity_id: string
  channel: string | null
  content: string | null
  follow_up: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  instagram: string | null
  brand_id: string | null
  role: string | null
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ProjectCategory {
  id: string
  name: string
  created_at: string
}

export interface Industry {
  id: string
  name: string
  created_at: string
}

export interface AgentType {
  id: string
  name: string
  created_at: string
}

export interface Agency {
  id: string
  name: string
  website: string | null
  country: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  name: string
  agent_type: string | null
  agency_id: string | null
  country: string | null
  email: string | null
  phone: string | null
  website: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AgentContact {
  id: string
  agent_id: string
  name: string | null
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface Stylist {
  id: string
  name: string
  based: string | null
  email: string | null
  phone: string | null
  url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Photographer {
  id: string
  name: string
  specialty: string | null
  based: string | null
  ig_link: string | null
  website: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Person {
  id: string
  name: string
  type: string | null
  based: string | null
  email: string | null
  phone: string | null
  url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PhotographerContact {
  id: string
  photographer_id: string
  name: string | null
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface InvoiceSettings {
  id: string
  company_name: string
  company_phone: string | null
  company_address: string | null
  company_vat_number: string | null
  bank_account_holder: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_iban: string | null
  bank_swift: string | null
  updated_at: string
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  rate: number
  qty: number
  sort_order: number
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  project_id: string | null
  currency: 'AED' | 'EUR' | 'USD'
  apply_vat: boolean
  status: 'draft' | 'sent' | 'paid'
  issue_date: string | null
  due_date: string | null
  billed_to_name: string | null
  billed_to_company: string | null
  billed_to_address: string | null
  amount_paid: number
  notes: string | null
  created_at: string
  updated_at: string
  line_items?: InvoiceLineItem[]
  project?: { id: string; name: string } | null
}

export type UserRole = 'admin' | 'finance' | 'general'
