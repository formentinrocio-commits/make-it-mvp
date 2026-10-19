# Make It — MVP M4

## Qué incluye
- Registro/login por email + contraseña con Supabase Auth.
- Metas persistidas en `goals`.
- Plan mensual en `monthly_plans`.
- Aportes por meta/mes en `monthly_goal_allocations`.
- Octubre / Noviembre 2026.
- “Usar octubre como base”.
- Evaluación de compra.
- Ajuste sugerido automático: Baja → Media → Alta.
- Protegida nunca participa.
- Persistencia de decisiones en `purchase_decisions`.
- UI mobile-first inspirada en el Figma de Make It.

## 1. Conectar Supabase
Abrí `config.js`.

La URL del proyecto ya está puesta:
https://xvsrmhzeyrvjacmyumsc.supabase.co

Reemplazá:
PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE

por la Publishable key / anon public key de Supabase.

NUNCA uses service_role ni una secret key en el frontend.

## 2. Publicar gratis en Vercel
1. Crear un repositorio nuevo en GitHub.
2. Subir TODOS los archivos de esta carpeta a la raíz del repo.
3. Entrar a Vercel.
4. Add New → Project.
5. Importar el repo.
6. Deploy.

No necesitás Lovable para desplegar este proyecto.

## 3. Checklist M4
- Crear cuenta.
- Login.
- Configurar Octubre 2026.
- Crear una meta.
- Volver al Home y verla.
- Refrescar la página: la meta debe seguir.
- Evaluar una compra.
- Ver ajuste sugerido.
- Confirmar o elegir No comprar ahora.
- Probar Noviembre → Usar octubre como base.

## Tablas esperadas
- goals
- monthly_plans
- monthly_goal_allocations
- purchase_decisions
