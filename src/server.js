// src/server.js
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, validarUsuario } from './supabase.js';

dotenv.config();

// Resolver __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ====== CONFIG ANTI-CACHE (LOCAL / DEV) ======
app.set('etag', false);

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });
}

// ====== MIDDLEWARES ======
app.use(express.json());
app.use(
  express.static(path.join(__dirname, '../public'), {
    etag: false,
    lastModified: false,
    maxAge: 0,
  })
);

// ====== RUTAS DE PÁGINAS ESTÁTICAS ======

// Login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

// Nuevo ingreso
app.get('/ingreso', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'ingreso.html'));
});

// Nueva salida
app.get('/salida', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'salida.html'));
});

// Modificaciones
app.get('/modificaciones', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'modificaciones.html'));
});

// ====== LOGIN ======

app.post('/api/login', async (req, res) => {
  const { username, pin } = req.body || {};

  if (!username || !pin) {
    return res.status(400).json({ error: 'Faltan usuario o clave.' });
  }

  if (!/^\d{4}$/.test(pin)) {
    return res
      .status(400)
      .json({ error: 'La clave debe tener exactamente 4 dígitos numéricos.' });
  }

  try {
    const usuario = await validarUsuario(username, pin);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
    }

    return res.json({
      ok: true,
      usuario: { id: usuario.id, nombre: usuario.Nombre },
    });
  } catch (error) {
    console.error('Error al validar usuario en Supabase:', error);
    return res.status(500).json({
      error: 'Error al validar las credenciales contra la base de datos.',
    });
  }
});

// ====== API FINCAS ======
// Tabla: public."Fincas" (id, Indicativo unique)
// NOTA: historicoiys usa el texto en el campo Finca (Indicativo).

function normalizeIndicativo(v) {
  return (v ?? '').toString().trim().toUpperCase();
}

// Listar fincas (opcional: withCounts=1 -> incluye count asociados en historicoiys)
app.get('/api/fincas', async (req, res) => {
  const withCounts = req.query.withCounts === '1' || req.query.withCounts === 'true';

  try {
    const { data: fincas, error } = await supabase
      .from('Fincas')
      .select('id, Indicativo')
      .order('Indicativo', { ascending: true });

    if (error) throw error;

    if (!withCounts) {
      return res.json(fincas || []);
    }

    // Contar asociados desde node (suele ser ok con 2k registros)
    const { data: hist, error: errH } = await supabase
      .from('historicoiys')
      .select('Finca');

    if (errH) throw errH;

    const countsMap = new Map();
    (hist || []).forEach((r) => {
      const k = (r.Finca ?? '...').toString();
      countsMap.set(k, (countsMap.get(k) || 0) + 1);
    });

    const enriched = (fincas || []).map((f) => ({
      ...f,
      asociados: countsMap.get(f.Indicativo) || 0,
    }));

    return res.json(enriched);
  } catch (err) {
    console.error('Error al obtener fincas:', err);
    res.status(500).json({ error: 'Error al obtener fincas.' });
  }
});

// Crear finca
app.post('/api/fincas', async (req, res) => {
  const indicativo = normalizeIndicativo(req.body?.Indicativo);

  if (!indicativo) {
    return res.status(400).json({ error: 'El Indicativo es obligatorio.' });
  }

  if (indicativo.length > 80) {
    return res
      .status(400)
      .json({ error: 'El Indicativo no puede superar 80 caracteres.' });
  }

  try {
    const { data, error } = await supabase
      .from('Fincas')
      .insert({ Indicativo: indicativo })
      .select('id, Indicativo')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Esa finca ya existe.' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error al crear finca:', err);
    res.status(500).json({ error: 'Error al crear la finca.' });
  }
});

// Renombrar finca + actualizar historicoiys.Finca (todos los asociados)
// Body: { Indicativo: "NUEVO" }
app.put('/api/fincas/:id', async (req, res) => {
  const fincaId = Number(req.params.id);
  const nuevo = normalizeIndicativo(req.body?.Indicativo);

  if (!Number.isFinite(fincaId) || fincaId <= 0) {
    return res.status(400).json({ error: 'ID de finca inválido.' });
  }

  if (!nuevo) {
    return res.status(400).json({ error: 'El Indicativo es obligatorio.' });
  }

  if (nuevo.length > 80) {
    return res
      .status(400)
      .json({ error: 'El Indicativo no puede superar 80 caracteres.' });
  }

  try {
    // 1) finca actual
    const { data: actual, error: errGet } = await supabase
      .from('Fincas')
      .select('id, Indicativo')
      .eq('id', fincaId)
      .single();

    if (errGet && errGet.code === 'PGRST116') {
      return res.status(404).json({ error: 'Finca no encontrada.' });
    }
    if (errGet) throw errGet;

    const viejo = (actual?.Indicativo ?? '').toString();
    if (!viejo) {
      return res.status(500).json({ error: 'Finca inválida.' });
    }

    if (viejo === nuevo) {
      return res.json({
        ok: true,
        finca: { id: fincaId, Indicativo: viejo },
        updatedHistorico: 0,
        message: 'Sin cambios.',
      });
    }

    // 2) prevenir duplicado antes de tocar historico
    const { data: existeNuevo, error: errExists } = await supabase
      .from('Fincas')
      .select('id')
      .eq('Indicativo', nuevo)
      .maybeSingle();

    if (errExists) throw errExists;
    if (existeNuevo?.id && Number(existeNuevo.id) !== fincaId) {
      return res.status(409).json({ error: 'Ya existe una finca con ese nombre.' });
    }

    // 3) actualizar historico primero (si falla, no tocamos tabla Fincas)
    const { error: errUpdHist, count } = await supabase
      .from('historicoiys')
      .update({ Finca: nuevo })
      .eq('Finca', viejo)
      .select('*', { count: 'exact', head: true });

    if (errUpdHist) throw errUpdHist;

    // 4) actualizar finca
    const { data: fincaUpd, error: errUpdF } = await supabase
      .from('Fincas')
      .update({ Indicativo: nuevo })
      .eq('id', fincaId)
      .select('id, Indicativo')
      .single();

    if (errUpdF) {
      // Sin transacción real; si esto falla, el histórico quedó con nuevo.
      // Igual reportamos el error para que puedas corregir manualmente.
      console.error('Renombre: histórico actualizado pero finca falló:', errUpdF);
      return res.status(500).json({
        error:
          'Se actualizó el histórico, pero falló actualizar la finca. Revisa duplicados o permisos.',
      });
    }

    return res.json({
      ok: true,
      finca: fincaUpd,
      updatedHistorico: count || 0,
    });
  } catch (err) {
    console.error('Error al renombrar finca:', err);
    res.status(500).json({ error: 'Error al renombrar la finca.' });
  }
});

// Eliminar finca con cascada (requiere ?cascade=1)
// 1) Borra historicoiys donde Finca == Indicativo
// 2) Borra la finca
app.delete('/api/fincas/:id', async (req, res) => {
  const fincaId = Number(req.params.id);
  const cascade = req.query.cascade === '1' || req.query.cascade === 'true';

  if (!Number.isFinite(fincaId) || fincaId <= 0) {
    return res.status(400).json({ error: 'ID de finca inválido.' });
  }

  if (!cascade) {
    return res.status(400).json({
      error: 'Para eliminar fincas debes confirmar cascada con ?cascade=1',
    });
  }

  try {
    const { data: finca, error: errGet } = await supabase
      .from('Fincas')
      .select('id, Indicativo')
      .eq('id', fincaId)
      .single();

    if (errGet && errGet.code === 'PGRST116') {
      return res.status(404).json({ error: 'Finca no encontrada.' });
    }
    if (errGet) throw errGet;

    const indicativo = (finca?.Indicativo ?? '').toString();
    if (!indicativo) return res.status(500).json({ error: 'Finca inválida.' });

    // evita borrar el placeholder
    if (indicativo === '...') {
      return res.status(403).json({ error: 'No se puede eliminar la finca "...".' });
    }

    // 1) borrar historico asociado
    const { error: errDelHist, count: delCount } = await supabase
      .from('historicoiys')
      .delete()
      .eq('Finca', indicativo)
      .select('*', { count: 'exact', head: true });

    if (errDelHist) throw errDelHist;

    // 2) borrar finca
    const { error: errDelF } = await supabase.from('Fincas').delete().eq('id', fincaId);
    if (errDelF) throw errDelF;

    return res.json({
      ok: true,
      deletedHistorico: delCount || 0,
      deletedFinca: { id: fincaId, Indicativo: indicativo },
    });
  } catch (err) {
    console.error('Error al eliminar finca (cascada):', err);
    res.status(500).json({ error: 'Error al eliminar la finca.' });
  }
});

// ====== API HISTÓRICO IYS ======
// Tabla: public.historicoiys

app.get('/api/historicoiys', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('historicoiys')
      .select('*')
      .order('FechaIngreso', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error al obtener historicoiys:', err);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.get('/api/historicoiys/:numero', async (req, res) => {
  const { numero } = req.params;

  try {
    const { data, error } = await supabase
      .from('historicoiys')
      .select('*')
      .eq('Numero', numero)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error al obtener registro:', err);
    res.status(500).json({ error: 'Error al obtener el registro.' });
  }
});

app.post('/api/ingresos', async (req, res) => {
  const body = req.body || {};

  if (!body.FechaIngreso || !body.Numero || !body.Sexo || !body.Edad) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios para el ingreso.',
    });
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
    Marcallegada: body.Marcallegada ?? '',
    ValorKGingreso: body.ValorKGingreso ?? 0,
    ValorKGsalida: body.ValorKGsalida ?? null,
    Destino: body.Destino ?? '',
    Finca: body.Finca ?? '...',
    Raza: body.Raza ?? '...',
    Flete: body.Flete ?? 0,
    Comision: body.Comision ?? 0,
    Mermas: body.Mermas ?? 0,
    Proveedor: body.Proveedor ?? null,
    PesoFinca: body.PesoFinca ?? 0,
  };

  try {
    const { data, error } = await supabase
      .from('historicoiys')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Ya existe un registro con ese Número.',
        });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error al crear ingreso:', err);
    res.status(500).json({ error: 'Error al crear el ingreso.' });
  }
});

app.post('/api/salidas', async (req, res) => {
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

  if (!Numero) {
    return res.status(400).json({ error: 'Falta el Número del animal.' });
  }

  if (!FechaSalida || PesoSalida === undefined || ValorKGsalida === undefined) {
    return res.status(400).json({
      error: 'FechaSalida, PesoSalida y ValorKGsalida son obligatorios.',
    });
  }

  try {
    const { data: existente, error: errSel } = await supabase
      .from('historicoiys')
      .select('*')
      .eq('Numero', Numero)
      .single();

    if (errSel && errSel.code === 'PGRST116') {
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }
    if (errSel) throw errSel;

    const updateData = {
      FechaSalida,
      PesoSalida,
      PesoFinca: PesoFinca ?? existente.PesoFinca ?? 0,
      Destino: Destino ?? existente.Destino ?? '',
      ValorKGsalida: ValorKGsalida ?? existente.ValorKGsalida ?? 0,
      Flete: Flete ?? existente.Flete ?? 0,
      Comision: Comision ?? existente.Comision ?? 0,
      Mermas: Mermas ?? existente.Mermas ?? 0,
    };

    const { data, error } = await supabase
      .from('historicoiys')
      .update(updateData)
      .eq('Numero', Numero)
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error al registrar salida:', err);
    res.status(500).json({ error: 'Error al registrar la salida.' });
  }
});

app.put('/api/historicoiys/:numero', async (req, res) => {
  const { numero } = req.params;
  const body = req.body || {};

  const updateData = {
    FechaIngreso: body.FechaIngreso ?? null,
    Numero: body.Numero ?? numero,
    Color: body.Color ?? null,
    Peso: body.Peso ?? 0,
    Sexo: body.Sexo ?? '',
    Edad: body.Edad ?? '',
    FechaSalida: body.FechaSalida ?? null,
    PesoSalida: body.FechaSalida ? body.PesoSalida ?? 0 : null,
    Marcallegada: body.Marcallegada ?? '',
    ValorKGingreso: body.ValorKGingreso ?? 0,
    ValorKGsalida: body.ValorKGsalida ?? 0,
    Destino: body.Destino ?? '',
    Finca: body.Finca ?? '...',
    Raza: body.Raza ?? '...',
    Flete: body.Flete ?? 0,
    Comision: body.Comision ?? 0,
    Mermas: body.Mermas ?? 0,
    Proveedor: body.Proveedor ?? null,
    PesoFinca: body.PesoFinca ?? 0,
  };

  try {
    const { data, error } = await supabase
      .from('historicoiys')
      .update(updateData)
      .eq('Numero', numero)
      .select('*')
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error al actualizar registro:', err);
    res.status(500).json({ error: 'Error al actualizar el registro.' });
  }
});

app.delete('/api/historicoiys/:numero', async (req, res) => {
  const { numero } = req.params;

  try {
    const { error } = await supabase
      .from('historicoiys')
      .delete()
      .eq('Numero', numero);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar registro:', err);
    res.status(500).json({ error: 'Error al eliminar registro.' });
  }
});

// ====== ARRANCAR SERVIDOR ======
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ganados escuchando en http://localhost:${PORT}/`);
});
