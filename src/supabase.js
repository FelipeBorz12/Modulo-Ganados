// src/supabase.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ROL_KEY = process.env.SUPABASE_ROL_KEY;

// Pequeña ayuda por consola si falta algo
if (!SUPABASE_URL || !SUPABASE_ROL_KEY) {
  console.warn(
    '[supabase.js] Faltan SUPABASE_URL o SUPABASE_ROL_KEY en el .env'
  );
}

// Cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ROL_KEY);

/**
 * Valida usuario contra la tabla public."Usuarios"
 * Estructura:
 *  id bigserial
 *  "Nombre" varchar NOT NULL
 *  "Clave"  varchar NOT NULL
 */
export async function validarUsuario(nombre, clave) {
  // nombre = usuario, clave = pin (4 dígitos)
  const { data, error } = await supabase
    .from('Usuarios')
    .select('id, "Nombre", "Clave"')
    .eq('Nombre', nombre)
    .eq('Clave', clave)
    .limit(1);

  if (error) {
    // Si es error de "no rows" igual tratamos como usuario no encontrado,
    // pero Supabase ya devuelve data = [] en ese caso normalmente.
    console.error('[validarUsuario] Error al consultar Supabase:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    // No hay coincidencias
    return null;
  }

  return data[0];
}
