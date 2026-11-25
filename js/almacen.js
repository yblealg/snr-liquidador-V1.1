// Única pieza que guarda datos. Hoy usa el navegador; para pasar a Firebase solo se cambia este archivo.
const Fechas = {
  iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); },
  hoy() { return this.iso(new Date()); },
  dmy(iso) { if (!iso) return "—"; const p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; },
  desde(per) {
    const n = new Date(), d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (per === "hoy") return this.iso(d);
    if (per === "semana") { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return this.iso(d); } // semana desde el lunes
    if (per === "mes") return this.iso(new Date(n.getFullYear(), n.getMonth(), 1));
    if (per === "trimestre") return this.iso(new Date(n.getFullYear(), Math.floor(n.getMonth() / 3) * 3, 1));
    if (per === "anio") return this.iso(new Date(n.getFullYear(), 0, 1));
    return "";
  }
};
const Almacen = (() => {
  const K = "sir_liquidaciones", C = "sir_contadores";
  const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };
  const escribir = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  return {
    listar: () => leer(K, []),
    guardar(rec) { const l = leer(K, []), i = l.findIndex((x) => x.lr === rec.lr); if (i >= 0) l[i] = rec; else l.push(rec); escribir(K, l); },
    borrar(lr) { escribir(K, leer(K, []).filter((x) => x.lr !== lr)); },
    siguienteLR(anio, circulo) { const c = leer(C, {}); c[anio] = (c[anio] || 0) + 1; escribir(C, c); return "LR-" + anio + "-" + circulo + "-" + String(c[anio]).padStart(4, "0"); }
  };
})();
