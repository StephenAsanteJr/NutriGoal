// Generates public/samples/sample-checkup-report.pdf — a fictional checkup
// report used to demo the "upload my medical report" onboarding path.
// Usage: node scripts/make-sample-report.mjs
import fs from "node:fs";
import path from "node:path";

const lines = [
  ["H", 18, "Riverside Family Health"],
  ["N", 10, "Annual Physical Summary  -  SAMPLE REPORT (fictional patient, for demo use only)"],
  ["S", 6, ""],
  ["N", 11, "Patient: Sam Rivera"],
  ["N", 11, "Sex: Male"],
  ["N", 11, "Age: 41"],
  ["N", 11, "Date of service: 10/14/2026"],
  ["N", 11, "Provider: Dr. A. Patel, MD"],
  ["S", 6, ""],
  ["B", 13, "Vitals"],
  ["N", 11, "Height: 5 ft 10 in"],
  ["N", 11, "Weight: 212 lb"],
  ["N", 11, "BMI: 30.4"],
  ["N", 11, "Body fat: 29.5%"],
  ["N", 11, "Blood pressure: 134/86 mmHg"],
  ["S", 6, ""],
  ["B", 13, "Laboratory results"],
  ["N", 11, "Hemoglobin A1c: 5.8 %          (ref < 5.7)"],
  ["N", 11, "Glucose, fasting: 106 mg/dL    (ref 70-99)"],
  ["N", 11, "Total cholesterol: 221 mg/dL   (ref < 200)"],
  ["N", 11, "LDL cholesterol: 146 mg/dL     (ref < 100)"],
  ["N", 11, "HDL cholesterol: 39 mg/dL      (ref > 40)"],
  ["N", 11, "Triglycerides: 190 mg/dL       (ref < 150)"],
  ["N", 11, "Vitamin D, 25-Hydroxy: 22 ng/mL (ref 30-100)"],
  ["S", 6, ""],
  ["B", 13, "Assessment"],
  ["N", 11, "Overweight with elevated A1c and LDL. Recommend nutrition counseling and repeat labs in 3 months."],
];

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
let y = 750;
let content = "";
for (const [style, size, text] of lines) {
  if (style === "S") {
    y -= size;
    continue;
  }
  const font = style === "N" ? "F1" : "F2";
  const color = style === "H" ? "0.02 0.11 0.17 rg" : style === "B" ? "0.13 0.32 1 rg" : "0.1 0.1 0.1 rg";
  content += `BT ${color} /${font} ${size} Tf 56 ${y} Td (${esc(text)}) Tj ET\n`;
  y -= size + 9;
}

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
  "<< /Title (Sample checkup report - fictional) /Producer (NutriGoal) >>",
];

let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = [];
objects.forEach((o, i) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const xref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

const out = path.join(process.cwd(), "public", "samples", "sample-checkup-report.pdf");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(pdf, "latin1"));
console.log("Wrote", out);
