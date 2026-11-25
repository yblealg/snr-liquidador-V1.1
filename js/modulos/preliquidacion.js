registrarModulo({
  id: "preliquidacion", titulo: "Preliquidación", orden: 2,
  montar(el) {
    const q = (s) => el.querySelector(s);
    const fmt = (n) => "$ " + n.toLocaleString("es-CO");
    const num = (s) => Number(String(s).replace(/\D/g, "")) || 0;
    const d = new Date(), hoy = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const matriculas = [], actos = [], certs = { EXENTO: 0, MEDIO: 0, NORMAL: 0 };
    let sel = null;
    const cods = Object.keys(CATALOGO_SIR).map(Number).sort((a, b) => a - b);
    el.innerHTML = `
    <div class="tarjeta"><h3>Encabezado del documento</h3>
      <div class="rejilla">
        <label>Tipo de documento<input id="p-tipo" list="dl-tipos" placeholder="ESCRITURA" autocomplete="off"></label>
        <label>Número<input id="p-num" inputmode="numeric"></label>
        <label>Fecha<input id="p-fecha" type="date" value="${hoy}"></label>
        <label>Origen (notaría o juzgado)<input id="p-origen"></label>
        <label>Solicitante<input id="p-sol"></label>
        <label>Identificación<input id="p-id"></label>
      </div>
      <label>Matrículas (círculo 040) · <b id="p-cont">0 matrículas</b>
        <input id="p-mat" inputmode="numeric" placeholder="Número y Enter, o pegue varias" autocomplete="off"></label>
      <p id="p-msgmat" class="msg-error" hidden></p>
      <div id="p-chips" class="chips"></div>
      <p id="p-estado" class="suave"></p>
    </div>
    <div class="tarjeta"><h3>Actos</h3>
      <label>Acto (código o nombre)<input id="p-acto" list="dl-actos" autocomplete="off" placeholder="Ej: 1 o venta"></label>
      <div id="p-campos" class="rejilla" hidden>
        <label><span id="p-lval"></span><input id="p-val" inputmode="numeric"></label>
        <label id="p-bav" hidden>Avalúo catastral<input id="p-av" inputmode="numeric"></label>
        <label>Tarifa<select id="p-tar"></select></label>
        <button type="button" class="btn btn-mini" id="p-add">Agregar</button>
      </div>
      <p id="p-msgacto" class="msg-error" hidden></p>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Cód.</th><th>Acto</th><th>Cuantía / cant.</th><th>Tarifa</th><th>Derechos</th><th>Conserv.</th><th></th></tr></thead><tbody id="p-filas"></tbody></table></div>
    </div>
    <div class="tarjeta"><h3>Certificados asociados</h3>
      <div class="rejilla"><label>Exento<input id="c-EXENTO" type="number" min="0" value="0"></label>
      <label>Medio<input id="c-MEDIO" type="number" min="0" value="0"></label>
      <label>Normal<input id="c-NORMAL" type="number" min="0" value="0"></label></div>
    </div>
    <div class="tarjeta resumen" id="p-res"></div>
    <div class="tarjeta"><button class="btn" id="p-pdf" type="button">Generar liquidación (PDF)</button><p id="p-msgpdf" class="msg-error" hidden></p></div>
    <dialog id="p-dlg"><p id="p-dlg-txt"></p><div class="dlg-botones"><button type="button" data-r="re">Volver a imprimir la existente</button><button type="button" data-r="nueva">Guardar como nueva</button><button type="button" data-r="no">Cancelar</button></div></dialog>
    <datalist id="dl-tipos">${TIPOS_DOCUMENTO.map((t) => `<option value="${t}">`).join("")}</datalist>
    <datalist id="dl-actos">${cods.map((c) => `<option value="${c} - ${escHtml(CATALOGO_SIR[c].acto)}">`).join("")}</datalist>`;

    function aviso(id, txt) { const p = q(id); p.textContent = txt || ""; p.hidden = !txt; }

    // ---- Matrículas: se validan contra la base de traslados, como el SIR ----
    function agregarMat(texto) {
      const partes = texto.trim().split("-"), n = partes[partes.length - 1].replace(/\D/g, "");
      if (!n) return null;
      if (partes.length > 1 && partes[0].trim() !== "040") return "La matrícula " + texto.trim() + " no es del círculo 040.";
      if (n.length > 6) return "La matrícula " + n + " no es válida (máximo 6 dígitos).";
      if (matriculas.some((m) => m.n === n)) return "La matrícula 040-" + n + " ya está en la lista.";
      const dest = Traslados.destino(n);
      if (dest) return "Resultado de la validación de la matrícula 040-" + n + ": El folio ya ha sido trasladado con matrícula " + dest + ".";
      matriculas.push({ n, sinVerificar: dest === undefined });
      return null;
    }
    function pintarMat() {
      q("#p-cont").textContent = matriculas.length + (matriculas.length === 1 ? " matrícula" : " matrículas");
      q("#p-chips").innerHTML = matriculas.map((m, i) => `<span class="chip${m.sinVerificar ? " chip-amarillo" : ""}" title="${m.sinVerificar ? "Sin verificar traslado" : ""}">040-${m.n}<button type="button" data-mat="${i}" aria-label="Quitar">✕</button></span>`).join("");
    }
    const mat = q("#p-mat");
    mat.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault(); const err = agregarMat(mat.value); aviso("#p-msgmat", err); mat.value = ""; pintarMat();
    });
    mat.addEventListener("paste", (e) => {
      e.preventDefault();
      const errs = (e.clipboardData.getData("text") || "").split(/[\s,;]+/).filter(Boolean).map(agregarMat).filter(Boolean);
      aviso("#p-msgmat", errs.join("  ·  ")); pintarMat();
    });
    q("#p-chips").addEventListener("click", (e) => { const i = e.target.dataset.mat; if (i !== undefined) { matriculas.splice(+i, 1); pintarMat(); } });

    // ---- Actos ----
    function elegirActo() {
      const c = parseInt(q("#p-acto").value, 10), act = CATALOGO_SIR[c];
      if (!act) { sel = null; q("#p-campos").hidden = true; aviso("#p-msgacto", q("#p-acto").value ? "Código inexistente en el catálogo." : ""); return; }
      aviso("#p-msgacto", ""); sel = { cod: c, act };
      q("#p-lval").textContent = act.tipo === "CON_CUANTIA" ? "Cuantía" : act.tipo === "VALOR_DIGITADO" ? "Valor" : "Cantidad";
      q("#p-bav").hidden = !(act.base === "MAYOR_VALOR_AVALUO" || act.base === "AVALUO");
      q("#p-tar").innerHTML = act.tarifas.map((t) => `<option value="${t}"${t === act.tarifaDefecto ? " selected" : ""}>${t}</option>`).join("");
      q("#p-val").value = act.tipo === "CON_CUANTIA" || act.tipo === "VALOR_DIGITADO" ? "" : "1";
      q("#p-campos").hidden = false; q("#p-val").focus(); q("#p-val").select();
    }
    q("#p-acto").addEventListener("change", elegirActo);
    q("#p-acto").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); elegirActo(); } });
    function agregarActo() {
      if (!sel) return;
      const v = num(q("#p-val").value), conCuantia = sel.act.tipo === "CON_CUANTIA" || sel.act.tipo === "VALOR_DIGITADO";
      if (v <= 0) { aviso("#p-msgacto", "Digite un valor mayor que cero."); return; }
      actos.push({ cod: sel.cod, tarifa: q("#p-tar").value, valor: conCuantia ? v : 0, cantidad: conCuantia ? 1 : v, avaluo: num(q("#p-av").value) });
      sel = null; q("#p-campos").hidden = true; q("#p-av").value = ""; q("#p-acto").value = ""; aviso("#p-msgacto", ""); q("#p-acto").focus(); pintar();
    }
    q("#p-add").addEventListener("click", agregarActo);
    q("#p-campos").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); agregarActo(); } });
    q("#p-filas").addEventListener("click", (e) => { const i = e.target.dataset.del; if (i !== undefined) { actos.splice(+i, 1); pintar(); } });
    ["EXENTO", "MEDIO", "NORMAL"].forEach((k) => q("#c-" + k).addEventListener("input", (e) => { certs[k] = Math.max(0, parseInt(e.target.value, 10) || 0); pintar(); }));

    // ---- Resumen en vivo ----
    function pintar() {
      const r = Motor.liquidar(actos, certs);
      q("#p-filas").innerHTML = r.filas.map((f, i) => {
        const act = CATALOGO_SIR[f.cod], entrada = act.tipo === "CON_CUANTIA" || act.tipo === "VALOR_DIGITADO" ? fmt(f.valor) : f.cantidad;
        return `<tr><td>${f.cod}</td><td>${escHtml(f.acto)}</td><td>${entrada}</td><td>${f.tarifa}</td><td>${fmt(f.derechos)}</td><td>${fmt(f.conservacion)}</td><td><button type="button" class="x" data-del="${i}" aria-label="Quitar">✕</button></td></tr>`;
      }).join("") || '<tr><td colspan="7" class="suave">Aún no hay actos.</td></tr>';
      const falta = actos.some((a) => CATALOGO_SIR[a.cod].certificado === "OBLIGATORIO") && certs.EXENTO + certs.MEDIO + certs.NORMAL === 0;
      q("#p-res").className = "tarjeta resumen" + (falta ? " resumen-aviso" : "");
      q("#p-res").innerHTML = `<dl><dt>Valor derechos</dt><dd>${fmt(r.derechos)}</dd><dt>Valor conservación documental</dt><dd>${fmt(r.conservacion)}</dd><dt>Valor certificados asociados</dt><dd>${fmt(r.certificados)}</dd><dt class="total">Valor total</dt><dd class="total">${fmt(r.total)}</dd></dl>` +
        (falta ? '<p class="aviso-cert">Este acto exige certificado de tradición para notificar al juzgado.</p>' : "");
    }
    // ---- Guardar, detectar repetida y generar PDF ----
    const dlg = q("#p-dlg");
    const preguntar = (txt) => new Promise((res) => { q("#p-dlg-txt").textContent = txt; dlg.returnValue = "no"; dlg.onclose = () => res(dlg.returnValue); dlg.showModal(); });
    dlg.addEventListener("click", (e) => { if (e.target.dataset.r) dlg.close(e.target.dataset.r); });
    const firma = () => JSON.stringify([matriculas.map((m) => m.n).sort(), q("#p-tipo").value.trim(), q("#p-num").value.trim(), q("#p-fecha").value, actos.map((a) => [a.cod, a.valor, a.cantidad, a.avaluo, a.tarifa]), certs]);
    function construir(r, f) {
      const c = PARAMETROS_SIR.certificados, fecha = Fechas.hoy();
      return { lr: Almacen.siguienteLR(fecha.slice(0, 4), CONFIG.circulo), fechaLiq: fecha, firma: f, tipoDoc: q("#p-tipo").value.trim(), numDoc: q("#p-num").value.trim(), fechaDoc: q("#p-fecha").value, origen: q("#p-origen").value.trim(), solicitante: q("#p-sol").value.trim().toUpperCase(), id: q("#p-id").value.trim(), matriculas: matriculas.map((m) => m.n),
        filas: r.filas.map((x) => { const t = CATALOGO_SIR[x.cod].tipo; return { cod: x.cod, acto: x.acto, entrada: t === "CON_CUANTIA" || t === "VALOR_DIGITADO" ? fmt(x.valor) : String(x.cantidad), tarifa: x.tarifa, derechos: x.derechos, conservacion: x.conservacion }; }),
        certDetalle: ["NORMAL", "MEDIO", "EXENTO"].filter((t) => certs[t] > 0).map((t) => ({ tarifa: t, cant: certs[t], unit: c[t], total: certs[t] * c[t] })),
        totales: { derechos: r.derechos, conservacion: r.conservacion, certificados: r.certificados, total: r.total }, impresiones: 0 };
    }
    q("#p-pdf").addEventListener("click", async () => {
      const r = Motor.liquidar(actos, certs);
      if (!actos.length && !r.certificados) { aviso("#p-msgpdf", "Agregue al menos un acto o un certificado."); return; }
      aviso("#p-msgpdf", "");
      const f = firma(), previa = Almacen.listar().find((x) => x.firma === f);
      let rec = null;
      if (previa) {
        const op = await preguntar("Ya existe " + previa.lr + ", liquidada el " + Fechas.dmy(previa.fechaLiq) + " por " + fmt(previa.totales.total) + ". ¿Qué desea hacer?");
        if (op === "no") return;
        if (op === "re") rec = previa;
      }
      if (!rec) rec = construir(r, f);
      rec.impresiones = (rec.impresiones || 0) + 1; rec.ultimaImpresion = Fechas.hoy(); Almacen.guardar(rec);
      try { await PDFLiq.generar(rec, rec.impresiones - 1); } catch (e) { console.error(e); aviso("#p-msgpdf", "No se pudo generar el PDF: " + e.message); }
    });
    pintar(); pintarMat();
    Traslados.cargar().then((e) => {
      q("#p-estado").textContent = e === "ok" ? "Traslados verificados con la base al " + Traslados.corte() + "." : "No se pudo cargar la base de traslados: las matrículas quedan sin verificar.";
    });
  }
});
