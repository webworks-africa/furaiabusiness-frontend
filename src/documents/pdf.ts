import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { regularFont, boldFont } from "./fonts";
import type { FinancialDocument } from "../api/documentContracts";
import { money } from "../domain/money";
import { documentQr } from "./qr";
export async function renderDocumentPdf(m: FinancialDocument) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const decode = (s: string) =>
      Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
    normal = await pdf.embedFont(decode(regularFont), { subset: true }),
    bold = await pdf.embedFont(decode(boldFont), { subset: true });
  const colors = {
      forest: rgb(0.07, 0.24, 0.19),
      navy: rgb(0.09, 0.21, 0.35),
      charcoal: rgb(0.19, 0.22, 0.23),
    },
    accent = colors[m.accent],
    ink = rgb(0.1, 0.15, 0.13),
    muted = rgb(0.37, 0.43, 0.4),
    line = rgb(0.83, 0.88, 0.85),
    wash = rgb(0.95, 0.97, 0.96);
  const W = 595.28,
    H = 841.89,
    L = 42,
    R = W - 42;
  let page!: PDFPage,
    y = 0;
  const safe = (v: string, f: PDFFont) =>
    [...v.replace(/[\n\r\t]/g, " ")]
      .map((c) => (f.getCharacterSet().includes(c.codePointAt(0)!) ? c : "?"))
      .join("");
  function text(
    v: string,
    x: number,
    top: number,
    size = 9,
    heavy = false,
    color = ink,
  ) {
    page.drawText(safe(v, heavy ? bold : normal), {
      x,
      y: H - top - size,
      size,
      font: heavy ? bold : normal,
      color,
    });
  }
  function right(
    v: string,
    x: number,
    top: number,
    size = 9,
    heavy = false,
    width = 200,
  ) {
    const f = heavy ? bold : normal;
    size = Math.min(
      size,
      width / Math.max(1, f.widthOfTextAtSize(safe(v, f), 1)),
    );
    text(v, x - f.widthOfTextAtSize(safe(v, f), size), top, size, heavy);
  }
  function wrap(v: string, width: number, size = 9, heavy = false) {
    const f = heavy ? bold : normal,
      out: string[] = [];
    for (const para of v.split(/\r?\n/)) {
      let row = "";
      for (const word of para.split(/\s+/)) {
        if (!word) continue;
        const next = (row ? row + " " : "") + word;
        if (f.widthOfTextAtSize(safe(next, f), size) <= width) row = next;
        else {
          if (row) out.push(row);
          row = "";
          for (const c of word) {
            if (f.widthOfTextAtSize(safe(row + c, f), size) > width) {
              out.push(row);
              row = "";
            }
            row += c;
          }
        }
      }
      out.push(row);
    }
    return out;
  }
  function rule(top: number) {
    page.drawLine({
      start: { x: L, y: H - top },
      end: { x: R, y: H - top },
      thickness: 0.6,
      color: line,
    });
  }
  function newPage(continued = false) {
    page = pdf.addPage([W, H]);
    if (m.template === "modern") {
      page.drawRectangle({ x: 0, y: 0, width: 11, height: H, color: accent });
      page.drawRectangle({
        x: 0,
        y: H - 13,
        width: W,
        height: 13,
        color: accent,
      });
    }
    if (m.template === "classic")
      page.drawRectangle({
        x: L,
        y: H - 27,
        width: R - L,
        height: 3,
        color: accent,
      });
    y = 45;
    if (continued) {
      const name = wrap(m.issuer.name, 270, 10, true)[0];
      text(name, L, 42, 10, true, accent);
      right(`${m.kind.toUpperCase()} ${m.id}`, R, 42, 8, false, 230);
      rule(65);
      y = 82;
    }
  }
  function ensure(h: number) {
    if (y + h > H - 65) newPage(true);
  }
  function header() {
    ensure(30);
    if (m.template !== "minimal")
      page.drawRectangle({
        x: L,
        y: H - y - 28,
        width: R - L,
        height: 28,
        color: accent,
      });
    const c = m.template === "minimal" ? accent : rgb(1, 1, 1);
    text("DESCRIPTION", L + 10, y + 8, 8, true, c);
    text("QTY", 332, y + 8, 8, true, c);
    text("UNIT PRICE", 373, y + 8, 8, true, c);
    text("AMOUNT", 476, y + 8, 8, true, c);
    y += 29;
  }
  newPage();
  let logoH = 0;
  if (/^data:image\/(png|jpeg);base64,/.test(m.logo)) {
    const image = m.logo.startsWith("data:image/png")
        ? await pdf.embedPng(m.logo)
        : await pdf.embedJpg(m.logo),
      s = image.scaleToFit(115, 48);
    page.drawImage(image, {
      x: L,
      y: H - y - s.height,
      width: s.width,
      height: s.height,
    });
    logoH = s.height + 12;
  }
  const names = wrap(m.issuer.name, 255, 15, true);
  names.forEach((v, i) => text(v, L, y + logoH + i * 19, 15, true, accent));
  const info = [m.issuer.address, m.issuer.email, m.issuer.phone]
    .filter(Boolean)
    .flatMap((v) => wrap(v, 255, 8));
  const infoTop = y + logoH + names.length * 19 + 7;
  info.forEach((v, i) => text(v, L, infoTop + i * 13, 8, false, muted));
  right(
    m.kind === "lpo" ? "PURCHASE ORDER" : m.kind.toUpperCase(),
    R,
    y,
    23,
    true,
    255,
  );
  right(m.id, R, y + 35, 10, true, 245);
  right(m.status.toUpperCase(), R, y + 54, 8, false, 245);
  right(`Revision ${m.revision}`, R, y + 69, 8);
  y = Math.max(infoTop + info.length * 13 + 25, 160);
  rule(y);
  y += 22;
  text(
    m.kind === "lpo"
      ? "SUPPLIER"
      : m.kind === "receipt"
        ? "RECEIVED FROM"
        : "BILL TO",
    L,
    y,
    8,
    true,
    muted,
  );
  text("DOCUMENT DETAILS", 357, y, 8, true, muted);
  y += 18;
  const recipient = [m.recipient.name, m.recipient.address, m.recipient.email]
    .filter(Boolean)
    .flatMap((v) => wrap(v, 270, 9));
  recipient.forEach((v, i) => text(v, L, y + i * 15, 9, i === 0));
  text(`Date: ${m.date}`, 357, y, 9);
  text(
    `${m.kind === "quotation" ? "Valid until" : m.kind === "lpo" ? "Delivery date" : "Due date"}: ${m.due || "N/A"}`,
    357,
    y + 18,
    9,
  );
  text(`Currency: ${m.currency}`, 357, y + 36, 9);
  y += Math.max(54, recipient.length * 15) + 25;
  if (m.kind === "receipt") {
    ensure(110);
    page.drawRectangle({
      x: L,
      y: H - y - 90,
      width: R - L,
      height: 90,
      color: wash,
    });
    text("CONFIRMED PAYMENT RECEIVED", L + 18, y + 16, 9, true, muted);
    const value = money(m.totalMinor, m.currency);
    text(
      value,
      L + 18,
      y + 36,
      Math.min(28, (R - L - 36) / bold.widthOfTextAtSize(value, 1)),
      true,
      accent,
    );
    y += 112;
    for (const [k, v] of [
      ["Invoice", m.relatedReference],
      ["Payment reference", m.paymentReference],
      ["Balance after allocation", money(m.balanceMinor, m.currency)],
    ]) {
      const lines = wrap(v, 300, 10);
      ensure(lines.length * 15 + 14);
      text(k, L, y, 9, false, muted);
      lines.forEach((t, i) => text(t, 225, y + i * 15, 10, true));
      y += Math.max(30, lines.length * 15 + 12);
    }
    rule(y);
    y += 24;
  } else {
    header();
    for (let i = 0; i < m.lines.length; i++) {
      const r = m.lines[i],
        desc = [
          ...wrap(r.description, 265),
          `Tax ${r.tax}% | Discount ${r.discount}%`,
        ];
      let offset = 0;
      while (offset < desc.length) {
        let count = Math.floor((H - 85 - y - 20) / 14);
        if (count < 1) {
          newPage(true);
          header();
          count = Math.floor((H - 85 - y - 20) / 14);
        }
        const take = Math.min(desc.length - offset, count),
          h = take * 14 + 20;
        if (i % 2 === 0 && m.template !== "minimal")
          page.drawRectangle({
            x: L,
            y: H - y - h,
            width: R - L,
            height: h,
            color: wash,
          });
        desc
          .slice(offset, offset + take)
          .forEach((v, j) => text(v, L + 10, y + 9 + j * 14));
        if (!offset) {
          right(r.quantity, 355, y + 9, 9, false, 32);
          right(money(r.rateMinor, m.currency), 448, y + 9, 9, false, 83);
          right(money(r.totalMinor, m.currency), R - 10, y + 9, 9, true, 85);
        }
        y += h;
        offset += take;
        if (offset < desc.length) {
          newPage(true);
          header();
        }
      }
    }
    y += 20;
    ensure(130);
    for (const [k, v] of [
      ["Subtotal", m.subtotalMinor],
      ["Discount", m.discountMinor],
      ["Tax", m.taxMinor],
    ]) {
      text(k, 280, y, 9, false, muted);
      right(money(v, m.currency), R, y, 9, false, 180);
      y += 22;
    }
    rule(y);
    y += 14;
    text("GRAND TOTAL", 280, y, 10, true, accent);
    right(money(m.totalMinor, m.currency), R, y, 15, true, 175);
    y += 38;
  }
  for (const [k, v] of [
    ["NOTES", m.notes],
    ["TERMS & PAYMENT", m.terms],
  ]) {
    if (!v) continue;
    ensure(36);
    text(k, L, y, 8, true, muted);
    y += 18;
    for (const t of wrap(v, R - L)) {
      ensure(16);
      text(t, L, y);
      y += 14;
    }
    y += 16;
  }
  if (m.tax.qrPayload) {
    ensure(110);
    const qr = documentQr(m.tax.qrPayload),
      unit = 80 / qr.size;
    page.drawRectangle({
      x: L,
      y: H - y - 80,
      width: 80,
      height: 80,
      color: rgb(1, 1, 1),
    });
    for (const [x, z] of qr.points)
      page.drawRectangle({
        x: L + x * unit,
        y: H - y - (z + 1) * unit,
        width: unit + 0.01,
        height: unit + 0.01,
        color: ink,
      });
    const values = [
      m.tax.label,
      `${m.tax.status} ${m.tax.reference}`,
      "DEMO - NOT A KRA TAX INVOICE",
    ];
    values.forEach((v, i) =>
      wrap(v, 310, 8).forEach((t, j) =>
        text(t, L + 100, y + 5 + i * 25 + j * 11, 8, i === 0, muted),
      ),
    );
    y += 104;
  }
  for (const t of wrap(m.footer || "Thank you for your business.", R - L, 8)) {
    ensure(15);
    text(t, L, y, 8, false, muted);
    y += 13;
  }
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    page = pages[i];
    rule(H - 42);
    text(`${m.id} | ${m.currency}`, L, H - 32, 7, false, muted);
    right(`Page ${i + 1} of ${pages.length}`, R, H - 32, 7);
  }
  pdf.setTitle(`${m.kind.toUpperCase()} ${m.id}`);
  pdf.setAuthor(m.issuer.name);
  pdf.setCreationDate(new Date("2026-10-21T08:00:00Z"));
  pdf.setModificationDate(new Date("2026-10-21T08:00:00Z"));
  return pdf.save();
}
