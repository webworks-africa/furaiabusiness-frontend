import { it, expect } from "vitest";
import { zipSync, strToU8 as encode } from "fflate";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { parseInvoiceText, extractInvoiceFile } from "./extract";
import { dueFromTerms } from "../domain/supplierInvoices";
import { renderDocumentPdf } from "./pdf";
import type { FinancialDocument } from "../api/documentContracts";
const u = (s: string) => new Uint8Array(encode(s));
const raw =
  "Invoice No: SUP-2026-001\nInvoice Date: 2026-10-01\nGrand Total: KES 12,345.67\nPayment Terms: 30 days";
it("extracts exact amounts and calendar due dates", () => {
  const p = parseInvoiceText(raw);
  expect(p.amountMinor).toBe("1234567");
  expect(p.termsDays).toBe(30);
  expect(p.dueDate).toBe("2026-10-31");
  expect(p.invoiceNumber).toBe("SUP-2026-001");
});
it("does not turn negative totals into positive bills", () =>
  expect(parseInvoiceText("Grand total: -100.00").amountMinor).toBeNull());
it("flags absent and ambiguous fields for review", () => {
  expect(parseInvoiceText("").warnings.join(" ")).toContain("OCR");
  expect(
    parseInvoiceText("Invoice date: 03/04/2026").warnings.join(" "),
  ).toContain("day/month/year");
});
it("handles immediate terms, leap years and invalid dates", () => {
  expect(dueFromTerms("2028-02-01", 30)).toBe("2028-03-02");
  expect(dueFromTerms("2026-10-21", 0)).toBe("2026-10-21");
  expect(() => dueFromTerms("2026-02-30", 30)).toThrow();
  expect(
    parseInvoiceText(raw.replace("Payment Terms: 30 days", "Due immediately"))
      .termsDays,
  ).toBe(0);
});
it("reads DOCX paragraphs", async () => {
  const bytes = zipSync({
    "word/document.xml": u(
      '<w:document xmlns:w="urn:test"><w:body>' +
        raw
          .split("\n")
          .map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`)
          .join("") +
        "</w:body></w:document>",
    ),
  });
  expect((await extractInvoiceFile("supplier.docx", bytes)).amountMinor).toBe(
    "1234567",
  );
});
it("reads XLSX inline cells and never executes formulas", async () => {
  const bytes = zipSync({
    "xl/worksheets/sheet1.xml": u(
      '<worksheet xmlns="urn:test"><sheetData>' +
        raw
          .split("\n")
          .map((t) => `<row><c t="inlineStr"><is><t>${t}</t></is></c></row>`)
          .join("") +
        "<row><c><f>1+1</f><v>2</v></c></row></sheetData></worksheet>",
    ),
  });
  const p = await extractInvoiceFile("supplier.xlsx", bytes);
  expect(p.amountMinor).toBe("1234567");
  expect(p.warnings.join(" ")).toContain("formulas");
});
it("reads quoted CSV and rejects macros, legacy and oversized files", async () => {
  const p = await extractInvoiceFile(
    "supplier.csv",
    u(
      'Invoice No,SUP-100\nInvoice Date,2026-10-01\nGrand Total,"KES 12,345.67"\nPayment Terms,30 days',
    ),
  );
  expect(p.amountMinor).toBe("1234567");
  await expect(extractInvoiceFile("supplier.xlsm", u(raw))).rejects.toThrow(
    "Supported formats",
  );
  await expect(
    extractInvoiceFile("supplier.csv", new Uint8Array(6 * 1024 * 1024)),
  ).rejects.toThrow("5 MB");
});
it("renders five PDF designs and paginates long documents", async () => {
  const base: FinancialDocument = {
    kind: "invoice",
    id: "INV-2026-0142",
    revision: 1,
    status: "Issued",
    date: "2026-10-01",
    due: "2026-10-31",
    currency: "KES",
    issuer: {
      name: "Webworks Africa Ltd",
      address: "Demo Business Centre, Nairobi",
      email: "office@example.test",
      phone: "+254700000000",
    },
    recipient: {
      name: "Acacia Trading Limited",
      email: "accounts@example.test",
      address: "Commerce House, Nairobi",
    },
    template: "classic",
    accent: "forest",
    logo: "",
    footer: "Webworks Africa Ltd - Professional services",
    lines: [
      {
        description: "Business platform implementation and configuration",
        quantity: "1",
        rateMinor: "12500000",
        tax: "16",
        discount: "0",
        totalMinor: "14500000",
      },
      {
        description: "Monthly support and maintenance",
        quantity: "2",
        rateMinor: "2500000",
        tax: "16",
        discount: "0",
        totalMinor: "5800000",
      },
    ],
    subtotalMinor: "17500000",
    discountMinor: "0",
    taxMinor: "2800000",
    totalMinor: "20300000",
    balanceMinor: "20300000",
    notes:
      "Thank you for choosing Webworks Africa. Quote the invoice number on your remittance.",
    terms:
      "Payment due within 30 days. Confirm the original Furaia payment reference.",
    relatedReference: "",
    paymentReference: "",
    tax: {
      status: "Not connected",
      reference: "",
      qrPayload: "FURAIA-DEMO|INV-2026-0142|ETIMS-NOT-CONNECTED",
      label: "Document reference - demo",
    },
  };
  const noTax = {
    status: "Not connected" as const,
    reference: "",
    label: "",
    qrPayload: "",
  };
  const variants: FinancialDocument[] = [
    base,
    { ...base, id: "INV-2026-0143", template: "modern" },
    {
      ...base,
      id: "QUO-2026-0081",
      kind: "quotation",
      template: "minimal",
      status: "Sent",
      tax: noTax,
    },
    {
      ...base,
      id: "LPO-2026-0042",
      kind: "lpo",
      tax: noTax,
      terms:
        "Supply only against this purchase order. Reference the LPO on your invoice.",
    },
    {
      ...base,
      id: "RCT-2026-0023",
      kind: "receipt",
      status: "Confirmed payment",
      relatedReference: base.id,
      paymentReference: "PAY-DEMO-023",
      balanceMinor: "0",
      notes: "Payment method: M-Pesa\nProvider reference: DEMO-CONFIRMED-023",
      terms:
        "Confirmed allocation receipt. Later credits and refunds are separate events.",
    },
  ];
  for (const m of variants) {
    const bytes = await renderDocumentPdf(m);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
    if (process.env.FURAIA_PDF_QA_DIR) {
      await mkdir(process.env.FURAIA_PDF_QA_DIR, { recursive: true });
      await writeFile(`${process.env.FURAIA_PDF_QA_DIR}/${m.id}.pdf`, bytes);
    }
  }
  const longBytes = await renderDocumentPdf({
    ...base,
    lines: Array.from({ length: 65 }, () => base.lines[0]),
  });
  expect((await PDFDocument.load(longBytes)).getPageCount()).toBeGreaterThan(2);
}, 30000);
