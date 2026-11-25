import { unzipSync, strFromU8 } from "fflate";
import type { z } from "zod";
import type { extractionSchema } from "../api/documentContracts";
import { validDate, dueFromTerms } from "../domain/supplierInvoices";
export const maxUploadBytes = 5 * 1024 * 1024;
function minor(s: string) {
  const v = s.replace(/,/g, "");
  if (!/^\d{1,14}(?:\.\d{1,2})?$/.test(v)) return null;
  const [a, b = ""] = v.split("."),
    n = BigInt(a) * 100n + BigInt(b.padEnd(2, "0"));
  return n > 0n ? n.toString() : null;
}
export function parseInvoiceText(
  text: string,
): z.infer<typeof extractionSchema> {
  const input = text.split(String.fromCharCode(0)).join("").slice(0, 200000),
    warnings: string[] = [];
  const invoiceNumber =
    input.match(
      /(?:^|\n)\s*(?:invoice\s*(?:number|no\.?|#))\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_-]{1,79})/i,
    )?.[1] ??
    input.match(/\b(INV[-/][A-Z0-9][A-Z0-9/_-]{1,79})\b/i)?.[1] ??
    "";
  function date(raw: string) {
    if (validDate(raw)) return raw;
    const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!m) return "";
    if (+m[1] <= 12 && +m[2] <= 12)
      warnings.push("Numeric date interpreted as day/month/year; confirm it.");
    const value = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return validDate(value) ? value : "";
  }
  const pattern = "(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})",
    invoiceDate = date(
      input.match(
        new RegExp(
          "(?:invoice\\s*date|issue\\s*date|^date)\\s*:?\\s*" + pattern,
          "im",
        ),
      )?.[1] ?? "",
    );
  let dueDate = date(
    input.match(new RegExp("due\\s*date\\s*:?\\s*" + pattern, "i"))?.[1] ?? "",
  );
  const codes = [
    ...new Set(
      [...input.matchAll(/\b(KES|KSHS?|USD)\b/gi)].map((m) =>
        m[1].toUpperCase().startsWith("K") ? "KES" : "USD",
      ),
    ),
  ];
  const currency = codes.length === 1 && codes[0] === "USD" ? "USD" : "KES";
  if (codes.length !== 1)
    warnings.push("Currency is missing or ambiguous; confirm it.");
  let amountMinor: string | null = null;
  for (const label of [
    "grand\\s*total",
    "invoice\\s*total",
    "total\\s*payable",
    "total\\s*amount",
    "amount\\s*due",
    "balance\\s*due",
    "^total",
  ]) {
    const m = input.match(
      new RegExp(
        "(?:" +
          label +
          ")\\s*[:=]?\\s*(?:(?:KES|KSHS?|USD)\\s*)?([0-9][0-9,]*(?:\\.[0-9]{1,2})?)(?![0-9.])",
        "im",
      ),
    );
    if (m) {
      amountMinor = minor(m[1]);
      if (amountMinor) break;
    }
  }
  const net = input.match(
    /(?:\bnet\s+|payment\s*terms\s*:?\s*)(\d{1,3})\s*(?:days?\b|(?=\s*(?:\n|$)))/i,
  );
  let termsDays: number | null =
    net && +net[1] <= 180
      ? +net[1]
      : /due\s*(?:immediately|on\s*receipt)|payable\s*immediately/i.test(input)
        ? 0
        : null;
  if (invoiceDate && dueDate) {
    const n = (Date.parse(dueDate) - Date.parse(invoiceDate)) / 86400000;
    if (n >= 0 && n <= 180) {
      if (termsDays !== null && n !== termsDays)
        warnings.push(
          "Due date conflicts with payment terms; resolve before approval.",
        );
      else termsDays = n;
    } else warnings.push("Due date is outside the 0–180 day term range.");
  }
  if (!dueDate && invoiceDate && termsDays !== null)
    dueDate = dueFromTerms(invoiceDate, termsDays);
  if (!invoiceNumber) warnings.push("Invoice number needs review.");
  if (!invoiceDate) warnings.push("Invoice date needs review.");
  if (!amountMinor) warnings.push("Invoice total needs review.");
  if (termsDays === null) warnings.push("Payment terms need review.");
  if (input.trim().length < 25)
    warnings.push(
      "No usable text layer; scanned documents need OCR or manual entry.",
    );
  return {
    invoiceNumber,
    invoiceDate,
    currency,
    amountMinor,
    termsDays,
    dueDate,
    confidence:
      warnings.length === 0
        ? "High"
        : invoiceNumber && amountMinor
          ? "Medium"
          : "Low",
    warnings,
    excerpt: input.slice(0, 12000),
  };
}
function xml(s: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(s))
    throw Error("Unsupported XML declarations");
  const doc = new DOMParser().parseFromString(s, "application/xml");
  if (doc.getElementsByTagName("parsererror").length)
    throw Error("Invalid Office XML");
  return doc;
}
const nodes = (d: Document | Element, n: string) =>
  Array.from(d.getElementsByTagNameNS("*", n));
function csv(s: string) {
  let quoted = false,
    value = "";
  const rows: string[][] = [],
    row: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      if (quoted && s[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && [",", ";", "\t", "\n"].includes(c)) {
      row.push(value);
      value = "";
      if (c === "\n") {
        rows.push(row.splice(0));
      }
    } else value += c;
  }
  row.push(value);
  rows.push(row);
  return rows
    .slice(0, 10000)
    .map((r) =>
      r
        .map((v) => (/^[=+@]/.test(v.trim()) ? "[Formula omitted]" : v))
        .join("\t"),
    )
    .join("\n");
}
export async function extractInvoiceFile(name: string, data: Uint8Array) {
  if (!data.length || data.length > maxUploadBytes)
    throw Error("Choose a non-empty file up to 5 MB.");
  const ext = name.toLowerCase().split(".").pop(),
    warnings: string[] = [];
  let text = "";
  if (ext === "pdf") {
    if (strFromU8(data.slice(0, 5)) !== "%PDF-") throw Error("Invalid PDF");
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url,
      ).href;
      const pdf = await pdfjs.getDocument({
        data: data.slice(),
        isEvalSupported: false,
        stopAtErrors: true,
        useSystemFonts: true,
      }).promise;
      try {
        if (pdf.numPages > 50) throw Error("PDFs are limited to 50 pages");
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i),
            c = await page.getTextContent();
          let y: number | null = null;
          for (const v of c.items) {
            if (!("str" in v)) continue;
            text +=
              (y !== null && Math.abs(v.transform[5] - y) > 3 ? "\n" : " ") +
              v.str;
            y = v.transform[5];
          }
          text += "\n";
          page.cleanup();
          if (text.length > 200000) break;
        }
      } finally {
        await pdf.destroy();
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("50 pages")) throw e;
      warnings.push(
        "PDF extraction unavailable. Enter the details manually and review the original.",
      );
    }
  } else if (ext === "docx" || ext === "xlsx") {
    if (data[0] !== 80 || data[1] !== 75)
      throw Error("Invalid Office document");
    let count = 0,
      total = 0;
    const files = unzipSync(data, {
      filter: (f) => {
        if (++count > 300) throw Error("Office archive entry limit");
        const include =
          ext === "docx"
            ? f.name === "word/document.xml"
            : /^xl\/(sharedStrings|styles|workbook)\.xml$|^xl\/worksheets\/sheet\d+\.xml$/.test(
                f.name,
              );
        if (include) {
          total += f.originalSize;
          if (f.originalSize > maxUploadBytes || total > 20 * 1024 * 1024)
            throw Error("Expanded file limit");
        }
        return include;
      },
    });
    if (ext === "docx") {
      if (!files["word/document.xml"]) throw Error("Word content missing");
      text = nodes(xml(strFromU8(files["word/document.xml"])), "p")
        .map((p) =>
          nodes(p, "t")
            .map((n) => n.textContent ?? "")
            .join(" "),
        )
        .join("\n");
    } else {
      const shared = files["xl/sharedStrings.xml"]
          ? nodes(xml(strFromU8(files["xl/sharedStrings.xml"])), "si").map(
              (n) =>
                nodes(n, "t")
                  .map((t) => t.textContent ?? "")
                  .join(""),
            )
          : [],
        styles = files["xl/styles.xml"]
          ? xml(strFromU8(files["xl/styles.xml"]))
          : null,
        formats = styles ? nodes(styles, "numFmt") : [],
        dates = styles
          ? nodes(styles, "cellXfs")
              .flatMap((n) => Array.from(n.children))
              .map((n) => {
                const id = Number(n.getAttribute("numFmtId"));
                return (
                  (id >= 14 && id <= 22) ||
                  formats.some(
                    (f) =>
                      Number(f.getAttribute("numFmtId")) === id &&
                      /[dmy]/i.test(
                        (f.getAttribute("formatCode") ?? "").replace(
                          /"[^"]*"/g,
                          "",
                        ),
                      ),
                  )
                );
              })
          : [],
        epoch1904 =
          files["xl/workbook.xml"] &&
          nodes(
            xml(strFromU8(files["xl/workbook.xml"])),
            "workbookPr",
          )[0]?.getAttribute("date1904") === "1";
      const sheets = Object.keys(files)
        .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
        .sort();
      if (!sheets.length) throw Error("Excel content missing");
      for (const key of sheets.slice(0, 10))
        text +=
          nodes(xml(strFromU8(files[key])), "row")
            .slice(0, 10000)
            .map((r) =>
              nodes(r, "c")
                .map((c) => {
                  if (nodes(c, "f").length) {
                    warnings.push(
                      "Spreadsheet formulas were not evaluated; verify totals manually.",
                    );
                    return "[Formula omitted]";
                  }
                  const v = nodes(c, "v")[0]?.textContent ?? "";
                  if (c.getAttribute("t") === "s") return shared[+v] ?? "";
                  if (c.getAttribute("t") === "inlineStr")
                    return nodes(c, "t")
                      .map((t) => t.textContent ?? "")
                      .join("");
                  if (
                    dates[Number(c.getAttribute("s"))] &&
                    /^\d{1,6}(?:\.\d+)?$/.test(v)
                  )
                    return new Date(
                      (epoch1904
                        ? Date.UTC(1904, 0, 1)
                        : Date.UTC(1899, 11, 30)) +
                        Math.floor(+v) * 86400000,
                    )
                      .toISOString()
                      .slice(0, 10);
                  return v;
                })
                .join("\t"),
            )
            .join("\n") + "\n";
    }
  } else if (ext === "csv") text = csv(new TextDecoder().decode(data));
  else
    throw Error(
      "Supported formats: PDF, DOCX, XLSX, CSV. Legacy and macro formats are not supported.",
    );
  const parsed = parseInvoiceText(text);
  parsed.warnings = [...new Set([...warnings, ...parsed.warnings])];
  if (warnings.length) parsed.confidence = "Low";
  return parsed;
}
