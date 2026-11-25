// Motor de cálculo: lee CATALOGO_SIR y PARAMETROS_SIR. Sin pantalla ni almacenamiento.
const Motor = (() => {
  const r100 = (x) => Math.round(x / 100) * 100; // centena más cercana, mitad hacia arriba (verificado en el SIR)
  function derechoActo(a, act) {
    const P = PARAMETROS_SIR;
    const m = P.multiplicadorTarifa[a.tarifa || act.tarifaDefecto];
    const q = Math.max(1, Math.floor(a.cantidad) || 1);
    let bruto = 0;
    if (act.tipo === "CON_CUANTIA") {
      const v = a.valor || 0, av = a.avaluo || 0;
      const base = act.base === "AVALUO" ? av : act.base === "MAYOR_VALOR_AVALUO" ? Math.max(v, av) : v;
      const t = P.tramosCuantia.find((x) => x.hasta === null || base <= x.hasta);
      bruto = t.valorFijo !== undefined ? t.valorFijo : base * t.tasa;
    } else if (act.tipo === "SIN_CUANTIA") bruto = P.sinCuantia.valor * q;
    else if (act.tipo === "FIJA") bruto = act.valor * q;
    else if (act.tipo === "VALOR_DIGITADO") bruto = a.valor || 0;
    return r100(bruto * (m === undefined ? 1 : m));
  }
  function liquidar(actos, certs) {
    const P = PARAMETROS_SIR, c = certs || {};
    const filas = actos.map((a) => {
      const act = CATALOGO_SIR[a.cod], d = derechoActo(a, act);
      return Object.assign({}, a, { acto: act.acto, derechos: d, conservacion: act.conservacion ? r100(d * P.conservacion.porcentaje) : 0 });
    });
    const sum = (k) => filas.reduce((s, f) => s + f[k], 0);
    const certificados = (c.NORMAL || 0) * P.certificados.NORMAL + (c.MEDIO || 0) * P.certificados.MEDIO + (c.EXENTO || 0) * P.certificados.EXENTO;
    const derechos = sum("derechos"), conservacion = sum("conservacion");
    return { filas, derechos, conservacion, certificados, total: derechos + conservacion + certificados };
  }
  return { liquidar, derechoActo };
})();
