// src/server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import { supabase, validarUsuario } from "./supabase.js";

dotenv.config();

// Resolver __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// CONFIG BÁSICA
// ==============================
app.disable("x-powered-by");
app.set("etag", false);

// Importante si estás detrás de proxy (EasyPanel / Nginx / Cloudflare)
app.set("trust proxy", 1);

// Body parsing
app.use(express.json());

// ==============================
// HEADERS DE SEGURIDAD BÁSICOS
// ==============================
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// ==============================
// VALIDACIÓN DE ENVS (evita 500 fantasma)
// ==============================
const isProd = process.env.NODE_ENV === "production";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (!isProd ? "dev-secret-change-me" : null);

if (!SESSION_SECRET) {
  // En producción es mejor fallar explícito que quedar en 500 silencioso
  console.error(
    "[server] ❌ Falta SESSION_SECRET en variables de entorno (producción)."
  );
}

// OJO: en tu supabase.js ya avisa si falta SUPABASE_URL/ROL_KEY.
// Aquí solo dejamos una alerta adicional (no crashea forzado).
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ROL_KEY) {
  console.warn(
    "[server] ⚠️ Falta SUPABASE_URL o SUPABASE_ROL_KEY. Revisa variables en EasyPanel."
  );
}

// ==============================
// SESIONES
// ==============================
app.use(
  session({
    name: "ganados.sid",
    secret: SESSION_SECRET || "MISSING_SECRET_SHOULD_NOT_HAPPEN",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd, // true en prod (https), false local
      maxAge: 1000 * 60 * 60 * 12, // 12 horas
    },
  })
);

// ==============================
// CACHE CONTROL (DEV)
// ==============================
if (!isProd) {
  app.use((req, res, next) => {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });
}

// ==============================
// STATIC (PUBLIC) - RUTA CORRECTA
// (esto corrige MUCHO el 500 en EasyPanel)
// ==============================
const PUBLIC_DIR = path.join(__dirname, "../public");

app.use(
  express.static(PUBLIC_DIR, {
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      const p = filePath.replaceAll("\\", "/").toLowerCase();

      // 🔥 PWA: NUNCA cachear SW/manifest desde el servidor
      if (
        p.endsWith("/g-sw.js") ||
        p.endsWith("/g-pwa.js") ||
        p.endsWith("/g-manifest.webmanifest")
      ) {
        res.setHeader("Cache-Control", "no-store");
        return;
      }

      // JS/CSS: revalidación suave
      if (p.endsWith(".js") || p.endsWith(".css")) {
        res.setHeader("Cache-Control", "no-cache");
        return;
      }

      // Imágenes / fuentes: cache opcional
      if (
        p.endsWith(".png") ||
        p.endsWith(".jpg") ||
        p.endsWith(".jpeg") ||
        p.endsWith(".webp") ||
        p.endsWith(".svg") ||
        p.endsWith(".ico") ||
        p.endsWith(".woff") ||
        p.endsWith(".woff2") ||
        p.endsWith(".ttf") ||
        p.endsWith(".otf")
      ) {
        res.setHeader("Cache-Control", "public, max-age=604800"); // 7 días
        return;
      }

      // HTML/otros: revalidar
      res.setHeader("Cache-Control", "no-cache");
    },
  })
);

// Evita 500 por favicon si NO existe archivo físico
app.get("/favicon.ico", (req, res) => {
  // si tienes favicon.ico en /public, express.static lo sirve antes de llegar aquí
  res.status(204).end();
});

// ==============================
// MIDDLEWARES DE AUTH
// ==============================
function requireAuthPage(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect("/");
}

function requireAuthApi(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ error: "NO_SESSION" });
}

// ==============================
// RUTAS DE PÁGINAS
// (login SIEMPRE en /)
// ==============================
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

app.get("/dashboard", requireAuthPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
});

app.get("/ingreso", requireAuthPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "ingreso.html"));
});

app.get("/salida", requireAuthPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "salida.html"));
});

app.get("/modificaciones", requireAuthPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "modificaciones.html"));
});

// (Opcional) si alguien entra directo a .html, redirige a la ruta “bonita”
app.get("/dashboard.html", requireAuthPage, (req, res) => res.redirect("/dashboard"));
app.get("/ingreso.html", requireAuthPage, (req, res) => res.redirect("/ingreso"));
app.get("/salida.html", requireAuthPage, (req, res) => res.redirect("/salida"));
app.get("/modificaciones.html", requireAuthPage, (req, res) => res.redirect("/modificaciones"));

// ==============================
// API: HEALTH (para ver rápido si vive)
// ==============================
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    node_env: process.env.NODE_ENV || "undefined",
    has_session_secret: !!process.env.SESSION_SECRET,
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_supabase_rol_key: !!process.env.SUPABASE_ROL_KEY,
    has_session: !!req.session?.user,
  });
});

// ==============================
// LOGIN / LOGOUT
// ==============================
app.post("/api/login", async (req, res) => {
  const { username, pin } = req.body || {};

  if (!username || !pin) {
    return res.status(400).json({ error: "Faltan usuario o clave." });
  }

  if (!/^\d{4}$/.test(pin)) {
    return res
      .status(400)
      .json({ error: "La clave debe tener exactamente 4 dígitos numéricos." });
  }

  try {
    const usuario = await validarUsuario(username, pin);

    if (!usuario) {
      return res.status(401).json({ error: "Usuario o clave incorrectos." });
    }

    // ✅ Guarda sesión
    req.session.user = { id: usuario.id, nombre: usuario.Nombre };

    // (Opcional) fuerza guardado antes de responder
    req.session.save((err) => {
      if (err) {
        console.error("[login] Error guardando sesión:", err);
        // Aun así devolvemos ok (pero ideal es devolver 500)
      }
      return res.json({ ok: true, usuario: req.session.user });
    });
  } catch (error) {
    console.error("Error al validar usuario en Supabase:", error);
    return res.status(500).json({
      error: "Error al validar las credenciales contra la base de datos.",
    });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("[logout] Error destruyendo sesión:", err);
      return res.status(500).json({ error: "No se pudo cerrar sesión." });
    }
    // Limpia cookie
    res.clearCookie("ganados.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    });
    return res.json({ ok: true });
  });
});

app.get("/api/me", requireAuthApi, (req, res) => {
  res.json({ ok: true, user: req.session.user });
});

// ==============================
// API FINCAS (protegido)
// ==============================
function normalizeIndicativo(v) {
  return (v ?? "").toString().trim().toUpperCase();
}

app.get("/api/fincas", requireAuthApi, async (req, res) => {
  const withCounts = req.query.withCounts === "1" || req.query.withCounts === "true";

  try {
    const { data: fincas, error } = await supabase
      .from("Fincas")
      .select("id, Indicativo")
      .order("Indicativo", { ascending: true });

    if (error) throw error;

    if (!withCounts) return res.json(fincas || []);

    const { data: hist, error: errH } = await supabase
      .from("historicoiys")
      .select("Finca");

    if (errH) throw errH;

    const countsMap = new Map();
    (hist || []).forEach((r) => {
      const k = (r.Finca ?? "...").toString();
      countsMap.set(k, (countsMap.get(k) || 0) + 1);
    });

    const enriched = (fincas || []).map((f) => ({
      ...f,
      asociados: countsMap.get(f.Indicativo) || 0,
    }));

    return res.json(enriched);
  } catch (err) {
    console.error("Error al obtener fincas:", err);
    res.status(500).json({ error: "Error al obtener fincas." });
  }
});

app.post("/api/fincas", requireAuthApi, async (req, res) => {
  const indicativo = normalizeIndicativo(req.body?.Indicativo);

  if (!indicativo) {
    return res.status(400).json({ error: "El Indicativo es obligatorio." });
  }

  if (indicativo.length > 80) {
    return res.status(400).json({ error: "El Indicativo no puede superar 80 caracteres." });
  }

  try {
    const { data, error } = await supabase
      .from("Fincas")
      .insert({ Indicativo: indicativo })
      .select("id, Indicativo")
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Esa finca ya existe." });
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("Error al crear finca:", err);
    res.status(500).json({ error: "Error al crear la finca." });
  }
});

app.put("/api/fincas/:id", requireAuthApi, async (req, res) => {
  const fincaId = Number(req.params.id);
  const nuevo = normalizeIndicativo(req.body?.Indicativo);

  if (!Number.isFinite(fincaId) || fincaId <= 0) {
    return res.status(400).json({ error: "ID de finca inválido." });
  }
  if (!nuevo) {
    return res.status(400).json({ error: "El Indicativo es obligatorio." });
  }
  if (nuevo.length > 80) {
    return res.status(400).json({ error: "El Indicativo no puede superar 80 caracteres." });
  }

  try {
    const { data: actual, error: errGet } = await supabase
      .from("Fincas")
      .select("id, Indicativo")
      .eq("id", fincaId)
      .single();

    if (errGet && errGet.code === "PGRST116") return res.status(404).json({ error: "Finca no encontrada." });
    if (errGet) throw errGet;

    const viejo = (actual?.Indicativo ?? "").toString();
    if (!viejo) return res.status(500).json({ error: "Finca inválida." });

    if (viejo === nuevo) {
      return res.json({
        ok: true,
        finca: { id: fincaId, Indicativo: viejo },
        updatedHistorico: 0,
        message: "Sin cambios.",
      });
    }

    const { data: existeNuevo, error: errExists } = await supabase
      .from("Fincas")
      .select("id")
      .eq("Indicativo", nuevo)
      .maybeSingle();

    if (errExists) throw errExists;
    if (existeNuevo?.id && Number(existeNuevo.id) !== fincaId) {
      return res.status(409).json({ error: "Ya existe una finca con ese nombre." });
    }

    const { error: errUpdHist, count } = await supabase
      .from("historicoiys")
      .update({ Finca: nuevo })
      .eq("Finca", viejo)
      .select("*", { count: "exact", head: true });

    if (errUpdHist) throw errUpdHist;

    const { data: fincaUpd, error: errUpdF } = await supabase
      .from("Fincas")
      .update({ Indicativo: nuevo })
      .eq("id", fincaId)
      .select("id, Indicativo")
      .single();

    if (errUpdF) {
      console.error("Renombre: histórico actualizado pero finca falló:", errUpdF);
      return res.status(500).json({
        error: "Se actualizó el histórico, pero falló actualizar la finca. Revisa duplicados o permisos.",
      });
    }

    return res.json({
      ok: true,
      finca: fincaUpd,
      updatedHistorico: count || 0,
    });
  } catch (err) {
    console.error("Error al renombrar finca:", err);
    res.status(500).json({ error: "Error al renombrar la finca." });
  }
});

app.delete("/api/fincas/:id", requireAuthApi, async (req, res) => {
  const fincaId = Number(req.params.id);
  const cascade = req.query.cascade === "1" || req.query.cascade === "true";

  if (!Number.isFinite(fincaId) || fincaId <= 0) {
    return res.status(400).json({ error: "ID de finca inválido." });
  }

  if (!cascade) {
    return res.status(400).json({
      error: "Para eliminar fincas debes confirmar cascada con ?cascade=1",
    });
  }

  try {
    const { data: finca, error: errGet } = await supabase
      .from("Fincas")
      .select("id, Indicativo")
      .eq("id", fincaId)
      .single();

    if (errGet && errGet.code === "PGRST116") return res.status(404).json({ error: "Finca no encontrada." });
    if (errGet) throw errGet;

    const indicativo = (finca?.Indicativo ?? "").toString();
    if (!indicativo) return res.status(500).json({ error: "Finca inválida." });

    if (indicativo === "...") {
      return res.status(403).json({ error: 'No se puede eliminar la finca "...".' });
    }

    const { error: errDelHist, count: delCount } = await supabase
      .from("historicoiys")
      .delete()
      .eq("Finca", indicativo)
      .select("*", { count: "exact", head: true });

    if (errDelHist) throw errDelHist;

    const { error: errDelF } = await supabase.from("Fincas").delete().eq("id", fincaId);
    if (errDelF) throw errDelF;

    return res.json({
      ok: true,
      deletedHistorico: delCount || 0,
      deletedFinca: { id: fincaId, Indicativo: indicativo },
    });
  } catch (err) {
    console.error("Error al eliminar finca (cascada):", err);
    res.status(500).json({ error: "Error al eliminar la finca." });
  }
});

// ==============================
// API HISTÓRICO (protegido)
// ==============================
app.get("/api/historicoiys", requireAuthApi, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("historicoiys")
      .select("*")
      .order("FechaIngreso", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Error al obtener historicoiys:", err);
    res.status(500).json({ error: "Error al obtener datos" });
  }
});

app.get("/api/historicoiys/:numero", requireAuthApi, async (req, res) => {
  const { numero } = req.params;

  try {
    const { data, error } = await supabase
      .from("historicoiys")
      .select("*")
      .eq("Numero", numero)
      .single();

    if (error && error.code === "PGRST116") return res.status(404).json({ error: "Registro no encontrado." });
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error al obtener registro:", err);
    res.status(500).json({ error: "Error al obtener el registro." });
  }
});

app.post("/api/ingresos", requireAuthApi, async (req, res) => {
  const body = req.body || {};

  if (!body.FechaIngreso || !body.Numero || !body.Sexo || !body.Edad) {
    return res.status(400).json({ error: "Faltan campos obligatorios para el ingreso." });
  }

  const insertData = {
    FechaIngreso: body.FechaIngreso,
    Numero: body.Numero,
    Color: body.Color ?? null,
    Peso: body.Peso ?? 0,
    Sexo: body.Sexo,
    Edad: body.Edad,
    FechaSalida: null,
    PesoSalida: null,
    Marcallegada: body.Marcallegada ?? "",
    ValorKGingreso: body.ValorKGingreso ?? 0,
    ValorKGsalida: body.ValorKGsalida ?? null,
    Destino: body.Destino ?? "",
    Finca: body.Finca ?? "...",
    Raza: body.Raza ?? "...",
    Flete: body.Flete ?? 0,
    Comision: body.Comision ?? 0,
    Mermas: body.Mermas ?? 0,
    Proveedor: body.Proveedor ?? null,
    PesoFinca: body.PesoFinca ?? 0,
  };

  try {
    const { data, error } = await supabase
      .from("historicoiys")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Ya existe un registro con ese Número." });
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("Error al crear ingreso:", err);
    res.status(500).json({ error: "Error al crear el ingreso." });
  }
});

app.post("/api/salidas", requireAuthApi, async (req, res) => {
  const {
    Numero,
    FechaSalida,
    PesoSalida,
    PesoFinca,
    Destino,
    ValorKGsalida,
    Flete,
    Comision,
    Mermas,
  } = req.body || {};

  if (!Numero) return res.status(400).json({ error: "Falta el Número del animal." });

  if (!FechaSalida || PesoSalida === undefined || ValorKGsalida === undefined) {
    return res.status(400).json({
      error: "FechaSalida, PesoSalida y ValorKGsalida son obligatorios.",
    });
  }

  try {
    const { data: existente, error: errSel } = await supabase
      .from("historicoiys")
      .select("*")
      .eq("Numero", Numero)
      .single();

    if (errSel && errSel.code === "PGRST116") return res.status(404).json({ error: "Registro no encontrado." });
    if (errSel) throw errSel;

    const updateData = {
      FechaSalida,
      PesoSalida,
      PesoFinca: PesoFinca ?? existente.PesoFinca ?? 0,
      Destino: Destino ?? existente.Destino ?? "",
      ValorKGsalida: ValorKGsalida ?? existente.ValorKGsalida ?? 0,
      Flete: Flete ?? existente.Flete ?? 0,
      Comision: Comision ?? existente.Comision ?? 0,
      Mermas: Mermas ?? existente.Mermas ?? 0,
    };

    const { data, error } = await supabase
      .from("historicoiys")
      .update(updateData)
      .eq("Numero", Numero)
      .select("*")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error al registrar salida:", err);
    res.status(500).json({ error: "Error al registrar la salida." });
  }
});

app.put("/api/historicoiys/:numero", requireAuthApi, async (req, res) => {
  const { numero } = req.params;
  const body = req.body || {};

  const updateData = {
    FechaIngreso: body.FechaIngreso ?? null,
    Numero: body.Numero ?? numero,
    Color: body.Color ?? null,
    Peso: body.Peso ?? 0,
    Sexo: body.Sexo ?? "",
    Edad: body.Edad ?? "",
    FechaSalida: body.FechaSalida ?? null,
    PesoSalida: body.FechaSalida ? body.PesoSalida ?? 0 : null,
    Marcallegada: body.Marcallegada ?? "",
    ValorKGingreso: body.ValorKGingreso ?? 0,
    ValorKGsalida: body.ValorKGsalida ?? 0,
    Destino: body.Destino ?? "",
    Finca: body.Finca ?? "...",
    Raza: body.Raza ?? "...",
    Flete: body.Flete ?? 0,
    Comision: body.Comision ?? 0,
    Mermas: body.Mermas ?? 0,
    Proveedor: body.Proveedor ?? null,
    PesoFinca: body.PesoFinca ?? 0,
  };

  try {
    const { data, error } = await supabase
      .from("historicoiys")
      .update(updateData)
      .eq("Numero", numero)
      .select("*")
      .single();

    if (error && error.code === "PGRST116") return res.status(404).json({ error: "Registro no encontrado." });
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error al actualizar registro:", err);
    res.status(500).json({ error: "Error al actualizar el registro." });
  }
});

app.delete("/api/historicoiys/:numero", requireAuthApi, async (req, res) => {
  const { numero } = req.params;

  try {
    const { error } = await supabase.from("historicoiys").delete().eq("Numero", numero);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error("Error al eliminar registro:", err);
    res.status(500).json({ error: "Error al eliminar registro." });
  }
});

// ==============================
// ERROR HANDLER (para ver el error real en logs)
// ==============================
app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err);

  // Si es API, responde JSON
  if (req.path.startsWith("/api/")) {
    return res.status(500).json({ error: "Internal Server Error" });
  }

  // Si es página
  return res.status(500).send("Internal Server Error");
});

// ==============================
// ARRANCAR SERVIDOR
// ==============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Ganados escuchando en http://localhost:${PORT}/`);
});
