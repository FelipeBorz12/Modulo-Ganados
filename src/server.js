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

// ====== MIDDLEWARES ======
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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

// ====== API HISTÓRICO IYS ======
// Tabla: public.historicoiys

// Obtener todos los registros
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

// Obtener un registro por Número
app.get('/api/historicoiys/:numero', async (req, res) => {
  const { numero } = req.params;

  try {
    const { data, error } = await supabase
      .from('historicoiys')
      .select('*')
      .eq('Numero', numero)
      .single();

    if (error && error.code === 'PGRST116') {
      // not found
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error al obtener registro:', err);
    res.status(500).json({ error: 'Error al obtener el registro.' });
  }
});

// Crear un nuevo INGRESO
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
      // clave duplicada por Numero
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

// Registrar SALIDA (solo campos de salida)
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
    // Verificar que exista
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

// Modificar TODOS los campos de un registro
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

// Eliminar registro
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
    res.status(500).json({ error: 'Error al eliminar el registro.' });
  }
});

// ====== ARRANCAR SERVIDOR ======
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en ${PORT}`);
});
