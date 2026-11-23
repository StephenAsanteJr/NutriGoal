import "server-only";
// Reads values from a text-based medical checkup PDF using plain pattern
// matching. Nothing is sent to an outside service. Every value found is shown
// to the member to confirm or correct before it becomes part of their build.

export type ExtractedFields = {
  age?: number;
  sex?: "female" | "male";
  height_cm?: number;
  weight_kg?: number;
  body_fat_pct?: number;
  systolic?: number;
  diastolic?: number;
  a1c?: number;
  fasting_glucose?: number;
  total_cholesterol?: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  vitamin_d?: number;
};

export type Extraction = {
  fields: ExtractedFields;
  found: { field: keyof ExtractedFields; label: string; display: string; raw: string }[];
  provider?: string;
  reportDate?: string;
  note: string;
};

const NUM = String.raw`(\d{1,4}(?:\.\d{1,2})?)`;

type Rule = {
  field: keyof ExtractedFields;
  label: string;
  re: RegExp;
  parse: (m: RegExpMatchArray) => number | undefined;
  display: (v: number) => string;
  range: [number, number];
};

const rules: Rule[] = [
  { field: "age", label: "Age", re: new RegExp(String.raw`\bage\s*[:\-]?\s*(\d{2,3})\b`, "i"), parse: (m) => +m[1], display: (v) => `${v}`, range: [13, 110] },
  {
    field: "weight_kg", label: "Weight",
    re: new RegExp(String.raw`\bweight\s*[:\-]?\s*${NUM}\s*(lbs?|pounds|kg|kilograms)`, "i"),
    parse: (m) => (/kg|kilo/i.test(m[2]) ? +m[1] : +m[1] * 0.45359237),
    display: (v) => `${Math.round(v / 0.45359237)} lb (${v.toFixed(1)} kg)`, range: [30, 350],
  },
  { field: "body_fat_pct", label: "Body fat", re: new RegExp(String.raw`\bbody\s*fat(?:\s*(?:percentage|%))?\s*[:\-]?\s*${NUM}\s*%`, "i"), parse: (m) => +m[1], display: (v) => `${v}%`, range: [3, 70] },
  { field: "a1c", label: "Hemoglobin A1C", re: new RegExp(String.raw`(?:hemoglobin\s*a1c|hb\s*a1c|hba1c|\ba1c)\s*[:\-]?\s*${NUM}\s*%?`, "i"), parse: (m) => +m[1], display: (v) => `${v}%`, range: [3, 20] },
  { field: "fasting_glucose", label: "Fasting glucose", re: new RegExp(String.raw`(?:fasting\s*(?:plasma\s*)?glucose|glucose,?\s*fasting)\s*[:\-]?\s*${NUM}`, "i"), parse: (m) => +m[1], display: (v) => `${v} mg/dL`, range: [40, 600] },
  { field: "total_cholesterol", label: "Total cholesterol", re: new RegExp(String.raw`(?:total\s*cholesterol|cholesterol,?\s*total)\s*[:\-]?\s*${NUM}`, "i"), parse: (m) => +m[1], display: (v) => `${v} mg/dL`, range: [50, 600] },
  { field: "ldl", label: "LDL cholesterol", re: new RegExp(String.raw`\bLDL(?:[\s-]*C)?(?:\s*cholesterol)?(?:\s*\(calc\))?\s*[:\-]?\s*${NUM}`, "i"), parse: (m) => +m[1], display: (v) => `${v} mg/dL`, range: [10, 400] },
  { field: "hdl", label: "HDL cholesterol", re: new RegExp(String.raw`\bHDL(?:[\s-]*C)?(?:\s*cholesterol)?\s*[:\-]?\s*${NUM}`, "i"), parse: (m) => +m[1], display: (v) => `${v} mg/dL`, range: [5, 200] },
  { field: "triglycerides", label: "Triglycerides", re: new RegExp(String.raw`\btriglycerides?\s*[:\-]?\s*${NUM}`, "i"), parse: (m) => +m[1], display: (v) => `${v} mg/dL`, range: [10, 3000] },
  { field: "vitamin_d", label: "Vitamin D (25-OH)", re: new RegExp(String.raw`vitamin\s*d(?:,?\s*25[\s-]*(?:oh|hydroxy))?\s*[:\-]?\s*${NUM}`, "i"), parse: (m) => +m[1], display: (v) => `${v} ng/mL`, range: [2, 200] },
];

function cleanup(text: string) {
  return text.replace(/ /g, " ").replace(/[ \t]+/g, " ");
}

export function extractFromText(raw: string): Extraction {
  const text = cleanup(raw);
  const fields: ExtractedFields = {};
  const found: Extraction["found"] = [];

  for (const r of rules) {
    const m = text.match(r.re);
    if (!m) continue;
    const v = r.parse(m);
    if (v == null || Number.isNaN(v) || v < r.range[0] || v > r.range[1]) continue;
    const rounded = Math.round(v * 10) / 10;
    (fields as Record<string, number>)[r.field] = rounded;
    found.push({ field: r.field, label: r.label, display: r.display(rounded), raw: m[0].trim() });
  }

  // Height: 5 ft 10 in | 5'10" | 70 in | 178 cm
  const hFtIn = text.match(/\bheight\s*[:\-]?\s*(\d)\s*(?:ft|feet|'|’)\s*(\d{1,2})\s*(?:in|inches|"|”)?/i);
  const hCm = text.match(/\bheight\s*[:\-]?\s*(\d{3}(?:\.\d)?)\s*cm/i);
  const hIn = text.match(/\bheight\s*[:\-]?\s*(\d{2}(?:\.\d)?)\s*(?:in|inches)\b/i);
  let heightCm: number | undefined;
  let hRaw = "";
  if (hFtIn) {
    heightCm = (+hFtIn[1] * 12 + +hFtIn[2]) * 2.54;
    hRaw = hFtIn[0];
  } else if (hCm) {
    heightCm = +hCm[1];
    hRaw = hCm[0];
  } else if (hIn) {
    heightCm = +hIn[1] * 2.54;
    hRaw = hIn[0];
  }
  if (heightCm && heightCm > 120 && heightCm < 230) {
    fields.height_cm = Math.round(heightCm * 10) / 10;
    const totalIn = Math.round(heightCm / 2.54);
    found.push({ field: "height_cm", label: "Height", display: `${Math.floor(totalIn / 12)}′${totalIn % 12}″ (${Math.round(heightCm)} cm)`, raw: hRaw.trim() });
  }

  const bp = text.match(/(?:blood\s*pressure|\bBP)\s*[:\-]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i);
  if (bp) {
    const s = +bp[1];
    const d = +bp[2];
    if (s >= 70 && s <= 250 && d >= 40 && d <= 150) {
      fields.systolic = s;
      fields.diastolic = d;
      found.push({ field: "systolic", label: "Blood pressure", display: `${s}/${d} mmHg`, raw: bp[0].trim() });
    }
  }

  const sex = text.match(/\b(?:sex|gender)\s*[:\-]?\s*(female|male|f|m)\b/i);
  if (sex) {
    fields.sex = /^f/i.test(sex[1]) ? "female" : "male";
    found.push({ field: "sex", label: "Sex", display: fields.sex === "female" ? "Female" : "Male", raw: sex[0].trim() });
  }

  const provider = text.match(/(?:provider|physician|clinic|facility|ordering\s*(?:physician|provider))\s*[:\-]\s*([^\n]{3,60})/i)?.[1]?.trim();
  const reportDate = text.match(/(?:date\s*of\s*(?:service|visit|exam|report)|collected|report\s*date|visit\s*date)\s*[:\-]?\s*([0-9]{1,4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{1,4})/i)?.[1];

  const note = found.length
    ? `Found ${found.length} value${found.length === 1 ? "" : "s"} in your report. Please check each one.`
    : "We couldn't read values from this file automatically. Your clinician will still see the report; please enter your details below.";

  return { fields, found, provider, reportDate, note };
}

export async function extractFromPdf(buffer: Buffer): Promise<Extraction> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return extractFromText(text);
}
