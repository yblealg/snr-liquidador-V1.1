// PDF de la liquidación: se arma solo con lo guardado en el registro, para que las reimpresiones salgan idénticas.
const PDFLiq = (() => {
  let logo;
  const cargarLogo = () => logo !== undefined ? Promise.resolve(logo) : new Promise((res) => {
    const im = new Image();
    im.onload = () => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; c.getContext("2d").drawImage(im, 0, 0); logo = c.toDataURL("image/jpeg"); res(logo); };
    im.onerror = () => { logo = null; res(null); };
    im.src = "img/logoSNR.jpg";
  });
  const m = (n) => "$ " + n.toLocaleString("es-CO");
  async function generar(rec, reimpresion) {
    const doc = new window.jspdf.jsPDF("p", "mm", "letter"), AZUL = [44, 62, 80];
    const lg = await cargarLogo(); if (lg) doc.addImage(lg, "JPEG", 10, 10, 35, 25);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("SUPERINTENDENCIA DE NOTARIADO Y REGISTRO", 50, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text("Oficina de Registro de Instrumentos Públicos de Barranquilla", 50, 26);
    doc.setFontSize(9); doc.text("Fecha de liquidación: " + Fechas.dmy(rec.fechaLiq), 200, 33, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.text("LIQUIDACIÓN " + rec.lr, 200, 38, { align: "right" });
    doc.setLineWidth(0.4); doc.line(10, 41, 200, 41);
    doc.setFontSize(10); doc.text("DATOS DEL INTERESADO Y DEL DOCUMENTO" + (reimpresion > 0 ? " (REIMPRESIÓN " + reimpresion + ")" : ""), 10, 48);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const mats = rec.matriculas.length ? doc.splitTextToSize("Matrículas (" + rec.matriculas.length + "): " + rec.matriculas.map((n) => "040-" + n).join(", "), 100) : ["Sin matrícula"];
    doc.text("Solicitante: " + (rec.solicitante || "N/A"), 10, 54); doc.text("Identificación: " + (rec.id || "N/A"), 10, 59);
    doc.setFont("helvetica", "bold"); doc.text(mats, 10, 65);
    doc.setFont("helvetica", "bold"); doc.text("REFERENCIA DEL DOCUMENTO", 125, 54); doc.setFont("helvetica", "normal");
    doc.text("Tipo: " + (rec.tipoDoc || "N/A"), 125, 59); doc.text("Número: " + (rec.numDoc || "N/A"), 125, 64);
    doc.text("Fecha: " + Fechas.dmy(rec.fechaDoc), 125, 69); doc.text("Origen: " + (rec.origen || "N/A"), 125, 74);
    const comun = { theme: "striped", headStyles: { fillColor: AZUL, halign: "center" }, styles: { fontSize: 8, cellPadding: 2 }, margin: { left: 10, right: 10, bottom: 24 } };
    doc.autoTable(Object.assign({}, comun, { startY: Math.max(65 + mats.length * 4.5, 78) + 4,
      head: [["Código", "Acto / Concepto", "Cuantía / Cant.", "Tarifa", "Derechos", "Conservación"]],
      body: rec.filas.map((f) => [f.cod, f.acto, f.entrada, f.tarifa, m(f.derechos), m(f.conservacion)]),
      columnStyles: { 4: { halign: "right" }, 5: { halign: "right" } } }));
    if (rec.certDetalle.length) doc.autoTable(Object.assign({}, comun, { startY: doc.lastAutoTable.finalY + 6,
      head: [["Certificados asociados", "Cantidad", "Valor unitario", "Total"]],
      body: rec.certDetalle.map((c) => ["Certificado de tradición y libertad (" + c.tarifa + ")", c.cant, m(c.unit), m(c.total)]),
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } } }));
    let y = doc.lastAutoTable.finalY + 10; if (y > 240) { doc.addPage(); y = 20; }
    const t = rec.totales;
    [["Valor derechos", t.derechos], ["Valor conservación documental", t.conservacion], ["Valor certificados asociados", t.certificados]].forEach((l, i) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(l[0], 130, y + i * 6); doc.text(m(l[1]), 200, y + i * 6, { align: "right" });
    });
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.line(130, y + 19, 200, y + 19);
    doc.text("VALOR TOTAL", 130, y + 25); doc.text(m(t.total), 200, y + 25, { align: "right" });
    const n = doc.getNumberOfPages(), quien = CONFIG.funcionario + " - " + CONFIG.cargo, ahora = new Date().toLocaleString("es-CO");
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]); doc.rect(10, 262, 190, 12, "F"); doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.text("Liquidación informativa; no constituye recibo de pago oficial.", 13, 267);
      doc.text("Generado por: " + quien + " · " + ahora + " · " + rec.lr + " · Página " + i + " de " + n, 13, 271.5); doc.setTextColor(0, 0, 0);
    }
    doc.save("Liquidacion_" + rec.lr + ".pdf");
  }
  return { generar };
})();
