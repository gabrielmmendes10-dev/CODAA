(() => {
  "use strict";

  const ascii = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "-");
  const escapePdf = value => ascii(value).replace(/([\\()])/g, "\\$1");
  function wrap(text, width = 88) {
    const words = ascii(text).split(/\s+/).filter(Boolean), lines = [];
    let line = "";
    words.forEach(word => {
      if (`${line} ${word}`.trim().length > width && line) { lines.push(line); line = word; }
      else line = `${line} ${word}`.trim();
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }
  function createPdf({ title = "Relatorio Coda", lines = [], filename = "relatorio-coda.pdf" }) {
    const contentLines = [title, `Gerado em ${new Date().toLocaleString("pt-BR")}`, "", ...lines.flatMap(line => wrap(line))];
    const pages = [];
    for (let index = 0; index < contentLines.length; index += 44) pages.push(contentLines.slice(index, index + 44));
    const objects = ["", "<< /Type /Catalog /Pages 2 0 R >>", ""];
    const pageIds = [];
    pages.forEach(page => {
      const pageId = objects.length, contentId = pageId + 1; pageIds.push(pageId);
      const stream = `BT\n/F1 11 Tf\n50 790 Td\n15 TL\n${page.map((line, i) => `${i ? "T*\n" : ""}(${escapePdf(line)}) Tj`).join("\n")}\nET`;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${contentId + 1} 0 R >> >> /Contents ${contentId} 0 R >>`);
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    });
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    let pdf = "%PDF-1.4\n", offsets = [0];
    for (let id = 1; id < objects.length; id++) { offsets[id] = pdf.length; pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`; }
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" })); link.download = filename;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 800);
  }
  window.CodaReports = { downloadPdf: createPdf };
})();
