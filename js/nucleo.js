// Núcleo: sesión, menú y registro de módulos. No contiene lógica de negocio.
// Un módulo es: registrarModulo({ id, titulo, orden, montar(el, ctx), alMostrar?(el, ctx) })
(function () {
  const modulos = [];
  const montados = {};
  const $ = (id) => document.getElementById(id);
  let usuario = null;

  window.registrarModulo = (m) => modulos.push(m);
  window.escHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ctx = { config: CONFIG, usuario: () => usuario };

  const ERRORES = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/invalid-email": "El correo no tiene un formato válido.",
    "auth/user-disabled": "Este usuario está deshabilitado. Consulte al administrador.",
    "auth/too-many-requests": "Demasiados intentos. Espere unos minutos e intente de nuevo.",
    "auth/network-request-failed": "No hay conexión con Firebase. Revise su internet.",
    "auth/operation-not-allowed": "El ingreso con correo y contraseña no está activado en Firebase."
  };

  function errorLogin(texto) { const e = $("loginError"); e.textContent = texto || ""; e.hidden = !texto; }

  function construirMenu() {
    $("menu").innerHTML = ""; $("vistas").innerHTML = "";
    [...modulos].sort((a, b) => (a.orden || 99) - (b.orden || 99)).forEach((m) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "nav-btn"; b.dataset.id = m.id; b.textContent = m.titulo;
      b.onclick = () => { location.hash = m.id; };
      $("menu").appendChild(b);
      const s = document.createElement("section");
      s.id = "vista-" + m.id; s.hidden = true; $("vistas").appendChild(s);
    });
  }

  function mostrar() {
    const m = modulos.find((x) => x.id === location.hash.slice(1)) || [...modulos].sort((a, b) => (a.orden || 99) - (b.orden || 99))[0];
    if (!m) return;
    modulos.forEach((x) => { $("vista-" + x.id).hidden = x.id !== m.id; });
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("activo", b.dataset.id === m.id));
    const sec = $("vista-" + m.id);
    // Cada módulo se monta una sola vez y falla de forma aislada: un error en uno no afecta a los demás.
    try {
      if (!montados[m.id]) { montados[m.id] = true; m.montar(sec, ctx); }
      else if (m.alMostrar) m.alMostrar(sec, ctx);
    } catch (e) {
      console.error(e);
      sec.innerHTML = '<div class="tarjeta error"><h3>Este módulo no pudo cargar</h3><p>' + escHtml(e.message) + "</p></div>";
    }
  }

  window.iniciarSistema = function () {
    $("oficina").textContent = CONFIG.oficina; $("funcionario").textContent = CONFIG.funcionario;
    $("cargo").textContent = CONFIG.cargo; $("norma").textContent = CONFIG.norma; $("version").textContent = CONFIG.version;
    $("login").hidden = false;
    let auth;
    try { firebase.initializeApp(CONFIG.firebase); auth = firebase.auth(); }
    catch (e) { console.error(e); errorLogin("No se pudo conectar con Firebase. Revise su conexión y recargue la página."); return; }

    auth.onAuthStateChanged((u) => {
      usuario = u;
      $("login").hidden = !!u; $("app").hidden = !u;
      if (u) { $("usuario").textContent = u.email; construirMenu(); mostrar(); }
      else { Object.keys(montados).forEach((k) => delete montados[k]); $("vistas").innerHTML = ""; $("menu").innerHTML = ""; }
    });
    window.addEventListener("hashchange", () => { if (usuario) mostrar(); });

    $("formLogin").addEventListener("submit", (ev) => {
      ev.preventDefault(); errorLogin(""); $("btnEntrar").disabled = true; $("halo").classList.add("verificando");
      auth.signInWithEmailAndPassword($("email").value.trim(), $("clave").value)
        .catch((e) => { errorLogin(ERRORES[e.code] || "No se pudo iniciar sesión (" + e.code + ")."); $("halo").classList.add("falla"); setTimeout(() => $("halo").classList.remove("falla"), 700); })
        .finally(() => { $("btnEntrar").disabled = false; $("halo").classList.remove("verificando"); $("clave").value = ""; });
    });
    $("btnSalir").addEventListener("click", () => auth.signOut());
  };
})();
