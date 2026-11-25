import qrcode from "qrcode-generator";
export function documentQr(payload: string) {
  const q = qrcode(0, "M");
  q.addData(payload);
  q.make();
  const size = q.getModuleCount() + 8,
    points: [number, number][] = [];
  for (let y = 0; y < q.getModuleCount(); y++)
    for (let x = 0; x < q.getModuleCount(); x++)
      if (q.isDark(y, x)) points.push([x + 4, y + 4]);
  return {
    size,
    points,
    path: points.map(([x, y]) => `M${x},${y}h1v1h-1z`).join(""),
  };
}
