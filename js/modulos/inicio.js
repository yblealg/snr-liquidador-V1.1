registrarModulo({
  id: "inicio", titulo: "Inicio", orden: 1,
  montar(el, ctx) {
    const catalogoOk = typeof CATALOGO_SIR === "object" && Object.keys(CATALOGO_SIR).length > 0;
    const n = catalogoOk ? Object.keys(CATALOGO_SIR).length : 0;
    const res = typeof PARAMETROS_SIR === "object" ? PARAMETROS_SIR.resolucion : null;
    el.innerHTML = `
      <div class="tarjeta">
        <h2>Bienvenido, ${escHtml(ctx.config.funcionario)}</h2>
        <p class="suave">Herramienta de apoyo para preliquidación y consultas de la ${escHtml(ctx.config.oficina)}. Valide la información antes de cargarla en el SIR.</p>
        <ul class="estado">
          <li>Catálogo de actos: ${catalogoOk ? `<span class="ok">${n} actos cargados</span>` : '<span class="mal">no se cargó data/diccionario.js</span>'}</li>
          <li>Resolución: ${res ? `<span class="ok">${escHtml(res.numero)}, vigente desde ${escHtml(res.vigencia)}</span>` : '<span class="mal">sin parámetros</span>'}</li>
          <li>Preliquidación: <span class="pendiente">en construcción</span></li>
          <li>Consulta de traslados: <span class="pendiente">en construcción</span></li>
        </ul>
      </div>`;
  }
});
