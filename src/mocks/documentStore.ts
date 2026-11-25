import type { z } from "zod";
import type {
  exportSchema,
  deliverySchema,
  uploadSchema,
  payableSchema,
} from "../api/documentContracts";
export type StoredLink = {
  id: string;
  hash: string;
  supplierId: string;
  supplierName: string;
  businessName: string;
  expiresAt: string;
  status: "Active" | "Revoked";
};
export type StoredUpload = z.infer<typeof uploadSchema> & {
  bytes: Uint8Array;
  mime: string;
};
export type StoredPayable = Omit<
  z.infer<typeof payableSchema>,
  "status" | "bucket" | "latestOrderId"
>;
const memory = {
  links: [] as StoredLink[],
  intakes: [] as StoredUpload[],
  payables: [] as StoredPayable[],
};
export const documents = {
  exports: [] as z.infer<typeof exportSchema>[],
  pdfs: new Map<string, Uint8Array>(),
  deliveries: [] as z.infer<typeof deliverySchema>[],
  tax: [] as {
    documentId: string;
    status: "Demo accepted" | "Demo rejected";
    reference: string;
  }[],
  taxMode: "Not connected" as "Not connected" | "Demo",
  epoch: 0,
};
let clearing = Promise.resolve();
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("FuraiaSupplierDocuments", 1);
    r.onupgradeneeded = () => {
      for (const k of ["links", "intakes", "payables"])
        r.result.createObjectStore(k, { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(Error("Document storage unavailable"));
  });
}
async function operation<T>(
  kind: keyof typeof memory,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
) {
  await clearing;
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(kind, mode),
        r = fn(t.objectStore(kind));
      let value: T;
      r.onsuccess = () => {
        value = r.result;
      };
      t.oncomplete = () => resolve(value);
      t.onerror = t.onabort = () =>
        reject(Error("Document storage unavailable"));
    });
  } finally {
    db.close();
  }
}
export const supplierRepo = {
  async all<K extends keyof typeof memory>(k: K): Promise<(typeof memory)[K]> {
    if (typeof indexedDB === "undefined") return structuredClone(memory[k]);
    return (await operation(k, "readonly", (s) =>
      s.getAll(),
    )) as (typeof memory)[K];
  },
  async put<K extends keyof typeof memory>(
    k: K,
    v: (typeof memory)[K][number],
  ) {
    if (typeof indexedDB === "undefined") {
      const list = memory[k] as { id: string }[],
        i = list.findIndex((x) => x.id === v.id);
      if (i < 0) list.push(structuredClone(v));
      else list[i] = structuredClone(v);
      return;
    }
    await operation(k, "readwrite", (s) => s.put(v));
  },
};
export function resetDocuments() {
  documents.epoch++;
  documents.exports = [];
  documents.pdfs.clear();
  documents.deliveries = [];
  documents.tax = [];
  documents.taxMode = "Not connected";
  for (const k of ["links", "intakes", "payables"] as const) memory[k] = [];
  if (typeof indexedDB !== "undefined")
    clearing = clearing
      .catch(() => {})
      .then(async () => {
        const db = await database();
        try {
          await new Promise<void>((resolve, reject) => {
            const t = db.transaction(
              ["links", "intakes", "payables"],
              "readwrite",
            );
            for (const k of ["links", "intakes", "payables"])
              t.objectStore(k).clear();
            t.oncomplete = () => resolve();
            t.onerror = () => reject(Error("Reset unavailable"));
          });
        } finally {
          db.close();
        }
      });
}
