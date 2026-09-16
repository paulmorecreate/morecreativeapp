// Client-side PDF text extraction — no API calls, no cost

export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = (content.items as any[])
      .map(item => item.str ?? '')
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n')
}

function parseDate(str: string): string | null {
  // "31 August 2026" or "3 September 2026"
  const long = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (long) {
    const d = new Date(`${long[2]} ${long[1]}, ${long[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // "3-September-2026"
  const dashed = str.match(/(\d{1,2})-(\w+)-(\d{4})/)
  if (dashed) {
    const d = new Date(`${dashed[2]} ${dashed[1]}, ${dashed[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // ISO "2026-09-03"
  const iso = str.match(/\d{4}-\d{2}-\d{2}/)
  if (iso) return iso[0]
  return null
}

export interface ExtractedFields {
  title: string
  contract_type: string
  client_name: string
  client_email: string
  brands_involved: string
  effective_date: string
  end_date: string
  signed_date: string
  fee_amount: string
  fee_currency: string
  fee_aed_equivalent: string
  payment_terms: string
  services_summary: string
  territory: string
  governing_law: string
}

export function parseContractFields(text: string): Partial<ExtractedFields> {
  const fields: Partial<ExtractedFields> = {}

  // Title — look for "SERVICE AGREEMENT" header area
  const titleMatch = text.match(/SERVICE AGREEMENT[^\n]*\n+([^\n]{5,80})\n+([^\n]{5,80})/i)
  if (titleMatch) {
    fields.title = `${titleMatch[1].trim()} ${titleMatch[2].trim()}`.replace(/\s+/g, ' ')
  }

  // Client name — "The Client [Name]" pattern from MoreCreative contract tables
  const clientMatch = text.match(/The Client\s+([A-Z][A-Za-z\s&,.'()-]{3,60?})(?:,|\s{2,}|registered)/i)
  if (clientMatch) fields.client_name = clientMatch[1].trim()

  // Client email — any email address
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)
  if (emailMatch) fields.client_email = emailMatch[0]

  // Brands — "The Brands [Brand A] and [Brand B]"
  const brandsMatch = text.match(/The Brands\s+(.{5,120?})(?:\.|each owned)/i)
  if (brandsMatch) {
    const raw = brandsMatch[1]
    // Split on " and " and clean up parenthetical qualifiers
    fields.brands_involved = raw
      .split(/\s+and\s+/i)
      .map(b => b.replace(/\([^)]*\)/g, '').trim())
      .filter(Boolean)
      .join(', ')
  }

  // Effective date
  const effMatch = text.match(/Effective date\s+(\d{1,2}\s+\w+\s+\d{4})/i)
  if (effMatch) fields.effective_date = parseDate(effMatch[1]) ?? ''

  // Signed date — look for dates near signatures ("Date:" or "3-September-2026" pattern)
  const signedMatches = [...text.matchAll(/(\d{1,2}-\w+-\d{4})/g)]
  if (signedMatches.length > 0) {
    fields.signed_date = parseDate(signedMatches[signedMatches.length - 1][1]) ?? ''
  }

  // Fee — primary currency amount (EUR or USD first, then AED)
  const eurMatch = text.match(/EUR\s+([\d,]+)/i)
  if (eurMatch) {
    fields.fee_amount = eurMatch[1].replace(/,/g, '')
    fields.fee_currency = 'EUR'
  } else {
    const usdMatch = text.match(/USD\s+([\d,]+)/i)
    if (usdMatch) {
      fields.fee_amount = usdMatch[1].replace(/,/g, '')
      fields.fee_currency = 'USD'
    }
  }

  // AED equivalent
  const aedMatch = text.match(/AED\s+([\d,]+)/i)
  if (aedMatch) fields.fee_aed_equivalent = aedMatch[1].replace(/,/g, '')

  // Governing law
  const lawMatch = text.match(/governed by the laws of ([^.]+?)\./i)
  if (lawMatch) fields.governing_law = lawMatch[1].trim()

  // Territory — look for city/event name clusters
  const territories: string[] = []
  if (/venice/i.test(text)) territories.push('Venice')
  if (/milan/i.test(text)) territories.push('Milan')
  if (/paris/i.test(text)) territories.push('Paris')
  if (/dubai/i.test(text)) territories.push('Dubai')
  if (/london/i.test(text)) territories.push('London')
  if (/new york/i.test(text)) territories.push('New York')
  if (/riyadh/i.test(text)) territories.push('Riyadh')
  if (territories.length > 0) fields.territory = territories.join(', ')

  // Contract type — detect from keywords
  if (/ambassad/i.test(text)) fields.contract_type = 'ambassadorship'
  else if (/non-disclosure|nda|confidentiality agreement/i.test(text)) fields.contract_type = 'nda'
  else if (/gifting.*seeding|seeding.*gifting/i.test(text)) fields.contract_type = 'gifting_seeding'
  else if (/placement/i.test(text)) fields.contract_type = 'placement'
  else if (/representation/i.test(text)) fields.contract_type = 'representation'
  else if (/service agreement/i.test(text)) fields.contract_type = 'service_agreement'

  // Payment terms — look for payment schedule text
  const payMatch = text.match(/payable on signature[^.]+\./i)
  if (payMatch) fields.payment_terms = payMatch[0].trim()

  // Services summary — first paragraph-ish after PURPOSE section
  const purposeMatch = text.match(/1\.\s*PURPOSE\s+[\d.]+\s+([^.]+\.[^.]+\.)/i)
  if (purposeMatch) fields.services_summary = purposeMatch[1].trim().replace(/\s+/g, ' ')

  return fields
}
