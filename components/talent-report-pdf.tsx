import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'

const ORANGE = '#e8700a'
const BORDER = '#cccccc'

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingLeft: 40, paddingRight: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#111111' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 13, textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  table: { borderWidth: 0.75, borderColor: BORDER, borderStyle: 'solid' },
  headerRow: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  dataRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  dataRowLast: { flexDirection: 'row' },
  colName: { width: '27%', paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 8, borderRightWidth: 0.5, borderRightColor: BORDER, borderRightStyle: 'solid' },
  colLink: { width: '53%', paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 8, borderRightWidth: 0.5, borderRightColor: BORDER, borderRightStyle: 'solid' },
  colType: { width: '20%', paddingTop: 7, paddingBottom: 7, paddingLeft: 10, paddingRight: 8 },
  headerLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  headerLabelOrange: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: ORANGE },
  link: { color: '#1155CC', textDecoration: 'underline' },
  pageNumber: { position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#888888' },
})

const ROWS_PAGE_ONE = 24
const ROWS_PER_PAGE = 28

export type ReportRow = { name: string; link: string; type: 'Placement' | 'Organic' }

function TableHeader() {
  return (
    <View style={s.headerRow}>
      <View style={s.colName}><Text style={s.headerLabel}>Name</Text></View>
      <View style={s.colLink}><Text style={s.headerLabel}>Link</Text></View>
      <View style={s.colType}><Text style={s.headerLabelOrange}>Placement / Organic</Text></View>
    </View>
  )
}

export function TalentReportDocument({ title, rows }: { title: string; rows: ReportRow[] }) {
  const firstChunk = rows.slice(0, ROWS_PAGE_ONE)
  const rest = rows.slice(ROWS_PAGE_ONE)
  const chunks: ReportRow[][] = [firstChunk]
  for (let i = 0; i < rest.length; i += ROWS_PER_PAGE) {
    chunks.push(rest.slice(i, i + ROWS_PER_PAGE))
  }

  return (
    <Document>
      {chunks.map((chunk, pageIdx) => (
        <Page key={pageIdx} size="A4" style={s.page}>
          {pageIdx === 0 && <Text style={s.title}>{title.toUpperCase()}</Text>}
          <View style={s.table}>
            <TableHeader />
            {chunk.map((row, rowIdx) => (
              <View key={rowIdx} style={rowIdx === chunk.length - 1 ? s.dataRowLast : s.dataRow}>
                <View style={s.colName}><Text>{row.name}</Text></View>
                <View style={s.colLink}>
                  {row.link
                    ? <Link src={row.link}><Text style={s.link}>{row.link}</Text></Link>
                    : <Text>—</Text>}
                </View>
                <View style={s.colType}><Text>{row.type}</Text></View>
              </View>
            ))}
          </View>
          <Text style={s.pageNumber} render={({ pageNumber }) => String(pageNumber)} fixed />
        </Page>
      ))}
    </Document>
  )
}
