import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'

const BORDER = '#cccccc'
const ROWS_PAGE_ONE = 28
const ROWS_PER_PAGE = 32

export type ListColumn = { header: string; width: string; link?: boolean }

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingLeft: 40, paddingRight: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#111111' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 13, textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  table: { borderWidth: 0.75, borderColor: BORDER, borderStyle: 'solid' },
  headerRow: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  dataRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  dataRowLast: { flexDirection: 'row' },
  headerLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  linkText: { color: '#1155CC', textDecoration: 'underline' },
  pageNumber: { position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#888888' },
})

const PAD = { paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 8 }
const BORDER_RIGHT = { borderRightWidth: 0.5, borderRightColor: BORDER, borderRightStyle: 'solid' as const }

export function ListReportDocument({ title, columns, rows }: { title: string; columns: ListColumn[]; rows: string[][] }) {
  const chunks: string[][][] = [rows.slice(0, ROWS_PAGE_ONE)]
  const rest = rows.slice(ROWS_PAGE_ONE)
  for (let i = 0; i < rest.length; i += ROWS_PER_PAGE) chunks.push(rest.slice(i, i + ROWS_PER_PAGE))

  function cell(colIdx: number) {
    return { width: columns[colIdx].width, ...PAD, ...(colIdx < columns.length - 1 ? BORDER_RIGHT : {}) }
  }

  return (
    <Document>
      {chunks.map((chunk, pageIdx) => (
        <Page key={pageIdx} size="A4" style={s.page}>
          {pageIdx === 0 && <Text style={s.title}>{title.toUpperCase()}</Text>}
          <View style={s.table}>
            <View style={s.headerRow}>
              {columns.map((col, i) => (
                <View key={i} style={cell(i)}><Text style={s.headerLabel}>{col.header}</Text></View>
              ))}
            </View>
            {chunk.map((row, rowIdx) => (
              <View key={rowIdx} style={rowIdx === chunk.length - 1 ? s.dataRowLast : s.dataRow}>
                {columns.map((col, colIdx) => (
                  <View key={colIdx} style={cell(colIdx)}>
                    {col.link && row[colIdx]
                      ? <Link src={row[colIdx]}><Text style={s.linkText}>{row[colIdx]}</Text></Link>
                      : <Text>{row[colIdx] || '—'}</Text>}
                  </View>
                ))}
              </View>
            ))}
          </View>
          <Text style={s.pageNumber} render={({ pageNumber }) => String(pageNumber)} fixed />
        </Page>
      ))}
    </Document>
  )
}
