// Base de traslados 040 -> 041. destino(num): "041-xxxx" si fue trasladada, null si no, undefined si no se pudo verificar.
const Traslados = (() => {
  let datos = null, estado = "pendiente";
  async function cargar() {
    try { const r = await fetch("data/traslados.json"); if (!r.ok) throw new Error(r.status); datos = await r.json(); estado = "ok"; }
    catch (e) { console.error("Traslados:", e); estado = "error"; }
    return estado;
  }
  return {
    cargar, estado: () => estado, corte: () => (datos ? datos.corte : null),
    destino: (num) => { if (!datos) return undefined; const d = datos.t[num]; return d ? datos.destino + "-" + d : null; }
  };
})();
