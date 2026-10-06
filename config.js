// ============================================================
// CONFIGURACIÓN DEL PROYECTO — edita solo este archivo.
// Este proyecto es HTML/JS estático (sin Vite ni build), por eso las
// variables van aquí y no en un archivo .env. Ver README.md, sección
// "Variables que debo configurar".
//
// Estas 3 claves son PÚBLICAS por diseño (se envían al navegador):
//   - SUPABASE_ANON_KEY (a veces llamada "publishable key")
//   - VAPID_PUBLIC_KEY
// Nunca pongas aquí la service_role key ni la VAPID_PRIVATE_KEY.
// ============================================================
window.HORARIO_CONFIG = {
  // Supabase → Project Settings → API → Project URL
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',

  // Supabase → Project Settings → API Keys → "anon" (o "Publishable key")
  SUPABASE_ANON_KEY: 'TU_ANON_O_PUBLISHABLE_KEY',

  // Llave pública VAPID para las notificaciones push
  // (la genera: npx web-push generate-vapid-keys)
  VAPID_PUBLIC_KEY: 'TU_VAPID_PUBLIC_KEY'
};
