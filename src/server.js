import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde .env
dotenv.config();

// Crear instancia de Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middlewares
app.use(express.json());

// Ruta básica para probar
app.get('/', (req, res) => {
  res.send('Servidor Node + Express + Supabase está vivo ✅');
});

// Ejemplo de ruta que consulta Supabase (ajusta el nombre de la tabla)
app.get('/ejemplo', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tu_tabla')
      .select('*')
      .limit(10);

    if (error) {
      console.error('Error en Supabase:', error);
      return res.status(500).json({ error: 'Error al consultar Supabase' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error en el servidor:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
