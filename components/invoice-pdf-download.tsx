'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { InvoiceDocument } from './invoice-pdf'
import { Invoice, InvoiceLineItem, InvoiceSettings } from '@/lib/supabase/types'
import { Download } from 'lucide-react'
import { Button } from './ui/button'

type Props = {
  invoice: Invoice
  lineItems: InvoiceLineItem[]
  settings: InvoiceSettings
  fileName: string
}

export function InvoicePDFDownload({ invoice, lineItems, settings, fileName }: Props) {
  return (
    <PDFDownloadLink
      document={<InvoiceDocument invoice={invoice} lineItems={lineItems} settings={settings} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant="secondary" disabled={loading}>
          <Download className="w-3.5 h-3.5" />
          {loading ? 'Preparing…' : 'Download PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
