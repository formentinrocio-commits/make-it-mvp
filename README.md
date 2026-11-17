# Make It! — prototipo web (Etapa 4)

Prototipo navegable, lo más fiel posible a iOS, con backend real en Supabase.

- React 19 + Vite + TypeScript, sin librerías de UI: todo el diseño sale del canvas de Claude Design.
- Supabase: cuentas (email y contraseña) y datos en tablas `mi_*` con RLS (cada usuario ve solo lo suyo).
- La IA de "To make it or not to make it" es guionada: arma las respuestas con los números reales del usuario, sin modelo detrás.
- Se instala en el iPhone como app (Compartir → Agregar a inicio) y abre a pantalla completa.

## Puesta en marcha

1. Supabase → SQL Editor → pegar `supabase/schema.sql` → Run.
2. Supabase → Authentication → Sign In / Providers → Email: desactivar "Confirm email" para la demo (si queda activo, la app pide confirmar el mail antes de entrar).
3. `npm install` y `npm run dev`.

## Publicación

Al subir a `main`, `.github/workflows/pages.yml` construye y publica en GitHub Pages
(Settings → Pages → Source: GitHub Actions). Usa rutas con `#`, así que funciona con cualquier nombre de repo.
