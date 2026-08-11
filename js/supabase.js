// 1. Importamos la función para crear el cliente desde el CDN oficial de Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ==========================================
// 2. TUS CREDENCIALES DE SUPABASE
// ==========================================
// Reemplaza el texto entre comillas con la URL de tu proyecto
const supabaseUrl = 'https://ppaqogaftvnaaorkhmwh.supabase.co';

// Reemplaza el texto entre comillas con tu clave anónima (anon public key)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYXFvZ2FmdHZuYWFvcmtobXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTk3MTYsImV4cCI6MjEwMjAzNTcxNn0.XcikZDSZLMeaLXSKhUJy0XTwBlEYzdyaRGjNlJwK3Ro';

// ==========================================
// 3. INICIALIZAR LA CONEXIÓN
// ==========================================
// Creamos el cliente y lo exportamos usando "export const" para usarlo en otros archivos
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Un mensaje de prueba para saber que el archivo cargó sin errores (el error 404 debería desaparecer)
console.log("El archivo supabase.js cargó y la conexión está lista.");