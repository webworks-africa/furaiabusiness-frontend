export async function printDocument(paper: HTMLElement) {
  const frame = document.createElement("iframe");
  frame.title = "Document print preview";
  Object.assign(frame.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "210mm",
    height: "297mm",
    border: "0",
  });
  document.body.appendChild(frame);
  try {
    const d = frame.contentDocument;
    if (!d) throw Error("Print preview unavailable");
    d.title = paper.dataset.documentId ?? "Furaia document";
    const loads: Promise<void>[] = [];
    for (const s of document.head.querySelectorAll(
      'style,link[rel="stylesheet"]',
    )) {
      const copy = s.cloneNode(true) as HTMLElement;
      if (copy instanceof HTMLLinkElement)
        loads.push(
          new Promise((resolve, reject) => {
            copy.onload = () => resolve();
            copy.onerror = () => reject(Error("Print styles unavailable"));
            setTimeout(() => reject(Error("Print styles timed out")), 5000);
          }),
        );
      d.head.appendChild(copy);
    }
    d.body.style.margin = "0";
    d.body.appendChild(paper.cloneNode(true));
    await Promise.all(loads);
    await d.fonts.ready;
    await Promise.allSettled(Array.from(d.images).map((i) => i.decode()));
    frame.contentWindow?.addEventListener("afterprint", () => frame.remove(), {
      once: true,
    });
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
  } catch (e) {
    frame.remove();
    throw e;
  }
}
