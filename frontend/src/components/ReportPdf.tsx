import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { Patient, ScreeningSession } from '../data/mockData';
import { ASSESSMENT_SUMMARY, FACTORS, NOT_MEASURED, RECOMMENDATION, RECOMMENDATION_DETAIL } from '../data/reportContent';

/*
  The PDF is a document, not a screenshot of the app: white ground, black text,
  hairline rules. Uses the built-in Helvetica/Courier families so nothing has to
  be fetched at generation time.
*/
const INK = '#111111';
const INK_2 = '#555555';
const INK_3 = '#888888';
const LINE = '#dddddd';
const MODERATE = '#8a6a1f';
const LOW = '#3f6b4c';

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 52, fontSize: 9.5, color: INK, fontFamily: 'Helvetica' },
  rule: { borderTopWidth: 1.5, borderTopColor: INK, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  kicker: { fontSize: 7, letterSpacing: 1.1, color: INK_3, marginTop: 4, fontFamily: 'Courier' },
  meta: { fontSize: 8.5, color: INK_2, textAlign: 'right', fontFamily: 'Courier' },

  section: { marginBottom: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 7, letterSpacing: 1.1, color: INK_3, textTransform: 'uppercase', fontFamily: 'Courier' },
  sectionRule: { flex: 1, height: 1, backgroundColor: LINE, marginLeft: 8 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE },
  rowLabel: { color: INK_2 },
  rowValue: { textAlign: 'right' },

  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  score: { fontSize: 34, fontFamily: 'Courier-Bold', color: MODERATE, marginRight: 12 },
  scoreCaption: { fontSize: 8.5, color: INK_2, marginBottom: 5 },
  body: { fontSize: 9.5, lineHeight: 1.6, color: INK_2 },

  cols: { flexDirection: 'row', gap: 28 },
  col: { flex: 1 },

  acuityRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE },
  acuityCell: { flex: 1, paddingVertical: 12 },
  acuityDivider: { width: 1, backgroundColor: LINE },
  acuityValue: { fontSize: 20, fontFamily: 'Courier-Bold', marginTop: 4 },

  notMeasured: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  notMeasuredLabel: { fontSize: 9.5 },
  notMeasuredDetail: { fontSize: 8.5, color: INK_3, marginTop: 2 },

  recommendation: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.4 },

  footer: { position: 'absolute', bottom: 34, left: 52, right: 52, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
  footerText: { fontSize: 7, lineHeight: 1.6, color: INK_3 },
  pageNo: { position: 'absolute', bottom: 34, right: 52, fontSize: 7, color: INK_3, fontFamily: 'Courier' },
});

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionLabel}>{label}</Text>
        <View style={s.sectionRule} />
      </View>
      {children}
    </View>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, tone ? { color: tone } : {}]}>{value}</Text>
    </View>
  );
}

interface ReportData {
  patient: Patient;
  session: ScreeningSession;
  score: number;
  summary?: string;
  factors?: { label: string; effect: 'Raises' | 'Lowers' }[];
  notMeasured?: [string, string][];
  recommendation?: string;
  recommendationDetail?: string;
}

export function ReportDocument({
  patient,
  session,
  score,
  summary = ASSESSMENT_SUMMARY,
  factors = FACTORS,
  notMeasured = NOT_MEASURED,
  recommendation = RECOMMENDATION,
  recommendationDetail = RECOMMENDATION_DETAIL,
}: ReportData) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <Document
      title={`EyeQ screening report — ${patient.name}`}
      author="EyeQ"
      subject="Assisted eye screening report"
    >
      <Page size="A4" style={s.page}>
        <View style={s.rule} />

        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>EyeQ screening report</Text>
            <Text style={s.kicker}>ASSISTED SCREENING — NOT A DIAGNOSIS</Text>
          </View>
          <View>
            <Text style={s.meta}>{dateStr}</Text>
            <Text style={[s.meta, { color: INK_3 }]}>{timeStr}</Text>
          </View>
        </View>

        <Section label="Patient">
          <View style={s.cols}>
            <View style={s.col}>
              <Line label="Name" value={patient.name} />
              <Line
                label="Date of birth"
                value={new Date(`${patient.dob}T00:00:00`).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              />
            </View>
            <View style={s.col}>
              <Line label="Session" value={session.id.toUpperCase()} />
              <Line label="Report version" value="v1.0 demo" />
            </View>
          </View>
        </Section>

        <Section label="Assessment">
          <View style={s.scoreRow}>
            <Text style={s.score}>{score}</Text>
            <View>
              <Text style={{ fontSize: 9, color: MODERATE, fontFamily: 'Helvetica-Bold' }}>
                MEDIUM RISK
              </Text>
              <Text style={s.scoreCaption}>Composite screening score, 0 to 100</Text>
            </View>
          </View>
          <Text style={s.body}>{summary}</Text>
        </Section>

        <Section label="Acuity">
          <View style={s.acuityRow}>
            <View style={s.acuityCell}>
              <Text style={s.sectionLabel}>OD · RIGHT EYE</Text>
              <Text style={s.acuityValue}>{session.vaOD}</Text>
            </View>
            <View style={s.acuityDivider} />
            <View style={[s.acuityCell, { paddingLeft: 16 }]}>
              <Text style={s.sectionLabel}>OS · LEFT EYE</Text>
              <Text style={s.acuityValue}>{session.vaOS}</Text>
            </View>
          </View>
          <Text style={[s.notMeasuredDetail, { marginTop: 6 }]}>
            Measured on a 15" display at approximately 52 cm. Screen-based acuity, not a clinical refraction.
          </Text>
        </Section>

        <Section label="Refractive estimate">
          <View style={s.cols}>
            <View style={s.col}>
              <Line label="SPH, right" value="-0.75 D" />
              <Line label="SPH, left" value="Plano" />
            </View>
            <View style={s.col}>
              <Line label="CYL, right" value="Not determined" tone={INK_3} />
              <Line label="CYL, left" value="Not determined" tone={INK_3} />
            </View>
          </View>
          <Text style={[s.notMeasuredDetail, { marginTop: 6 }]}>
            Sphere is inferred from acuity alone. Cylinder needs dedicated astigmatism testing. Do not
            dispense against these figures.
          </Text>
        </Section>

        <Section label="Contributing factors">
          {factors.map((f) => (
            <Line
              key={f.label}
              label={f.label}
              value={f.effect}
              tone={f.effect === 'Raises' ? MODERATE : LOW}
            />
          ))}
        </Section>

        <Section label="Not measured in this session">
          {notMeasured.map(([label, detail]) => (
            <View key={label} style={s.notMeasured}>
              <Text style={s.notMeasuredLabel}>{label}</Text>
              <Text style={s.notMeasuredDetail}>{detail}</Text>
            </View>
          ))}
          <Text style={[s.body, { marginTop: 8 }]}>
            A screening score built without these is incomplete by construction. It can raise a question; it
            cannot settle one.
          </Text>
        </Section>

        <Section label="Recommendation">
          <Text style={s.recommendation}>{recommendation}</Text>
          <Text style={[s.body, { marginTop: 6 }]}>{recommendationDetail}</Text>
        </Section>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            This report was produced by an assisted screening prototype. It is not a medical diagnosis,
            prescription or clinical recommendation, and every figure in this build is demonstration data. It
            does not replace examination by a qualified ophthalmologist or optometrist. Do not make clinical
            decisions on this document alone. EyeQ demo, {now.getFullYear()}.
          </Text>
        </View>
        <Text
          style={s.pageNo}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

/** Renders the document to a blob and hands it to the browser as a download. */
export async function downloadReportPdf(data: ReportData) {
  const blob = await pdf(<ReportDocument {...data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eyecare-report-${data.session.id}-${data.patient.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has definitely started.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
