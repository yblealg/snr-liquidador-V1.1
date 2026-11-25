registrarModulo({
  id: "historial", titulo: "Historial", orden: 2.5,
  alMostrar(el) { if (el.__pintar) el.__pintar(); },
  montar(el) {
    const q = (s) => el.querySelector(s), fmt = (n) => "$ " + n.toLocaleString("es-CO");
    const PER = [["hoy", "Hoy"], ["semana", "Esta semana"], ["mes", "Este mes"], ["trimestre", "Este trimestre"], ["anio", "Este año"], ["todo", "Todo"]];
    let per = localStorage.getItem("sir_periodo") || "hoy";
    el.innerHTML = `<div class="tarjeta"><h3>Historial de liquidaciones</h3>
      <div class="periodos">${PER.map((p) => `<button type="button" data-per="${p[0]}">${p[1]}</button>`).join("")}</div>
      <label>Buscar por LR, solicitante o matrícula<input id="h-buscar" autocomplete="off"></label>
      <p id="h-resumen" class="suave"></p>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>LR</th><th>Fecha</th><th>Solicitante</th><th>Matrículas</th><th>Total</th><th>Impresiones</th><th></th></tr></thead><tbody id="h-filas"></tbody></table></div></div>`;
    function pintar() {
      const desde = Fechas.desde(per), t = q("#h-buscar").value.trim().toUpperCase();
      const l = Almacen.listar().filter((r) => (!desde || r.fechaLiq >= desde) && (!t || (r.lr + " " + r.solicitante + " " + r.matriculas.join(" ")).toUpperCase().includes(t))).reverse();
      el.querySelectorAll("[data-per]").forEach((b) => b.classList.toggle("activo", b.dataset.per === per));
      q("#h-resumen").textContent = l.length + (l.length === 1 ? " liquidación" : " liquidaciones") + " · total " + fmt(l.reduce((s, r) => s + r.totales.total, 0));
      q("#h-filas").innerHTML = l.map((r) => `<tr><td><b>${escHtml(r.lr)}</b></td><td>${Fechas.dmy(r.fechaLiq)}</td><td>${escHtml(r.solicitante || "—")}</td><td>${r.matriculas.length}</td><td>${fmt(r.totales.total)}</td><td>${r.impresiones || 0}${r.ultimaImpresion ? " · " + Fechas.dmy(r.ultimaImpresion) : ""}</td><td><button type="button" class="mini" data-pdf="${r.lr}">PDF</button> <button type="button" class="x" data-del="${r.lr}" aria-label="Borrar">✕</button></td></tr>`).join("") || '<tr><td colspan="7" class="suave">No hay liquidaciones en este período.</td></tr>';
    }
    el.__pintar = pintar;
    q(".periodos").addEventListener("click", (e) => { if (e.target.dataset.per) { per = e.target.dataset.per; localStorage.setItem("sir_periodo", per); pintar(); } });
    q("#h-buscar").addEventListener("input", pintar);
    q("#h-filas").addEventListener("click", async (e) => {
      const lr = e.target.dataset.pdf || e.target.dataset.del; if (!lr) return;
      const rec = Almacen.listar().find((r) => r.lr === lr); if (!rec) return;
      if (e.target.dataset.del) { if (confirm("¿Borrar la liquidación " + lr + "? No se puede deshacer.")) { Almacen.borrar(lr); pintar(); } return; }
      rec.impresiones = (rec.impresiones || 0) + 1; rec.ultimaImpresion = Fechas.hoy(); Almacen.guardar(rec); pintar();
      await PDFLiq.generar(rec, rec.impresiones - 1);
    });
    pintar();
  }
});
