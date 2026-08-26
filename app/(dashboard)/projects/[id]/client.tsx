'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Pencil, Plus, Tag, Trash2, X, CheckCircle2, Circle, CheckCheck, AlertTriangle, Receipt, GripVertical, Loader2, Search, Check, ChevronDown, FileDown } from 'lucide-react'
import { Event, ProjectCategory, Invoice, PurchaseInvoice, ProjectIncome, ProjectExpense, ExpenseCategory, CurrencyRate } from '@/lib/supabase/types'
import { COUNTRIES } from '@/lib/constants/countries'
import { createClient } from '@/lib/supabase/client'
import { AuditStamp } from '@/components/audit-stamp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatDate, cn } from '@/lib/utils'

const projectStatusOpts = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const showTypeOpts = [
  { value: 'Show', label: 'Show' },
  { value: 'Presentation', label: 'Presentation' },
  { value: 'Other', label: 'Other' },
]
const STANDARD_SHOW_TYPES = new Set(showTypeOpts.map(o => o.value))

const talentStatusOpts = [
  { value: 'In Conversation', label: 'In Conversation' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Rejected', label: 'Rejected' },
]

const dealTypeOpts = [
  { value: 'Organic', label: 'Organic' },
  { value: 'Budget', label: 'Budget' },
]

const CREATIVE_OPTIONS = ['Make Up', 'Hair', 'Photographer']

type TalentNote = { id: string; content: string; created_at: string }

type ShowTalent = {
  id: string
  talent_id: string
  accepted: boolean
  status: string | null
  deal_type: string | null
  creative: string | null
  stylist_id: string | null
  show_date: string | null
  show_time: string | null
  notes: string | null
  talent: { id: string; name: string; category: string | null; ig_link: string | null } | null
  stylist: { id: string; name: string } | null
  project_brand_talent_notes?: TalentNote[]
}

type BrandShow = {
  id: string
  brand_id: string
  show_date: string | null
  show_time: string | null
  show_type: string | null
  notes: string | null
  brand: { id: string; name: string } | null
  project_brand_talents: ShowTalent[]
}

type ProjectTalent = {
  id: string
  talent_id: string
  notes: string | null
  talent: { id: string; name: string; category: string | null } | null
  project_talent_notes?: TalentNote[]
}

type SimpleRecord = { id: string; name: string }

type DeleteTarget = {
  type: 'show' | 'show-talent' | 'project-talent'
  id: string
  label: string
  warning?: string
}

type Props = {
  project: Event
  talents: SimpleRecord[]
  brands: SimpleRecord[]
  categories: ProjectCategory[]
  brandShows: BrandShow[]
  stylists: SimpleRecord[]
  projectTalents: ProjectTalent[]
  invoices: Invoice[]
  purchaseInvoices: PurchaseInvoice[]
  income: ProjectIncome[]
  expenses: ProjectExpense[]
  expenseCategories: ExpenseCategory[]
  currencyRates: CurrencyRate[]
  canViewFinance: boolean
  initialTab?: 'overview' | 'finance'
  talentCategories: SimpleRecord[]
  talentLevels: SimpleRecord[]
  agents: { id: string; name: string; agent_type: string | null }[]
  agentTypes: SimpleRecord[]
  people: { id: string; name: string; type: string | null }[]
  industries: SimpleRecord[]
  brandCategories: SimpleRecord[]
}

const EMPTY_NEW_TALENT = {
  name: '', category: '', talent_level: '', email: '', phone: '',
  ig_link: '', tiktok_link: '', ig_followers: '', tiktok_followers: '',
  country: '', notes: '',
}

function MultiSelectList<T extends { id: string; name: string }>({
  items, selected: sel, onToggle, emptyMsg, labelFn,
}: {
  items: T[]; selected: string[]; onToggle: (id: string) => void; emptyMsg: string; labelFn?: (item: T) => string
}) {
  const [q, setQ] = useState('')
  if (items.length === 0) return <p className="text-xs text-gray-400 py-2">{emptyMsg}</p>
  const visible = q ? items.filter(item => (labelFn ? labelFn(item) : item.name).toLowerCase().includes(q.toLowerCase())) : items
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black/10 bg-white" />
      </div>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
        {visible.length === 0
          ? <p className="px-3 py-2 text-xs text-gray-400">No results.</p>
          : visible.map(item => {
              const isSelected = sel.includes(item.id)
              return (
                <button key={item.id} type="button" onClick={() => onToggle(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${isSelected ? 'bg-gray-900 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <span>{labelFn ? labelFn(item) : item.name}</span>
                  {isSelected && <Check className="w-3 h-3 shrink-0" />}
                </button>
              )
            })}
      </div>
    </div>
  )
}

const EMPTY_TALENT_FORM = {
  talent_id: '',
  status: 'In Conversation',
  deal_type: '',
  creative: [] as string[],
  stylist_id: '',
  accepted: false,
  notes: '',
}

const CURRENCY_SYMBOL: Record<string, string> = { AED: 'AED ', EUR: '€', USD: '$', GBP: '£' }
const INVOICE_STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
}
const PO_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
}
const INCOME_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  invoiced: 'bg-green-50 text-green-700',
}
const INCOME_TYPES = [
  { value: 'commission', label: 'Commission' },
  { value: 'talent_fee', label: 'Talent Fee' },
  { value: 'placement_fee', label: 'Placement Fee' },
  { value: 'other', label: 'Other' },
]
const CURRENCIES = ['AED', 'EUR', 'USD', 'GBP']

function fmtAmount(currency: string, amount: number) {
  return `${CURRENCY_SYMBOL[currency] ?? ''}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function toAED(amount: number, currency: string, rates: CurrencyRate[]): number {
  const rate = rates.find(r => r.currency === currency)?.rate_to_aed ?? 1
  return amount * rate
}

function invoiceLineTotal(inv: Invoice & { line_items?: { rate: number; qty: number }[] }): number {
  const subtotal = (inv.line_items ?? []).reduce((s, l) => s + l.rate * l.qty, 0)
  return subtotal + (inv.apply_vat ? subtotal * 0.05 : 0)
}

function PLSummary({
  income, expenses, rates, invoices, purchaseInvoices,
}: {
  income: ProjectIncome[]
  expenses: ProjectExpense[]
  rates: CurrencyRate[]
  invoices: (Invoice & { line_items?: { rate: number; qty: number }[] })[]
  purchaseInvoices: PurchaseInvoice[]
}) {
  const incomeFromEntries = income.reduce((s, i) => s + toAED(i.amount, i.currency, rates), 0)
  const incomeFromInvoices = invoices.reduce((s, inv) => s + toAED(invoiceLineTotal(inv), inv.currency, rates), 0)
  const totalIncomeAED = incomeFromEntries + incomeFromInvoices

  const expensesFromEntries = expenses.reduce((s, e) => s + toAED(e.amount, e.currency, rates), 0)
  const expensesFromPurchases = purchaseInvoices.reduce((s, inv) => s + inv.gross_amount * inv.fx_rate, 0)
  const totalExpensesAED = expensesFromEntries + expensesFromPurchases

  const grossProfit = totalIncomeAED - totalExpensesAED
  const commissionAED = income
    .filter(i => i.type === 'commission')
    .reduce((s, i) => s + toAED(i.amount, i.currency, rates), 0)

  const cards = [
    { label: 'Total Income', value: totalIncomeAED, color: 'text-gray-900' },
    { label: 'Total Expenses', value: totalExpensesAED, color: 'text-gray-900' },
    { label: 'Gross Profit', value: grossProfit, color: grossProfit >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'MC Commission', value: commissionAED, color: 'text-gray-900' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">{c.label}</p>
          <p className={cn('text-lg font-semibold', c.color)}>
            AED {c.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      ))}
    </div>
  )
}

function ProjectFinanceTab({
  projectId,
  invoices: initialInvoices,
  purchaseInvoices: initialPurchaseInvoices,
  income: initialIncome,
  expenses: initialExpenses,
  expenseCategories,
  currencyRates,
}: {
  projectId: string
  invoices: Invoice[]
  purchaseInvoices: PurchaseInvoice[]
  income: ProjectIncome[]
  expenses: ProjectExpense[]
  expenseCategories: ExpenseCategory[]
  currencyRates: CurrencyRate[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [creating, setCreating] = useState(false)

  // Add income
  const [addIncomeOpen, setAddIncomeOpen] = useState(false)
  const [incomeSaving, setIncomeSaving] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ description: '', type: 'commission', amount: '', currency: 'AED', status: 'pending', date: '' })

  // Edit income
  const [editIncome, setEditIncome] = useState<ProjectIncome | null>(null)
  const [editIncomeForm, setEditIncomeForm] = useState({ description: '', type: 'commission', amount: '', currency: 'AED', status: 'pending', date: '' })
  const [editIncomeSaving, setEditIncomeSaving] = useState(false)

  // Add expense
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ description: '', category: '', newCategory: '', amount: '', currency: 'AED', date: '' })

  // Edit expense
  const [editExpense, setEditExpense] = useState<ProjectExpense | null>(null)
  const [editExpenseForm, setEditExpenseForm] = useState({ description: '', category: '', newCategory: '', amount: '', currency: 'AED', date: '' })
  const [editExpenseSaving, setEditExpenseSaving] = useState(false)

  // Delete confirmation
  type DeleteTarget = { table: 'project_income' | 'project_expenses' | 'invoices' | 'purchase_invoices'; id: string; label: string; amount: string }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openEditIncome(inc: ProjectIncome) {
    setEditIncomeForm({ description: inc.description, type: inc.type, amount: String(inc.amount), currency: inc.currency, status: inc.status, date: inc.date ?? '' })
    setEditIncome(inc)
  }

  function openEditExpense(exp: ProjectExpense) {
    setEditExpenseForm({ description: exp.description, category: exp.category, newCategory: '', amount: String(exp.amount), currency: exp.currency, date: exp.date ?? '' })
    setEditExpense(exp)
  }

  async function handleNewInvoice() {
    setCreating(true)
    const year = new Date().getFullYear()
    const { data: last } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single()
    let seq = 1
    if (last?.invoice_number) {
      const parts = last.invoice_number.split('-')
      seq = (parseInt(parts[1] ?? '0', 10) || 0) + 1
    }
    const invoice_number = `${year}-${String(seq).padStart(4, '0')}`
    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({ invoice_number, project_id: projectId, status: 'draft' })
      .select()
      .single()
    setCreating(false)
    if (!error && inv) router.push(`/finance/${inv.id}`)
  }

  async function handleNewPurchaseInvoice() {
    setCreating(true)
    const { data: inv, error } = await supabase
      .from('purchase_invoices')
      .insert({ supplier: '', invoice_number: '', project_id: projectId, status: 'pending', currency: 'AED', net_amount: 0, vat_rate: 0, vat_amount: 0, gross_amount: 0, fx_rate: 1 })
      .select()
      .single()
    setCreating(false)
    if (!error && inv) router.push(`/finance/purchase/${inv.id}`)
  }

  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!incomeForm.description.trim() || !incomeForm.amount) return
    setIncomeSaving(true)
    await supabase.from('project_income').insert({
      project_id: projectId,
      description: incomeForm.description.trim(),
      type: incomeForm.type,
      amount: parseFloat(incomeForm.amount),
      currency: incomeForm.currency,
      status: incomeForm.status,
      date: incomeForm.date || null,
    })
    setIncomeSaving(false)
    setAddIncomeOpen(false)
    setIncomeForm({ description: '', type: 'commission', amount: '', currency: 'AED', status: 'pending', date: '' })
    router.refresh()
  }

  async function handleEditIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!editIncome || !editIncomeForm.description.trim() || !editIncomeForm.amount) return
    setEditIncomeSaving(true)
    await supabase.from('project_income').update({
      description: editIncomeForm.description.trim(),
      type: editIncomeForm.type,
      amount: parseFloat(editIncomeForm.amount),
      currency: editIncomeForm.currency,
      status: editIncomeForm.status,
      date: editIncomeForm.date || null,
    }).eq('id', editIncome.id)
    setEditIncomeSaving(false)
    setEditIncome(null)
    router.refresh()
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expenseForm.description.trim() || !expenseForm.amount) return
    setExpenseSaving(true)
    let category = expenseForm.category
    if (category === '__new__' && expenseForm.newCategory.trim()) {
      const { data: newCat } = await supabase
        .from('expense_categories')
        .insert({ name: expenseForm.newCategory.trim() })
        .select()
        .single()
      category = newCat?.name ?? expenseForm.newCategory.trim()
    }
    await supabase.from('project_expenses').insert({
      project_id: projectId,
      description: expenseForm.description.trim(),
      category,
      amount: parseFloat(expenseForm.amount),
      currency: expenseForm.currency,
      date: expenseForm.date || null,
    })
    setExpenseSaving(false)
    setAddExpenseOpen(false)
    setExpenseForm({ description: '', category: '', newCategory: '', amount: '', currency: 'AED', date: '' })
    router.refresh()
  }

  async function handleEditExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!editExpense || !editExpenseForm.description.trim() || !editExpenseForm.amount) return
    setEditExpenseSaving(true)
    let category = editExpenseForm.category
    if (category === '__new__' && editExpenseForm.newCategory.trim()) {
      const { data: newCat } = await supabase
        .from('expense_categories')
        .insert({ name: editExpenseForm.newCategory.trim() })
        .select()
        .single()
      category = newCat?.name ?? editExpenseForm.newCategory.trim()
    }
    await supabase.from('project_expenses').update({
      description: editExpenseForm.description.trim(),
      category,
      amount: parseFloat(editExpenseForm.amount),
      currency: editExpenseForm.currency,
      date: editExpenseForm.date || null,
    }).eq('id', editExpense.id)
    setEditExpenseSaving(false)
    setEditExpense(null)
    router.refresh()
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from(deleteTarget.table).delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  async function updateIncomeStatus(id: string, status: string) {
    await supabase.from('project_income').update({ status }).eq('id', id)
    router.refresh()
  }

  const categoryOptions = [
    ...expenseCategories.map(c => ({ value: c.name, label: c.name })),
    { value: '__new__', label: '+ Add new category…' },
  ]

  return (
    <div className="space-y-6">
      <PLSummary
        income={initialIncome}
        expenses={initialExpenses}
        rates={currencyRates}
        invoices={initialInvoices}
        purchaseInvoices={initialPurchaseInvoices}
      />

      {/* Income */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Income</h3>
          <button onClick={() => setAddIncomeOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {initialIncome.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No income recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Description</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Type</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Date</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">Amount</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">AED equiv.</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Status</th>
                <th className="px-2 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {initialIncome.map(inc => (
                <tr key={inc.id} className="group">
                  <td className="px-5 py-3 text-gray-900">{inc.description}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {INCOME_TYPES.find(t => t.value === inc.type)?.label ?? inc.type}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {inc.date ? new Date(inc.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{fmtAmount(inc.currency, inc.amount)}</td>
                  <td className="px-5 py-3 text-right text-gray-400 text-xs">
                    {inc.currency !== 'AED'
                      ? `AED ${toAED(inc.amount, inc.currency, currencyRates).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={inc.status}
                      onChange={e => updateIncomeStatus(inc.id, e.target.value)}
                      className={cn('text-xs font-medium px-2 py-0.5 rounded-full border-0 focus:outline-none cursor-pointer', INCOME_STATUS_BADGE[inc.status] ?? 'bg-gray-100 text-gray-600')}
                    >
                      <option value="pending">Pending</option>
                      <option value="invoiced">Invoiced</option>
                    </select>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openEditIncome(inc)} className="text-gray-300 hover:text-gray-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ table: 'project_income', id: inc.id, label: inc.description, amount: fmtAmount(inc.currency, inc.amount) })}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Expenses</h3>
          <button onClick={() => setAddExpenseOpen(true)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {initialExpenses.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No expenses recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Description</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Category</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Date</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">Amount</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">AED equiv.</th>
                <th className="px-2 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {initialExpenses.map(exp => (
                <tr key={exp.id} className="group">
                  <td className="px-5 py-3 text-gray-900">{exp.description}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{exp.category}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">{fmtAmount(exp.currency, exp.amount)}</td>
                  <td className="px-5 py-3 text-right text-gray-400 text-xs">
                    {exp.currency !== 'AED'
                      ? `AED ${toAED(exp.amount, exp.currency, currencyRates).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                      : '—'}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openEditExpense(exp)} className="text-gray-300 hover:text-gray-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ table: 'project_expenses', id: exp.id, label: exp.description, amount: fmtAmount(exp.currency, exp.amount) })}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sales Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Sales Invoices</h3>
          <Button variant="secondary" onClick={handleNewInvoice} disabled={creating}>
            <Plus className="w-3.5 h-3.5" />
            {creating ? 'Creating…' : 'New Sales Invoice'}
          </Button>
        </div>
        {initialInvoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-6 text-center">
            <p className="text-sm text-gray-400">No sales invoices for this project yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Invoice #</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Billed To</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Due Date</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {initialInvoices.map(inv => (
                  <tr key={inv.id} onClick={() => router.push(`/finance/${inv.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                    <td className="px-5 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-gray-700">
                      {inv.billed_to_name ?? <span className="text-gray-300">—</span>}
                      {inv.billed_to_company && <span className="block text-xs text-gray-400">{inv.billed_to_company}</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      <div>{fmtAmount(inv.currency, invoiceLineTotal(inv))}</div>
                      {inv.status === 'partial' && inv.amount_paid > 0 && (
                        <div className="text-xs mt-0.5 space-x-1">
                          <span className="text-green-600">{fmtAmount(inv.currency, inv.amount_paid)} paid</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-amber-600">{fmtAmount(inv.currency, invoiceLineTotal(inv) - inv.amount_paid)} due</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', INVOICE_STATUS_BADGE[inv.status] ?? '')}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget({ table: 'invoices', id: inv.id, label: inv.invoice_number, amount: inv.billed_to_name ?? '' }) }}
                        className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Purchase Invoices</h3>
          <Button variant="secondary" onClick={handleNewPurchaseInvoice} disabled={creating}>
            <Plus className="w-3.5 h-3.5" />
            {creating ? 'Creating…' : 'New Purchase Invoice'}
          </Button>
        </div>
        {initialPurchaseInvoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-6 text-center">
            <p className="text-sm text-gray-400">No purchase invoices for this project yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Invoice #</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Supplier</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Issue Date</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Gross Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {initialPurchaseInvoices.map(inv => (
                  <tr key={inv.id} onClick={() => router.push(`/finance/purchase/${inv.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {inv.invoice_number || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{inv.supplier || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {inv.currency} {inv.gross_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', PO_STATUS_BADGE[inv.status] ?? '')}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget({ table: 'purchase_invoices', id: inv.id, label: inv.supplier || 'Purchase invoice', amount: `${inv.currency} ${inv.gross_amount.toFixed(2)}` }) }}
                        className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Income modal */}
      <Modal open={addIncomeOpen} onClose={() => setAddIncomeOpen(false)} title="Add Income">
        <form onSubmit={handleAddIncome} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Description *</label>
            <Input value={incomeForm.description} onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Sara Sampaio — Manokhi commission" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Type</label>
              <Select value={incomeForm.type} onChange={e => setIncomeForm(f => ({ ...f, type: e.target.value }))} options={INCOME_TYPES} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={incomeForm.status} onChange={e => setIncomeForm(f => ({ ...f, status: e.target.value }))} options={[{ value: 'pending', label: 'Pending' }, { value: 'invoiced', label: 'Invoiced' }]} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Amount *</label>
              <Input type="number" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Currency</label>
              <Select value={incomeForm.currency} onChange={e => setIncomeForm(f => ({ ...f, currency: e.target.value }))} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Date</label>
              <Input type="date" value={incomeForm.date} onChange={e => setIncomeForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddIncomeOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={incomeSaving || !incomeForm.description.trim() || !incomeForm.amount} className="flex-1">{incomeSaving ? 'Saving…' : 'Add Income'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Income modal */}
      <Modal open={!!editIncome} onClose={() => setEditIncome(null)} title="Edit Income">
        <form onSubmit={handleEditIncome} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Description *</label>
            <Input value={editIncomeForm.description} onChange={e => setEditIncomeForm(f => ({ ...f, description: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Type</label>
              <Select value={editIncomeForm.type} onChange={e => setEditIncomeForm(f => ({ ...f, type: e.target.value }))} options={INCOME_TYPES} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Status</label>
              <Select value={editIncomeForm.status} onChange={e => setEditIncomeForm(f => ({ ...f, status: e.target.value }))} options={[{ value: 'pending', label: 'Pending' }, { value: 'invoiced', label: 'Invoiced' }]} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Amount *</label>
              <Input type="number" value={editIncomeForm.amount} onChange={e => setEditIncomeForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Currency</label>
              <Select value={editIncomeForm.currency} onChange={e => setEditIncomeForm(f => ({ ...f, currency: e.target.value }))} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Date</label>
              <Input type="date" value={editIncomeForm.date} onChange={e => setEditIncomeForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditIncome(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={editIncomeSaving || !editIncomeForm.description.trim() || !editIncomeForm.amount} className="flex-1">{editIncomeSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add Expense modal */}
      <Modal open={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Description *</label>
            <Input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Business class flights LHR → OTP" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Category *</label>
            <Select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value, newCategory: '' }))} options={categoryOptions} placeholder="Select category…" />
          </div>
          {expenseForm.category === '__new__' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">New category name *</label>
              <Input value={expenseForm.newCategory} onChange={e => setExpenseForm(f => ({ ...f, newCategory: e.target.value }))} placeholder="e.g. Venue Hire" autoFocus />
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Amount *</label>
              <Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Currency</label>
              <Select value={expenseForm.currency} onChange={e => setExpenseForm(f => ({ ...f, currency: e.target.value }))} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Date</label>
              <Input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setAddExpenseOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={expenseSaving || !expenseForm.description.trim() || !expenseForm.amount || !expenseForm.category || (expenseForm.category === '__new__' && !expenseForm.newCategory.trim())} className="flex-1">{expenseSaving ? 'Saving…' : 'Add Expense'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Expense modal */}
      <Modal open={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense">
        <form onSubmit={handleEditExpense} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Description *</label>
            <Input value={editExpenseForm.description} onChange={e => setEditExpenseForm(f => ({ ...f, description: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Category *</label>
            <Select value={editExpenseForm.category} onChange={e => setEditExpenseForm(f => ({ ...f, category: e.target.value, newCategory: '' }))} options={categoryOptions} />
          </div>
          {editExpenseForm.category === '__new__' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">New category name *</label>
              <Input value={editExpenseForm.newCategory} onChange={e => setEditExpenseForm(f => ({ ...f, newCategory: e.target.value }))} placeholder="e.g. Venue Hire" autoFocus />
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Amount *</label>
              <Input type="number" value={editExpenseForm.amount} onChange={e => setEditExpenseForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Currency</label>
              <Select value={editExpenseForm.currency} onChange={e => setEditExpenseForm(f => ({ ...f, currency: e.target.value }))} options={CURRENCIES.map(c => ({ value: c, label: c }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Date</label>
              <Input type="date" value={editExpenseForm.date} onChange={e => setEditExpenseForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditExpense(null)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={editExpenseSaving || !editExpenseForm.description.trim() || !editExpenseForm.amount || !editExpenseForm.category || (editExpenseForm.category === '__new__' && !editExpenseForm.newCategory.trim())} className="flex-1">{editExpenseSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete entry?">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm font-medium text-red-800">{deleteTarget.label}</p>
              <p className="text-sm text-red-600 mt-0.5">{deleteTarget.amount}</p>
            </div>
            <p className="text-sm text-gray-600">
              {deleteTarget.table === 'invoices'
                ? 'This will permanently delete the sales invoice and all its line items. This cannot be undone.'
                : deleteTarget.table === 'purchase_invoices'
                ? 'This will permanently delete the purchase invoice. This cannot be undone.'
                : `This will permanently remove this ${deleteTarget.table === 'project_income' ? 'income line' : 'expense'} and update the P&L totals. This cannot be undone.`}
            </p>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete it'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function ProjectDetailClient({ project, talents, brands, categories, brandShows, stylists, projectTalents, invoices, purchaseInvoices, income, expenses, expenseCategories, currencyRates, canViewFinance, initialTab = 'overview', talentCategories, talentLevels, agents: allAgents, agentTypes, people: allPeople, industries, brandCategories }: Props) {
  const router = useRouter()

  // Tab
  const [tab, setTab] = useState<'overview' | 'finance'>(initialTab)

  // Project edit
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: project.name ?? '',
    location: project.location ?? '',
    category: project.category ?? '',
    start_date: project.start_date ?? '',
    end_date: project.end_date ?? '',
    status: project.status ?? 'active',
    notes: project.notes ?? '',
  })
  const categoryOpts = categories.map(c => ({ value: c.name, label: c.name }))

  // Brand show modal
  const [showModal, setShowModal] = useState<null | 'add' | BrandShow>(null)
  const [showForm, setShowForm] = useState({ brand_id: '', show_type: '', show_date: '', show_time: '', notes: '' })
  const [showTypeOther, setShowTypeOther] = useState('')

  // New brand inline creation
  const [showBrandMode, setShowBrandMode] = useState<'existing' | 'new'>('existing')
  const EMPTY_NEW_BRAND = { name: '', link: '', category: '', industry: '', country: '', notes: '' }
  const [newBrandForm, setNewBrandForm] = useState(EMPTY_NEW_BRAND)
  const [newBrandCategoryOther, setNewBrandCategoryOther] = useState('')
  const newBrandNameExists = newBrandForm.name.trim() !== '' &&
    brands.some(b => b.name.trim().toLowerCase() === newBrandForm.name.trim().toLowerCase())

  // Quick-add talent to show
  const [quickAddShowId, setQuickAddShowId] = useState<string | null>(null)
  const [quickAddSearchQ, setQuickAddSearchQ] = useState('')
  const [assigningShowId, setAssigningShowId] = useState<string | null>(null)

  // Clear assigning state once the server refresh delivers updated brandShows
  useEffect(() => { setAssigningShowId(null) }, [brandShows])

  // Project-level talent modal (add only)
  const [projectTalentModal, setProjectTalentModal] = useState(false)
  const [projectTalentForm, setProjectTalentForm] = useState({ talent_id: '' })
  const [projectTalentMode, setProjectTalentMode] = useState<'existing' | 'new'>('existing')
  const [newTalentForm, setNewTalentForm] = useState(EMPTY_NEW_TALENT)
  const [ntAgentMode, setNtAgentMode] = useState<'' | 'existing' | 'new'>('')
  const [ntSelectedAgentIds, setNtSelectedAgentIds] = useState<string[]>([])
  const [ntNewAgentName, setNtNewAgentName] = useState('')
  const [ntNewAgentType, setNtNewAgentType] = useState('')
  const [ntNewAgentEmail, setNtNewAgentEmail] = useState('')
  const [ntNewAgentPhone, setNtNewAgentPhone] = useState('')
  const [ntStylistMode, setNtStylistMode] = useState<'' | 'existing' | 'new'>('')
  const [ntSelectedStylistIds, setNtSelectedStylistIds] = useState<string[]>([])
  const [ntNewStylistName, setNtNewStylistName] = useState('')
  const [ntPersonMode, setNtPersonMode] = useState<'' | 'existing' | 'new'>('')
  const [ntSelectedPersonIds, setNtSelectedPersonIds] = useState<string[]>([])
  const [ntNewPersonName, setNtNewPersonName] = useState('')
  const [ntNewPersonType, setNtNewPersonType] = useState('')
  const newTalentNameExists = newTalentForm.name.trim() !== '' &&
    talents.some(t => t.name.trim().toLowerCase() === newTalentForm.name.trim().toLowerCase())

  // Drag-and-drop talent → show
  const [draggingTalentId, setDraggingTalentId] = useState<string | null>(null)
  const [dragOverShowId, setDragOverShowId] = useState<string | null>(null)
  const [dragDuplicateShowId, setDragDuplicateShowId] = useState<string | null>(null)
  const [exportingSchedule, setExportingSchedule] = useState(false)

  // Collapse state for brand show cards — all collapsed by default
  const [collapsedShows, setCollapsedShows] = useState<Set<string>>(() => new Set(brandShows.map(s => s.id)))
  function toggleShowCollapse(showId: string) {
    setCollapsedShows(prev => {
      const next = new Set(prev)
      if (next.has(showId)) next.delete(showId)
      else next.add(showId)
      return next
    })
  }

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Delete project
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }
  function showField(k: keyof typeof showForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setShowForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleDeleteProject() {
    setDeletingProject(true)
    const supabase = createClient()
    const { data: invRows } = await supabase.from('invoices').select('id').eq('project_id', project.id)
    if (invRows?.length) {
      await supabase.from('invoice_line_items').delete().in('invoice_id', invRows.map(i => i.id))
      await supabase.from('invoices').delete().eq('project_id', project.id)
    }
    await supabase.from('purchase_invoices').delete().eq('project_id', project.id)
    await supabase.from('project_income').delete().eq('project_id', project.id)
    await supabase.from('project_expenses').delete().eq('project_id', project.id)
    await supabase.from('events').delete().eq('id', project.id)
    router.push('/projects')
  }

  async function toggleCompleted() {
    const supabase = createClient()
    await supabase.from('events').update({
      status: project.status === 'completed' ? 'active' : 'completed',
    }).eq('id', project.id)
    router.refresh()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('events').update({
      name: form.name || null, location: form.location || null,
      category: form.category || null, start_date: form.start_date || null,
      end_date: form.end_date || null, status: form.status, notes: form.notes || null,
      updated_by: user?.email ?? null, updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    setSaving(false); setOpen(false); router.refresh()
  }

  // Brand show handlers
  function openAddShow() {
    setShowForm({ brand_id: '', show_type: '', show_date: '', show_time: '', notes: '' })
    setShowTypeOther('')
    setShowBrandMode('existing')
    setNewBrandForm(EMPTY_NEW_BRAND)
    setNewBrandCategoryOther('')
    setShowModal('add')
  }
  function openEditShow(show: BrandShow) {
    const isNonStandard = show.show_type != null && !STANDARD_SHOW_TYPES.has(show.show_type)
    setShowForm({
      brand_id: show.brand_id,
      show_type: isNonStandard ? 'Other' : (show.show_type ?? ''),
      show_date: show.show_date ?? '',
      show_time: show.show_time ?? '',
      notes: show.notes ?? '',
    })
    setShowTypeOther(isNonStandard ? (show.show_type ?? '') : '')
    setShowModal(show)
  }
  async function handleShowSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const supabase = createClient()
    const effectiveShowType = showForm.show_type === 'Other'
      ? (showTypeOther.trim() || 'Other')
      : showForm.show_type

    let brandId = showForm.brand_id || null

    if (showModal === 'add' && showBrandMode === 'new' && newBrandForm.name.trim()) {
      const { data: { user } } = await supabase.auth.getUser()
      const effectiveBrandCategory = newBrandForm.category === 'Other'
        ? (newBrandCategoryOther.trim() || 'Other')
        : newBrandForm.category
      const { data: created } = await supabase.from('brands').insert({
        name: newBrandForm.name.trim(),
        link: newBrandForm.link || null,
        category: effectiveBrandCategory || null,
        industry: newBrandForm.industry || null,
        country: newBrandForm.country || null,
        notes: newBrandForm.notes || null,
        created_by: user?.email ?? null,
      }).select('id').single()
      brandId = created?.id ?? null
    }

    const payload = {
      project_id: project.id,
      brand_id: brandId,
      show_type: effectiveShowType || null,
      show_date: showForm.show_date || null,
      show_time: showForm.show_time || null,
      notes: showForm.notes || null,
    }
    if (showModal === 'add') {
      await supabase.from('project_brands').insert(payload)
    } else if (showModal && typeof showModal === 'object') {
      await supabase.from('project_brands').update(payload).eq('id', showModal.id)
    }
    setSaving(false); setShowModal(null); router.refresh()
  }
  function deleteShow(show: BrandShow) {
    setDeleteTarget({
      type: 'show',
      id: show.id,
      label: show.brand?.name ?? 'this brand',
      warning: 'All talents linked to this show will also be removed.',
    })
  }

  function removeTalentFromShow(entry: ShowTalent, brandName: string) {
    setDeleteTarget({
      type: 'show-talent',
      id: entry.id,
      label: `${entry.talent?.name ?? 'this talent'} from ${brandName}`,
    })
  }

  async function assignTalentToShow(show: BrandShow, talentId: string) {
    setQuickAddShowId(null)
    if (show.project_brand_talents.some(t => t.talent_id === talentId)) return
    setAssigningShowId(show.id)
    const supabase = createClient()
    await supabase.from('project_brand_talents').insert({
      project_brand_id: show.id,
      talent_id: talentId,
      status: 'In Conversation',
      accepted: false,
    })
    router.refresh()
  }

  // Project-level talent handlers
  function openAddProjectTalent() {
    setProjectTalentForm({ talent_id: '' })
    setProjectTalentMode('existing')
    setNewTalentForm(EMPTY_NEW_TALENT)
    setNtAgentMode(''); setNtSelectedAgentIds([]); setNtNewAgentName(''); setNtNewAgentType(''); setNtNewAgentEmail(''); setNtNewAgentPhone('')
    setNtStylistMode(''); setNtSelectedStylistIds([]); setNtNewStylistName('')
    setNtPersonMode(''); setNtSelectedPersonIds([]); setNtNewPersonName(''); setNtNewPersonType('')
    setProjectTalentModal(true)
  }
  async function handleProjectTalentSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const supabase = createClient()
    let talentId = projectTalentForm.talent_id || null

    if (projectTalentMode === 'new' && newTalentForm.name.trim()) {
      const { data: created } = await supabase.from('talents').insert({
        name: newTalentForm.name.trim(),
        category: newTalentForm.category || null,
        talent_level: newTalentForm.talent_level || null,
        email: newTalentForm.email || null,
        phone: newTalentForm.phone || null,
        ig_link: newTalentForm.ig_link || null,
        tiktok_link: newTalentForm.tiktok_link || null,
        ig_followers: newTalentForm.ig_followers || null,
        tiktok_followers: newTalentForm.tiktok_followers || null,
        country: newTalentForm.country || null,
        notes: newTalentForm.notes || null,
      }).select('id').single()
      talentId = created?.id ?? null

      if (talentId) {
        const jobs: PromiseLike<unknown>[] = []
        if (ntAgentMode === 'existing' && ntSelectedAgentIds.length > 0)
          jobs.push(supabase.from('talent_agents').insert(ntSelectedAgentIds.map(aid => ({ talent_id: talentId, agent_id: aid }))))
        if (ntAgentMode === 'new' && ntNewAgentName.trim()) {
          jobs.push(supabase.from('agents').insert({ name: ntNewAgentName.trim(), agent_type: ntNewAgentType || null, email: ntNewAgentEmail || null, phone: ntNewAgentPhone || null }).select('id').single()
            .then(({ data: ag }) => ag ? supabase.from('talent_agents').insert({ talent_id: talentId, agent_id: ag.id }) : null))
        }
        if (ntStylistMode === 'existing' && ntSelectedStylistIds.length > 0)
          jobs.push(supabase.from('talent_stylists').insert(ntSelectedStylistIds.map(sid => ({ talent_id: talentId, stylist_id: sid }))))
        if (ntStylistMode === 'new' && ntNewStylistName.trim()) {
          jobs.push(supabase.from('stylists').insert({ name: ntNewStylistName.trim() }).select('id').single()
            .then(({ data: st }) => st ? supabase.from('talent_stylists').insert({ talent_id: talentId, stylist_id: st.id }) : null))
        }
        if (ntPersonMode === 'existing' && ntSelectedPersonIds.length > 0)
          jobs.push(supabase.from('talent_people').insert(ntSelectedPersonIds.map(pid => ({ talent_id: talentId, person_id: pid }))))
        if (ntPersonMode === 'new' && ntNewPersonName.trim()) {
          jobs.push(supabase.from('people').insert({ name: ntNewPersonName.trim(), type: ntNewPersonType || null }).select('id').single()
            .then(({ data: pe }) => pe ? supabase.from('talent_people').insert({ talent_id: talentId, person_id: pe.id }) : null))
        }
        await Promise.all(jobs)
      }
    }

    if (talentId) {
      await supabase.from('project_talents').insert({ project_id: project.id, talent_id: talentId })
    }
    setSaving(false); setProjectTalentModal(false); router.refresh()
  }
  function removeProjectTalent(pt: ProjectTalent) {
    setDeleteTarget({
      type: 'project-talent',
      id: pt.id,
      label: pt.talent?.name ?? 'this talent',
    })
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    if (deleteTarget.type === 'show') {
      await supabase.from('project_brands').delete().eq('id', deleteTarget.id)
    } else if (deleteTarget.type === 'show-talent') {
      await supabase.from('project_brand_talents').delete().eq('id', deleteTarget.id)
    } else if (deleteTarget.type === 'project-talent') {
      await supabase.from('project_talents').delete().eq('id', deleteTarget.id)
    }
    setDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  async function handleDrop(show: BrandShow) {
    if (!draggingTalentId) return
    if (show.project_brand_talents.some(t => t.talent_id === draggingTalentId)) {
      setDragDuplicateShowId(show.id)
      setTimeout(() => setDragDuplicateShowId(null), 1500)
      return
    }
    await assignTalentToShow(show, draggingTalentId)
  }

  const isEditingShow = showModal !== null && typeof showModal === 'object'
  const stylistOpts = stylists.map(s => ({ value: s.id, label: s.name }))

  function poolTalentsForShow(show: BrandShow) {
    const linked = new Set(show.project_brand_talents.map(t => t.talent_id))
    return projectTalents
      .filter(pt => pt.talent_id && !linked.has(pt.talent_id))
      .sort((a, b) => (a.talent?.name ?? '').localeCompare(b.talent?.name ?? ''))
  }

  function allTalentsForShow(show: BrandShow, q: string) {
    const linked = new Set(show.project_brand_talents.map(t => t.talent_id))
    return talents
      .filter(t => !linked.has(t.id) && (q === '' || t.name.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const linkedProjectTalentIds = new Set(projectTalents.map(pt => pt.talent_id))
  const availableProjectTalents = talents.filter(t => !linkedProjectTalentIds.has(t.id))

  function exportShowToExcel(show: BrandShow) {
    const XLSX = require('xlsx') as typeof import('xlsx')

    const rows = show.project_brand_talents
      .slice()
      .sort((a, b) => (a.talent?.name ?? '').localeCompare(b.talent?.name ?? ''))
      .map(entry => ({
        'Talent': entry.talent?.name ?? '',
        'Category': entry.talent?.category ?? '',
        'Instagram': entry.talent?.ig_link ?? '',
        'Status': entry.status ?? '',
        'Deal Type': entry.deal_type ?? '',
        'Creative': entry.creative ?? '',
        'Stylist': entry.stylist?.name ?? '',
        'Date': entry.show_date ?? '',
        'Time': entry.show_time ?? '',
        'Accepted': entry.accepted ? 'Yes' : 'No',
        'Notes': entry.notes ?? '',
        'Comments': (entry.project_brand_talent_notes ?? [])
          .slice()
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map(n => n.content)
          .join(' | '),
      }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Talents')

    const brandName = show.brand?.name ?? 'Show'
    const showDate = show.show_date ? ` ${show.show_date}` : ''
    const fileName = `${project.name} — ${brandName}${showDate}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  async function exportMovieSchedule() {
    if (!project.start_date || !project.end_date) {
      alert('Set the project start and end dates before exporting the schedule.')
      return
    }
    setExportingSchedule(true)
    try {
      const ExcelJS = (await import('exceljs')).default

      function ordSuffix(n: number): string {
        const v = n % 100
        const s = ['th', 'st', 'nd', 'rd']
        return n + (s[(v - 20) % 10] || s[v] || s[0])
      }
      function dateHeader(iso: string): string {
        const [y, m, d] = iso.split('-').map(Number)
        const date = new Date(Date.UTC(y, m - 1, d))
        const wd = date.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }).toUpperCase()
        return `${wd} ${ordSuffix(d)}`
      }

      // Build date column list
      const [sy, sm, sd] = project.start_date.split('-').map(Number)
      const [ey, em, ed] = project.end_date.split('-').map(Number)
      const cursor = new Date(Date.UTC(sy, sm - 1, sd))
      const endUTC = new Date(Date.UTC(ey, em - 1, ed))
      const dates: string[] = []
      while (cursor <= endUTC) {
        dates.push(cursor.toISOString().slice(0, 10))
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      const numCols = dates.length

      const wb = new ExcelJS.Workbook()
      wb.creator = 'MoreCreative'
      const ws = wb.addWorksheet('Movie Schedule')

      ws.columns = dates.map(() => ({ width: 30 }))

      // ── Title row ──────────────────────────────────────────────────────────
      const titleRow = ws.addRow([project.name.toUpperCase() + ' — MOVIE SCHEDULE'])
      ws.mergeCells(1, 1, 1, numCols)
      titleRow.height = 30
      const titleCell = titleRow.getCell(1)
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } }
      titleCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14, name: 'Arial' }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

      // ── Date header row ────────────────────────────────────────────────────
      const headerRow = ws.addRow(dates.map(dateHeader))
      headerRow.height = 36
      for (let c = 1; c <= numCols; c++) {
        const cell = headerRow.getCell(c)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } }
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF007A3D' } },
          left: { style: 'thin', color: { argb: 'FF007A3D' } },
          bottom: { style: 'thin', color: { argb: 'FF007A3D' } },
          right: { style: 'thin', color: { argb: 'FF007A3D' } },
        }
      }

      // ── Pairings eligible for schedule:
      //    • talent has a per-talent date (explicit booking, any status), OR
      //    • talent is Confirmed (uses show-level date as fallback)
      const eligible = brandShows.flatMap(s =>
        s.project_brand_talents
          .filter(e => {
            if (!e.talent) return false
            if (e.show_date) return true
            return (e.status ?? '').toLowerCase() === 'confirmed'
          })
          .map(e => ({ show: s, entry: e, effectiveDate: e.show_date ?? s.show_date }))
      )

      const scheduled = eligible
        .filter(({ effectiveDate }) => effectiveDate && dates.includes(effectiveDate))
        .sort((a, b) => {
          const d = (a.effectiveDate ?? '').localeCompare(b.effectiveDate ?? '')
          return d !== 0 ? d : (a.entry.talent?.name ?? '').localeCompare(b.entry.talent?.name ?? '')
        })

      // ── Eligible but no resolvable date → exception report ─────────
      const unscheduled = eligible
        .filter(({ effectiveDate }) => !effectiveDate || !dates.includes(effectiveDate))
        .sort((a, b) => (a.entry.talent?.name ?? '').localeCompare(b.entry.talent?.name ?? ''))

      // ── Pack talents into rows: one talent per date column per row ───────────
      type Pairing = typeof scheduled[number]
      const packedRows: Array<Map<number, Pairing>> = []

      for (const pairing of scheduled) {
        const colIdx = dates.indexOf(pairing.effectiveDate!) + 1
        let placed = false
        for (const rowMap of packedRows) {
          if (!rowMap.has(colIdx)) {
            rowMap.set(colIdx, pairing)
            placed = true
            break
          }
        }
        if (!placed) {
          const newRow = new Map<number, Pairing>()
          newRow.set(colIdx, pairing)
          packedRows.push(newRow)
        }
      }

      // ── Main schedule rows ─────────────────────────────────────────────────
      for (const rowMap of packedRows) {
        const row = ws.addRow(new Array(numCols).fill(null))
        row.height = 120

        for (let c = 1; c <= numCols; c++) {
          const cell = row.getCell(c)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          }
        }

        for (const [colIdx, { show, entry }] of rowMap) {
          const cell = row.getCell(colIdx)
          const talentName = entry.talent!.name
          const brandName = (show.brand?.name ?? 'Unknown').toUpperCase()
          const plainNotes = entry.notes?.trim() ?? ''
          const threadedNotes = (entry.project_brand_talent_notes ?? [])
            .slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map(n => n.content.trim()).filter(Boolean).join('\n')
          const allNotes = [plainNotes, threadedNotes].filter(Boolean).join('\n')

          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0504D' } }
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }
          cell.border = {
            top: { style: 'medium', color: { argb: 'FFAAAAAA' } },
            left: { style: 'medium', color: { argb: 'FFAAAAAA' } },
            bottom: { style: 'medium', color: { argb: 'FFAAAAAA' } },
            right: { style: 'medium', color: { argb: 'FFAAAAAA' } },
          }
          const timeStr = entry.show_time ? ` · ${entry.show_time}` : ''
          cell.value = {
            richText: [
              { text: `${talentName} - ${brandName} TICKET${timeStr}`, font: { bold: true, size: 10, name: 'Arial', color: { argb: 'FF000000' } } },
              ...(allNotes ? [{ text: `\n${allNotes}`, font: { size: 10, name: 'Arial', color: { argb: 'FF1A1A1A' } } }] : []),
            ],
          }
        }
      }

      // ── Exception section (Confirmed but no show date set) ─────────────────
      if (unscheduled.length > 0) {
        // Spacer row
        ws.addRow(new Array(numCols).fill(null)).height = 12

        // Exception header — spans all columns
        const excHeaderRow = ws.addRow(['⚠️  CONFIRMED — SHOW DATE NOT YET SET'])
        ws.mergeCells(excHeaderRow.number, 1, excHeaderRow.number, numCols)
        excHeaderRow.height = 26
        const excHeaderCell = excHeaderRow.getCell(1)
        excHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB700' } }
        excHeaderCell.font = { bold: true, size: 11, name: 'Arial', color: { argb: 'FF1A1A1A' } }
        excHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }

        // Column sub-headers
        const excColHeaders = ['Talent', 'Brand', 'Notes']
        const excColHeaderRow = ws.addRow([...excColHeaders, ...new Array(numCols - excColHeaders.length).fill(null)])
        excColHeaderRow.height = 20
        excColHeaders.forEach((_, i) => {
          const cell = excColHeaderRow.getCell(i + 1)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }
          cell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF856404' } }
          cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFDDBB00' } },
          }
        })

        // Exception data rows
        for (const { show, entry } of unscheduled) {
          const excPlain = entry.notes?.trim() ?? ''
          const excThreaded = (entry.project_brand_talent_notes ?? [])
            .slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map(n => n.content.trim()).filter(Boolean).join('\n')
          const excNotes = [excPlain, excThreaded].filter(Boolean).join('\n') || '—'
          const excRow = ws.addRow([
            entry.talent!.name,
            show.brand?.name ?? '—',
            excNotes,
            ...new Array(numCols - 3).fill(null),
          ])
          excRow.height = 18
          excRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
            if (colNum > 3) return
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDF0' } }
            cell.font = { size: 10, name: 'Arial', color: { argb: 'FF1A1A1A' } }
            cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 }
            cell.border = {
              bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            }
          })
        }
      }

      // ── Download ───────────────────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name} — Movie Schedule.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExportingSchedule(false)
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
              {project.status === 'completed' && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Completed</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              {project.category && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Tag className="w-3.5 h-3.5" /> {project.category}
                </span>
              )}
              {project.location && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5" /> {project.location}
                </span>
              )}
              {(project.start_date || project.end_date) && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(project.start_date)}{project.end_date ? ` – ${formatDate(project.end_date)}` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={toggleCompleted}>
              <CheckCheck className="w-3.5 h-3.5" />
              {project.status === 'completed' ? 'Mark as Active' : 'Mark as Completed'}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit Project
            </Button>
            <Button variant="secondary" onClick={() => setDeleteProjectOpen(true)} className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      {canViewFinance && (
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['overview', 'finance'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === 'finance' && canViewFinance && (
        <ProjectFinanceTab
          projectId={project.id}
          invoices={invoices}
          purchaseInvoices={purchaseInvoices}
          income={income}
          expenses={expenses}
          expenseCategories={expenseCategories}
          currencyRates={currencyRates}
        />
      )}

      {(tab === 'overview' || !canViewFinance) && (
        <>
      {/* ── Notes ── */}
      {project.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      {/* ── Lineup ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Lineup</h2>
            {brandShows.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <button onClick={() => setCollapsedShows(new Set(brandShows.map(s => s.id)))} className="hover:text-gray-600 transition-colors">collapse all</button>
                <span>·</span>
                <button onClick={() => setCollapsedShows(new Set())} className="hover:text-gray-600 transition-colors">expand all</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openAddProjectTalent}>
              <Plus className="w-3.5 h-3.5" /> Add Talent
            </Button>
            <Button variant="secondary" onClick={openAddShow}>
              <Plus className="w-3.5 h-3.5" /> Add Brand
            </Button>
            {brandShows.some(s => s.show_date || s.project_brand_talents.some(e => e.show_date)) && (
              <Button variant="secondary" onClick={exportMovieSchedule} disabled={exportingSchedule}>
                <FileDown className="w-3.5 h-3.5" />
                {exportingSchedule ? 'Exporting…' : 'Export Schedule'}
              </Button>
            )}
          </div>
        </div>

        {brandShows.length === 0 && projectTalents.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400">
            No lineup yet. Add a brand or talent to get started.
          </div>
        )}

        <div className="space-y-3">
          {/* Brand cards — sky blue accent */}
          {[...brandShows].sort((a, b) => (a.brand?.name ?? '').localeCompare(b.brand?.name ?? '')).map(show => {
            const isCollapsed = collapsedShows.has(show.id)
            return (
            <div
              key={show.id}
              className={cn(
                'bg-white rounded-xl border transition-all',
                dragDuplicateShowId === show.id
                  ? 'border-amber-400 ring-2 ring-amber-100'
                  : dragOverShowId === show.id && draggingTalentId
                  ? 'border-[#FF0031] ring-2 ring-red-100'
                  : 'border-gray-200'
              )}
              onDragOver={e => { e.preventDefault(); if (draggingTalentId) setDragOverShowId(show.id) }}
              onDragEnter={e => { e.preventDefault(); if (draggingTalentId) setDragOverShowId(show.id) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverShowId(null) }}
              onDrop={e => { e.preventDefault(); handleDrop(show); setDragOverShowId(null) }}
            >
              {/* Thinner coloured bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-[#b80024] via-[#ff3355] to-[#b80024] rounded-t-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => toggleShowCollapse(show.id)}
                    className="text-white/60 hover:text-white shrink-0"
                  >
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-150', isCollapsed && '-rotate-90')} />
                  </button>
                  <Link href={`/brands/${show.brand?.id}`} className="text-sm font-semibold text-white hover:text-white/80">
                    {show.brand?.name ?? '—'}
                  </Link>
                  {show.show_type && (
                    <span className="text-xs font-medium text-white/90 bg-black/20 px-2 py-0.5 rounded-full">
                      {show.show_type}
                    </span>
                  )}
                  {show.show_date && (
                    <span className="text-xs text-white/80 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(show.show_date)}
                      {show.show_time && <span className="ml-1 text-white/60">· {show.show_time}</span>}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => exportShowToExcel(show)}
                    className="inline-flex items-center gap-1 text-xs text-white font-medium px-2 py-0.5 rounded bg-black/20 hover:bg-black/35 transition-colors"
                  >
                    <FileDown className="w-3 h-3" /> Export
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => { setQuickAddShowId(quickAddShowId === show.id ? null : show.id); setQuickAddSearchQ('') }}
                      className="inline-flex items-center gap-1 text-xs text-white font-medium px-2 py-0.5 rounded bg-black/20 hover:bg-black/35 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Talent
                    </button>
                    {quickAddShowId === show.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setQuickAddShowId(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-56 flex flex-col">
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                              <input
                                autoFocus
                                value={quickAddSearchQ}
                                onChange={e => setQuickAddSearchQ(e.target.value)}
                                placeholder="Search talents…"
                                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black/10"
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto max-h-52 py-1">
                            {allTalentsForShow(show, quickAddSearchQ).length === 0 ? (
                              <p className="text-xs text-gray-400 px-3 py-2">
                                {quickAddSearchQ ? 'No matches' : 'All talents already added'}
                              </p>
                            ) : (
                              allTalentsForShow(show, quickAddSearchQ).map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => { setQuickAddSearchQ(''); assignTalentToShow(show, t.id) }}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  {t.name}
                                </button>
                              ))
                            )}
                          </div>
                          <div className="border-t border-gray-100 py-1">
                            <button
                              type="button"
                              onClick={() => { setQuickAddShowId(null); setQuickAddSearchQ(''); openAddProjectTalent(); setProjectTalentMode('new') }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                            >
                              <Plus className="w-3 h-3" /> New talent…
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={() => openEditShow(show)} className="text-white hover:bg-black/20 rounded p-1 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteShow(show)} className="text-white hover:bg-black/20 hover:text-red-200 rounded p-1 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notes — always visible below the bar */}
              {show.notes && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                  <p className="text-xs text-red-800">{show.notes}</p>
                </div>
              )}

              {/* Collapsible talents section */}
              {!isCollapsed && (
                <>
                  {assigningShowId === show.id && (
                    <div className="px-5 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-[#b80024] via-[#ff3355] to-[#b80024] text-white text-sm font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding to show…
                    </div>
                  )}
                  {dragOverShowId === show.id && draggingTalentId && assigningShowId !== show.id && (
                    <div className={cn(
                      'px-5 py-2 text-xs font-medium text-center',
                      dragDuplicateShowId === show.id ? 'text-amber-600 bg-amber-50' : 'text-[#FF0031] bg-red-50'
                    )}>
                      {dragDuplicateShowId === show.id
                        ? 'Already in this show'
                        : `Drop to add ${projectTalents.find(pt => pt.talent_id === draggingTalentId)?.talent?.name ?? 'talent'}`}
                    </div>
                  )}
                  {show.project_brand_talents.length === 0 ? (
                    <p className="px-5 py-3 text-xs text-gray-400">No talents added yet. Drag a talent here or use + Add Talent.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Talent</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Deal</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Creative</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Stylist</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Date / Time</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</th>
                          <th className="px-4 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[...show.project_brand_talents].sort((a, b) => (a.talent?.name ?? '').localeCompare(b.talent?.name ?? '')).map(entry => (
                          <InlineShowTalentRow
                            key={entry.id}
                            entry={entry}
                            stylists={stylists}
                            onRemove={() => removeTalentFromShow(entry, show.brand?.name ?? '')}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
            )
          })}

          {/* Talent pool — table with drag handles */}
          {projectTalents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-300 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300">
                <span className="text-sm font-semibold text-slate-700">Talent Pool</span>
                {brandShows.length > 0 && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <GripVertical className="w-3 h-3" /> Drag onto a show to assign
                  </span>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="w-8 px-3 py-2" />
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Talent</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</th>
                    <th className="w-8 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...projectTalents].sort((a, b) => (a.talent?.name ?? '').localeCompare(b.talent?.name ?? '')).map(pt => (
                    <InlineProjectTalentRow
                      key={pt.id}
                      pt={pt}
                      isDragging={draggingTalentId === pt.talent_id}
                      brandShows={brandShows}
                      onDragStart={() => setDraggingTalentId(pt.talent_id ?? null)}
                      onDragEnd={() => { setDraggingTalentId(null); setDragOverShowId(null) }}
                      onAssignToShow={show => assignTalentToShow(show, pt.talent_id)}
                      onRemove={() => removeProjectTalent(pt)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      <AuditStamp createdBy={project.created_by} createdAt={project.created_at} updatedBy={project.updated_by} updatedAt={project.updated_at} />

      {/* ── Modals ── */}

      {/* Add/Edit Brand */}
      <Modal
        open={showModal !== null}
        onClose={() => { setShowModal(null); setShowTypeOther('') }}
        title={isEditingShow ? 'Edit Brand' : 'Add Brand'}
      >
        <form onSubmit={handleShowSubmit} className="space-y-4">

          {/* Brand selector — only shown when adding (not editing) */}
          {!isEditingShow && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowBrandMode('existing'); setNewBrandForm(EMPTY_NEW_BRAND); setNewBrandCategoryOther('') }}
                  className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', showBrandMode === 'existing' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                >
                  Existing brand
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBrandMode('new'); setShowForm(f => ({ ...f, brand_id: '' })) }}
                  className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', showBrandMode === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                >
                  New brand
                </button>
              </div>

              {showBrandMode === 'existing' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Brand</label>
                  <Select
                    value={showForm.brand_id}
                    onChange={showField('brand_id')}
                    options={brands.map(b => ({ value: b.id, label: b.name }))}
                    placeholder="Select brand…"
                  />
                </div>
              ) : (
                <div className="space-y-3 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Brand Name *</label>
                    <Input
                      value={newBrandForm.name}
                      onChange={e => setNewBrandForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Brand name"
                      autoFocus
                    />
                    {newBrandNameExists && <p className="text-xs text-red-500">A brand with this name already exists.</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">Category</label>
                      <Select
                        value={newBrandForm.category}
                        onChange={e => setNewBrandForm(f => ({ ...f, category: e.target.value }))}
                        options={brandCategories.map(c => ({ value: c.name, label: c.name }))}
                        placeholder="Select…"
                      />
                      {newBrandForm.category === 'Other' && (
                        <Input
                          value={newBrandCategoryOther}
                          onChange={e => setNewBrandCategoryOther(e.target.value)}
                          placeholder="Please specify…"
                        />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">Industry</label>
                      <Select
                        value={newBrandForm.industry}
                        onChange={e => setNewBrandForm(f => ({ ...f, industry: e.target.value }))}
                        options={industries.map(i => ({ value: i.name, label: i.name }))}
                        placeholder="Select…"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Instagram / Website</label>
                    <Input
                      value={newBrandForm.link}
                      onChange={e => setNewBrandForm(f => ({ ...f, link: e.target.value }))}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Country</label>
                    <Select
                      value={newBrandForm.country}
                      onChange={e => setNewBrandForm(f => ({ ...f, country: e.target.value }))}
                      options={COUNTRIES}
                      placeholder="Select…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Notes</label>
                    <Textarea
                      value={newBrandForm.notes}
                      onChange={e => setNewBrandForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Status update, situation…"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* When editing, show brand name read-only */}
          {isEditingShow && typeof showModal === 'object' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Brand</label>
              <p className="text-sm font-medium text-gray-900">{showModal.brand?.name ?? '—'}</p>
            </div>
          )}

          {/* Show type / date / time / notes — always shown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Type</label>
              <Select
                value={showForm.show_type}
                onChange={showField('show_type')}
                options={showTypeOpts}
                placeholder="Select type…"
              />
              {showForm.show_type === 'Other' && (
                <Input
                  value={showTypeOther}
                  onChange={e => setShowTypeOther(e.target.value)}
                  placeholder="Please specify…"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Show Date</label>
              <Input type="date" value={showForm.show_date} onChange={showField('show_date')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Show Time</label>
            <Input value={showForm.show_time} onChange={showField('show_time')} placeholder="e.g. 2:30 PM" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Show Notes</label>
            <Textarea value={showForm.notes} onChange={showField('notes')} rows={2} placeholder="Any context…" />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowModal(null)} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={saving || (showModal === 'add' && showBrandMode === 'new' && (!newBrandForm.name.trim() || newBrandNameExists))}
              className="flex-1"
            >
              {saving ? 'Saving…' : isEditingShow ? 'Save Changes' : 'Add Brand'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Talent to Project Pool */}
      <Modal
        open={projectTalentModal}
        onClose={() => setProjectTalentModal(false)}
        title="Add Talent to Project"
      >
        <form onSubmit={handleProjectTalentSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => setProjectTalentMode('existing')}
              className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', projectTalentMode === 'existing' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
            >
              Existing talent
            </button>
            <button
              type="button"
              onClick={() => setProjectTalentMode('new')}
              className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', projectTalentMode === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
            >
              New talent
            </button>
          </div>

          {projectTalentMode === 'existing' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Talent</label>
              <Select
                value={projectTalentForm.talent_id}
                onChange={e => setProjectTalentForm({ talent_id: e.target.value })}
                options={availableProjectTalents.map(t => ({ value: t.id, label: t.name }))}
                placeholder="Select talent…"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Name *</label>
                <Input value={newTalentForm.name} onChange={e => setNewTalentForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" autoFocus required />
                {newTalentNameExists && <p className="text-xs text-red-500">A talent with this name already exists.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Category</label>
                  <Select value={newTalentForm.category} onChange={e => setNewTalentForm(f => ({ ...f, category: e.target.value }))} options={talentCategories.map(c => ({ value: c.name, label: c.name }))} placeholder="Select…" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Talent Level</label>
                  <Select value={newTalentForm.talent_level} onChange={e => setNewTalentForm(f => ({ ...f, talent_level: e.target.value }))} options={talentLevels.map(l => ({ value: l.name, label: l.name }))} placeholder="Select…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Email</label>
                  <Input type="email" value={newTalentForm.email} onChange={e => setNewTalentForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Phone</label>
                  <Input value={newTalentForm.phone} onChange={e => setNewTalentForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Instagram URL</label>
                  <Input value={newTalentForm.ig_link} onChange={e => setNewTalentForm(f => ({ ...f, ig_link: e.target.value }))} placeholder="https://instagram.com/…" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">TikTok URL</label>
                  <Input value={newTalentForm.tiktok_link} onChange={e => setNewTalentForm(f => ({ ...f, tiktok_link: e.target.value }))} placeholder="https://tiktok.com/@…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">IG Followers</label>
                  <Input value={newTalentForm.ig_followers} onChange={e => setNewTalentForm(f => ({ ...f, ig_followers: e.target.value }))} placeholder="e.g. 250K" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">TikTok Followers</label>
                  <Input value={newTalentForm.tiktok_followers} onChange={e => setNewTalentForm(f => ({ ...f, tiktok_followers: e.target.value }))} placeholder="e.g. 1.2M" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Country</label>
                <Select value={newTalentForm.country} onChange={e => setNewTalentForm(f => ({ ...f, country: e.target.value }))} options={COUNTRIES} placeholder="Select…" />
              </div>
              {/* Agent */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="text-xs font-medium text-gray-700">Agent</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setNtAgentMode(ntAgentMode === 'existing' ? '' : 'existing'); setNtSelectedAgentIds([]); setNtNewAgentName('') }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ntAgentMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>Select existing</button>
                  <button type="button" onClick={() => { setNtAgentMode(ntAgentMode === 'new' ? '' : 'new'); setNtSelectedAgentIds([]); setNtNewAgentName('') }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ntAgentMode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>Add new agent</button>
                </div>
                {ntAgentMode === 'existing' && (
                  <MultiSelectList items={allAgents} selected={ntSelectedAgentIds} onToggle={id => setNtSelectedAgentIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])} emptyMsg="No agents in directory yet." labelFn={a => a.name + (a.agent_type ? ` · ${a.agent_type}` : '')} />
                )}
                {ntAgentMode === 'new' && (
                  <div className="space-y-2">
                    <Input value={ntNewAgentName} onChange={e => setNtNewAgentName(e.target.value)} placeholder="Full name *" />
                    <Select value={ntNewAgentType} onChange={e => setNtNewAgentType(e.target.value)} options={agentTypes.map(t => ({ value: t.name, label: t.name }))} placeholder="Agent type (optional)…" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="email" value={ntNewAgentEmail} onChange={e => setNtNewAgentEmail(e.target.value)} placeholder="Email (optional)" />
                      <Input value={ntNewAgentPhone} onChange={e => setNtNewAgentPhone(e.target.value)} placeholder="Phone (optional)" />
                    </div>
                  </div>
                )}
              </div>
              {/* Stylist */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="text-xs font-medium text-gray-700">Stylist</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setNtStylistMode(ntStylistMode === 'existing' ? '' : 'existing'); setNtSelectedStylistIds([]); setNtNewStylistName('') }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ntStylistMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>Select existing</button>
                  <button type="button" onClick={() => { setNtStylistMode(ntStylistMode === 'new' ? '' : 'new'); setNtSelectedStylistIds([]); setNtNewStylistName('') }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ntStylistMode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>Add new stylist</button>
                </div>
                {ntStylistMode === 'existing' && (
                  <MultiSelectList items={stylists} selected={ntSelectedStylistIds} onToggle={id => setNtSelectedStylistIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])} emptyMsg="No stylists in directory yet." />
                )}
                {ntStylistMode === 'new' && (
                  <Input value={ntNewStylistName} onChange={e => setNtNewStylistName(e.target.value)} placeholder="Full name *" />
                )}
              </div>
              {/* People */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="text-xs font-medium text-gray-700">People</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setNtPersonMode(ntPersonMode === 'existing' ? '' : 'existing'); setNtSelectedPersonIds([]); setNtNewPersonName('') }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ntPersonMode === 'existing' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>Select existing</button>
                  <button type="button" onClick={() => { setNtPersonMode(ntPersonMode === 'new' ? '' : 'new'); setNtSelectedPersonIds([]); setNtNewPersonName('') }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${ntPersonMode === 'new' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>Add new person</button>
                </div>
                {ntPersonMode === 'existing' && (
                  <MultiSelectList items={allPeople} selected={ntSelectedPersonIds} onToggle={id => setNtSelectedPersonIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])} emptyMsg="No people in directory yet." labelFn={p => p.name + (p.type ? ` · ${p.type}` : '')} />
                )}
                {ntPersonMode === 'new' && (
                  <div className="space-y-2">
                    <Input value={ntNewPersonName} onChange={e => setNtNewPersonName(e.target.value)} placeholder="Full name *" />
                    <Input value={ntNewPersonType} onChange={e => setNtNewPersonType(e.target.value)} placeholder="Type (optional, e.g. PR, Journalist…)" />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <Textarea value={newTalentForm.notes} onChange={e => setNewTalentForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any notes…" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setProjectTalentModal(false)} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={saving || (projectTalentMode === 'existing' ? !projectTalentForm.talent_id : !newTalentForm.name.trim() || newTalentNameExists)}
              className="flex-1"
            >
              {saving ? 'Adding…' : 'Add to Project'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Confirm removal">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Remove <strong>{deleteTarget?.label}</strong>? This cannot be undone.
          </p>
          {deleteTarget?.warning && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {deleteTarget.warning}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={deleting} onClick={handleConfirmDelete} className="flex-1">
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Project */}
      <Modal open={deleteProjectOpen} onClose={() => setDeleteProjectOpen(false)} title="Delete Project">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This will permanently delete <strong>{project.name}</strong> and all associated brand shows, talent entries, invoices, income, and expense records. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteProjectOpen(false)} className="flex-1">Cancel</Button>
            <Button type="button" onClick={handleDeleteProject} disabled={deletingProject} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600">
              {deletingProject ? 'Deleting…' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Project">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Project Name</label>
            <Input value={form.name} onChange={field('name')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <Select value={form.category} onChange={field('category')} options={categoryOpts} placeholder="Select…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Location</label>
              <Input value={form.location} onChange={field('location')} placeholder="City, Country" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Start Date</label>
              <Input type="date" value={form.start_date} onChange={field('start_date')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">End Date</label>
              <Input type="date" value={form.end_date} onChange={field('end_date')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Status</label>
            <Select value={form.status} onChange={field('status')} options={projectStatusOpts} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Notes</label>
            <Textarea value={form.notes} onChange={field('notes')} rows={3} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const CREATIVE_ABBREV: Record<string, string> = {
  'Make Up': 'MU',
  'Hair': 'H',
  'Photographer': 'Ph',
}

function InlineShowTalentRow({
  entry,
  stylists,
  onRemove,
}: {
  entry: ShowTalent
  stylists: SimpleRecord[]
  onRemove: () => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const [status, setStatus] = useState(entry.status ?? '')
  const [dealType, setDealType] = useState(entry.deal_type ?? '')
  const [creative, setCreative] = useState<string[]>(
    entry.creative ? entry.creative.split(',').map(s => s.trim()).filter(Boolean) : []
  )
  const [stylistId, setStylistId] = useState(entry.stylist_id ?? '')
  const [showDate, setShowDate] = useState(entry.show_date ?? '')
  const [showTime, setShowTime] = useState(entry.show_time ?? '')
  const [notesList, setNotesList] = useState<TalentNote[]>(
    [...(entry.project_brand_talent_notes ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  )
  const [noteModal, setNoteModal] = useState<null | { mode: 'add' } | { mode: 'edit'; note: TalentNote }>(null)
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  async function save(data: Record<string, unknown>) {
    await supabase.from('project_brand_talents').update(data).eq('id', entry.id)
  }

  function toggleCreative(opt: string) {
    const next = creative.includes(opt) ? creative.filter(c => c !== opt) : [...creative, opt]
    setCreative(next)
    save({ creative: next.length ? next.join(', ') : null })
  }

  function openAddNote() { setNoteContent(''); setNoteModal({ mode: 'add' }) }
  function openEditNote(note: TalentNote) { setNoteContent(note.content); setNoteModal({ mode: 'edit', note }) }
  function closeNoteModal() { setNoteModal(null); setNoteContent('') }

  async function saveNote() {
    const content = noteContent.trim()
    if (!content) return
    setSavingNote(true)
    if (noteModal?.mode === 'add') {
      const { data } = await supabase
        .from('project_brand_talent_notes')
        .insert({ project_brand_talent_id: entry.id, content })
        .select().single()
      if (data) setNotesList(prev => [...prev, data as TalentNote])
    } else if (noteModal?.mode === 'edit') {
      await supabase.from('project_brand_talent_notes').update({ content }).eq('id', noteModal.note.id)
      setNotesList(prev => prev.map(n => n.id === noteModal.note.id ? { ...n, content } : n))
    }
    closeNoteModal()
    setSavingNote(false)
  }

  async function deleteNote(noteId: string) {
    await supabase.from('project_brand_talent_notes').delete().eq('id', noteId)
    setNotesList(prev => prev.filter(n => n.id !== noteId))
  }

  return (
    <>
    <tr className="group border-b border-gray-50 hover:bg-gray-50/40 align-top">
      {/* Talent */}
      <td className="px-5 py-2.5 min-w-[140px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/talents/${entry.talent?.id}`} className="font-medium text-sm text-gray-900 hover:text-black">
            {entry.talent?.name ?? '—'}
          </Link>
          {entry.talent?.category && <Badge value={entry.talent.category} />}
          <button type="button" onClick={openAddNote} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            + note
          </button>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-2.5 min-w-[110px]">
        <select
          value={status}
          onChange={e => { const v = e.target.value; setStatus(v); save({ status: v || null }) }}
          className={cn(
            'text-xs rounded-full px-2 py-0.5 border font-medium focus:outline-none cursor-pointer w-full',
            status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
            status === 'In Conversation' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-gray-100 text-gray-500 border-gray-200'
          )}
        >
          <option value="">—</option>
          {talentStatusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>

      {/* Deal */}
      <td className="px-4 py-2.5 min-w-[90px]">
        <select
          value={dealType}
          onChange={e => { const v = e.target.value; setDealType(v); save({ deal_type: v || null }) }}
          className="text-xs rounded px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none cursor-pointer text-gray-600 bg-transparent w-full"
        >
          <option value="">—</option>
          {dealTypeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>

      {/* Creative — abbreviated pills */}
      <td className="px-4 py-2.5">
        <div className="flex gap-1">
          {CREATIVE_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              title={opt}
              onClick={() => toggleCreative(opt)}
              className={cn(
                'text-xs px-1.5 py-0.5 rounded border transition-all font-medium',
                creative.includes(opt)
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'text-gray-300 border-gray-200 hover:text-gray-500 hover:border-gray-300'
              )}
            >
              {CREATIVE_ABBREV[opt] ?? opt}
            </button>
          ))}
        </div>
      </td>

      {/* Stylist */}
      <td className="px-4 py-2.5 min-w-[100px]">
        <select
          value={stylistId}
          onChange={e => { const v = e.target.value; setStylistId(v); save({ stylist_id: v || null }) }}
          className="text-xs rounded px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none cursor-pointer text-gray-600 bg-transparent w-full"
        >
          <option value="">—</option>
          {stylists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>

      {/* Per-talent date / time */}
      <td className="px-4 py-2.5 min-w-[200px]">
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={showDate}
            onChange={async e => { const v = e.target.value; setShowDate(v); await save({ show_date: v || null }); router.refresh() }}
            className="text-xs rounded px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none text-gray-600 bg-transparent"
          />
          <input
            type="time"
            value={showTime}
            onChange={async e => { const v = e.target.value; setShowTime(v); await save({ show_time: v || null }) }}
            className="text-xs rounded px-2 py-1 border border-transparent hover:border-gray-200 focus:border-gray-300 focus:outline-none text-gray-600 bg-transparent"
          />
        </div>
      </td>

      {/* Notes */}
      <td className="px-4 py-2.5">
        <div className="space-y-0.5 min-w-[160px]">
          {notesList.map(note => (
            <div key={note.id} className="flex items-center gap-1">
              <span
                onClick={() => openEditNote(note)}
                title="Click to edit"
                className="text-xs text-gray-700 flex-1 cursor-text hover:text-gray-900"
              >
                {note.content}
              </span>
              <button type="button" onClick={() => deleteNote(note.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </td>

      {/* Remove talent from show */}
      <td className="px-4 py-2.5 w-10">
        <button
          type="button"
          onClick={onRemove}
          title="Remove from show"
          className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
    <Modal
      open={noteModal !== null}
      onClose={closeNoteModal}
      title={noteModal?.mode === 'edit' ? `Edit note — ${entry.talent?.name ?? ''}` : `Add note — ${entry.talent?.name ?? ''}`}
    >
      <div className="space-y-4">
        <Textarea
          autoFocus
          rows={4}
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') closeNoteModal() }}
          placeholder="Type your note…"
          disabled={savingNote}
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={closeNoteModal} className="flex-1">Cancel</Button>
          <Button type="button" onClick={saveNote} disabled={savingNote || !noteContent.trim()} className="flex-1">
            {savingNote ? 'Saving…' : 'Save Note'}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  )
}

function TalentStatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>
  const styles: Record<string, string> = {
    'Confirmed': 'bg-emerald-50 text-emerald-700',
    'In Conversation': 'bg-amber-50 text-amber-700',
    'Rejected': 'bg-red-50 text-red-600',
  }
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${styles[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {value}
    </span>
  )
}

function InlineProjectTalentRow({
  pt,
  isDragging,
  brandShows,
  onDragStart,
  onDragEnd,
  onAssignToShow,
  onRemove,
}: {
  pt: ProjectTalent
  isDragging: boolean
  brandShows: BrandShow[]
  onDragStart: () => void
  onDragEnd: () => void
  onAssignToShow: (show: BrandShow) => void
  onRemove: () => void
}) {
  const supabase = createClient()
  const [notesList, setNotesList] = useState<TalentNote[]>(
    [...(pt.project_talent_notes ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  )
  const [noteModal, setNoteModal] = useState<null | { mode: 'add' } | { mode: 'edit'; note: TalentNote }>(null)
  const [noteContent, setNoteContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const availableShows = brandShows.filter(
    s => !s.project_brand_talents.some(t => t.talent_id === pt.talent_id)
  )

  function openAddNote() { setNoteContent(''); setNoteModal({ mode: 'add' }) }
  function openEditNote(note: TalentNote) { setNoteContent(note.content); setNoteModal({ mode: 'edit', note }) }
  function closeNoteModal() { setNoteModal(null); setNoteContent('') }

  async function saveNote() {
    const content = noteContent.trim()
    if (!content) return
    setSavingNote(true)
    if (noteModal?.mode === 'add') {
      const { data } = await supabase
        .from('project_talent_notes')
        .insert({ project_talent_id: pt.id, content })
        .select().single()
      if (data) setNotesList(prev => [...prev, data as TalentNote])
    } else if (noteModal?.mode === 'edit') {
      await supabase.from('project_talent_notes').update({ content }).eq('id', noteModal.note.id)
      setNotesList(prev => prev.map(n => n.id === noteModal.note.id ? { ...n, content } : n))
    }
    closeNoteModal()
    setSavingNote(false)
  }

  async function deleteNote(noteId: string) {
    await supabase.from('project_talent_notes').delete().eq('id', noteId)
    setNotesList(prev => prev.filter(n => n.id !== noteId))
  }

  return (
    <>
    <tr
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group border-b border-gray-50 hover:bg-gray-50/40 align-top transition-opacity',
        isDragging ? 'opacity-40' : ''
      )}
    >
      {/* Drag handle */}
      <td className="px-3 py-3 w-8">
        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing" />
      </td>

      {/* Talent */}
      <td className="px-4 py-2.5 min-w-[180px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/talents/${pt.talent?.id}`} className="font-medium text-sm text-gray-900 hover:text-black">
            {pt.talent?.name ?? '—'}
          </Link>
          {pt.talent?.category && <Badge value={pt.talent.category} />}
          <button type="button" onClick={openAddNote} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            + note
          </button>
        </div>
      </td>

      {/* Notes */}
      <td className="px-4 py-2.5">
        <div className="space-y-0.5 min-w-[200px]">
          {notesList.map(note => (
            <div key={note.id} className="flex items-center gap-1">
              <span
                onClick={() => openEditNote(note)}
                title="Click to edit"
                className="text-xs text-gray-700 flex-1 cursor-text hover:text-gray-900"
              >
                {note.content}
              </span>
              <button type="button" onClick={() => deleteNote(note.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 min-w-[120px]">
        <div className="flex items-center gap-2">
          {/* Assign to show */}
          {brandShows.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPicker(p => !p)}
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border transition-colors whitespace-nowrap',
                  availableShows.length === 0
                    ? 'text-gray-300 border-gray-200 cursor-default'
                    : 'text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100'
                )}
                disabled={availableShows.length === 0}
                title={availableShows.length === 0 ? 'Already in all shows' : 'Add to a Brand / Show'}
              >
                <Plus className="w-3 h-3" /> Add to Show
              </button>
              {showPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
                  <div className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1 max-h-64 overflow-y-auto">
                    <p className="text-xs text-gray-400 px-3 pt-1.5 pb-1 font-medium uppercase tracking-wide">Assign to show</p>
                    {availableShows.length === 0 ? (
                      <p className="text-xs text-gray-400 px-3 py-2">Already in all shows</p>
                    ) : (
                      availableShows.map(show => (
                        <button
                          key={show.id}
                          type="button"
                          onClick={() => { onAssignToShow(show); setShowPicker(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="font-medium">{show.brand?.name ?? '—'}</span>
                          {show.show_date && (
                            <span className="text-xs text-gray-400">{formatDate(show.show_date)}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onRemove}
            title="Remove from project"
            className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
    <Modal
      open={noteModal !== null}
      onClose={closeNoteModal}
      title={noteModal?.mode === 'edit' ? `Edit note — ${pt.talent?.name ?? ''}` : `Add note — ${pt.talent?.name ?? ''}`}
    >
      <div className="space-y-4">
        <Textarea
          autoFocus
          rows={4}
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') closeNoteModal() }}
          placeholder="Type your note…"
          disabled={savingNote}
        />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={closeNoteModal} className="flex-1">Cancel</Button>
          <Button type="button" onClick={saveNote} disabled={savingNote || !noteContent.trim()} className="flex-1">
            {savingNote ? 'Saving…' : 'Save Note'}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  )
}
