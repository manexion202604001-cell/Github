/*
 * 修了証 PDF（@react-pdf/renderer）。GAME-04
 * PDF 内では Tailwind が使えないため、パレット（REQUIREMENTS.md §9.2）の HEX をここでのみ直書きする。
 *   paper-100 #F3F0E9（背景）/ ink-700 #292723（文字）/ ink-900 #111110 / stone-500 #665F54 / stone-400 #938A7C / bronze-500 #B18A68（細線）
 * TODO(decision-#7): 縦横（現在は A4 横）・押印（studio N 印）の有無・英語併記の有無
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { CertificateText } from '@/lib/certificate-layout'

export type CertificateFonts = { serif: string; sans: string }

const PALETTE = {
  paper: '#F3F0E9',
  ink: '#292723',
  inkDeep: '#111110',
  stone: '#665F54',
  stoneLight: '#938A7C',
  bronze: '#B18A68',
} as const

function makeStyles(fonts: CertificateFonts) {
  return StyleSheet.create({
    page: { backgroundColor: PALETTE.paper, padding: 36, fontFamily: fonts.serif, color: PALETTE.ink },
    frame: { flex: 1, borderWidth: 0.75, borderColor: PALETTE.bronze, padding: 48, justifyContent: 'space-between' },
    innerLine: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 0.5, borderColor: PALETTE.bronze },
    eyebrow: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 3, color: PALETTE.stoneLight, textAlign: 'center' },
    title: { fontSize: 30, letterSpacing: 6, color: PALETTE.inkDeep, textAlign: 'center', marginTop: 10 },
    rule: { width: 48, height: 0.75, backgroundColor: PALETTE.bronze, alignSelf: 'center', marginVertical: 20 },
    recipient: { fontSize: 24, letterSpacing: 2, color: PALETTE.inkDeep, textAlign: 'center' },
    statement: { fontSize: 11, lineHeight: 1.9, letterSpacing: 0.5, color: PALETTE.ink, textAlign: 'center', marginTop: 18, marginHorizontal: 60 },
    course: { fontSize: 18, letterSpacing: 1.5, color: PALETTE.inkDeep, textAlign: 'center', marginTop: 18 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    meta: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.8, color: PALETTE.stone, lineHeight: 1.7 },
    issuer: { fontSize: 16, letterSpacing: 5, color: PALETTE.inkDeep, textAlign: 'right' },
    issuerCaption: { fontFamily: fonts.sans, fontSize: 8, letterSpacing: 2, color: PALETTE.stoneLight, textAlign: 'right', marginTop: 4 },
  })
}

export function CertificatePdf({ text, fonts }: { text: CertificateText; fonts: CertificateFonts }) {
  const s = makeStyles(fonts)
  return (
    <Document title={`${text.title} - ${text.course}`} author="studio N" language="ja">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View style={s.innerLine} fixed />
          <View>
            <Text style={s.eyebrow}>{text.eyebrow}</Text>
            <Text style={s.title}>{text.title}</Text>
          </View>
          <View>
            <Text style={s.recipient}>{text.recipient}</Text>
            <View style={s.rule} />
            <Text style={s.statement}>{text.statement}</Text>
            <Text style={s.course}>{text.course}</Text>
          </View>
          <View style={s.footer}>
            <View>
              <Text style={s.meta}>{text.dateLine}</Text>
              <Text style={s.meta}>{text.codeLine}</Text>
              <Text style={s.meta}>{text.verifyLine}</Text>
            </View>
            <View>
              <Text style={s.issuer}>{text.issuer}</Text>
              <Text style={s.issuerCaption}>LEARNING PLATFORM</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
