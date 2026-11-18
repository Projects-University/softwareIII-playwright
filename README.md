# Automatización de Pruebas E2E con Playwright - Ghost CMS

Este proyecto contiene la suite de pruebas automatizadas End-to-End (E2E) desarrollada con **Playwright** y **TypeScript** para validar los flujos principales de autenticación y gestión de publicaciones sobre **Ghost CMS**.

---

## 1. Aplicación Bajo Prueba

- **Aplicación:** Ghost v6.69.0 (ejecutándose en contenedores locales de Docker).
- **URL Base (Sitio Público):** `http://localhost:2368`
- **Panel Administrativo:** `http://localhost:2368/ghost/#/signin`
- **Propósito de la automatización:** Validar de forma rápida, repetible y confiable los flujos críticos de acceso al panel de administración (login válido e inválido) y el ciclo de vida de las publicaciones (creación de borradores y publicación visible en el blog público), generando evidencias automáticas (videos, trazas y capturas en caso de fallo).

---

## 2. Flujos y Casos de Prueba Automatizados

Las pruebas siguen la estructura estándar de Playwright directamente en la carpeta `./tests/`:

### A. Autenticación (`tests/login.spec.ts`)
- **`CP-01 Login exitoso con credenciales válidas`**:
  - Navega a `/ghost/#/signin`, ingresa las credenciales del usuario Staff (`owner@ghost.test` / `Calidad.2026*Qa`) y envía el formulario.
  - Verifica con `expect` la redirección efectiva al panel administrativo (`/ghost/#/analytics` o `/ghost/#/dashboard`) y la visibilidad del menú lateral (`Posts`).
- **`CP-02 Login fallido con contraseña incorrecta`**:
  - Intenta iniciar sesión con una contraseña inválida para el usuario `owner@ghost.test`.
  - Verifica con `expect` que se despliegue el mensaje de error `Your password is incorrect.`, que el botón cambie a `Retry` y que el usuario permanezca en `/ghost/#/signin` sin acceso al panel.

### B. Gestión de Publicaciones (`tests/posts.spec.ts`)
Incluye un bloque `test.beforeEach` para autenticar al usuario Staff antes de cada escenario.
- **`CP-03 Crear y publicar un post`**:
  - Navega al listado de `Posts`, inicia la creación de un nuevo post (`New post`), ingresa un título y cuerpo únicos (con marca de tiempo) y ejecuta el flujo completo de publicación (`Publish` → `Continue, final review` → `Publish post, right now`).
  - Navega al sitio público (`/`) y verifica con `expect` que el título del post recién publicado esté visible en la portada del blog.
- **`CP-04 Guardar un post como borrador`**:
  - Crea un nuevo post con título y contenido únicos sin publicarlo, esperando la confirmación de autoguardado (`- Saved`).
  - Regresa al listado administrativo de `Posts` (`/ghost/#/posts`) y verifica con `expect` que el post aparezca listado con el estado `Draft`.

---

## 3. Requisitos y Ejecución de las Pruebas

### Prerrequisitos
1. Tener el entorno Docker de Ghost activo y respondiendo en `http://localhost:2368`.
2. Contar con **Node.js** instalado.
3. Disponer del archivo `.env` en `./playwright/.env` con las variables `GHOST_USER` y `GHOST_PASSWORD` (cargadas automáticamente mediante `dotenv`).

### Comandos de ejecución
Ubicado dentro de la carpeta `./playwright/`:

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Ejecutar todas las pruebas (en Chromium):**
   ```bash
   npx playwright test
   ```

3. **Visualizar el reporte HTML interactivo (con videos y traces):**
   ```bash
   npx playwright show-report
   ```

---

## 4. Dificultades Encontradas y Soluciones Aplicadas

1. **Editor de contenido enriquecido basado en Lexical (`contenteditable`):**
   - **Dificultad:** El cuerpo del post en Ghost v6.69.0 no es un `<textarea>` ni un `<input>` tradicional, sino un contenedor enriquecido Lexical (`<div contenteditable="true" role="textbox" data-lexical-editor="true">`) cuyos identificadores internos de Ember (`#ember...`) son dinámicos.Además, el botón `Publish` y el autoguardado no se activan hasta que el campo del título pierde el foco o se interactúa con el editor de cuerpo.
   - **Solución:** Se utilizó `getByPlaceholder('Post title')` para el título y el selector estable `[data-lexical-editor="true"]` haciendo `.click()` seguido de `page.keyboard.type(...)` para simular la escritura real del usuario, disparar el evento de guardado en segundo plano y habilitar la barra de publicación.

2. **Redirección post-login en Ghost v6.69.0:**
   - **Dificultad:** Al iniciar sesión en Ghost v6.69.0, la aplicación pasa brevemente por `/ghost/#/` y redirige por defecto a `/ghost/#/analytics` en lugar de mantener una ruta fija como `/ghost/#/dashboard`.
   - **Solución:** Se utilizó una expresión regular en `expect(page).toHaveURL(/\/ghost\/#\/(dashboard|analytics|posts)/)` acompañada de la validación explícita de visibilidad del enlace de navegación `Posts` (`getByRole('link', { name: 'Posts', exact: true })`).

3. **Animación CSS infinita en el botón de confirmación de publicación (`.gh-btn-pulse`):**
   - **Dificultad:** En el modal final de publicación, el botón `Publish post, right now` posee la clase `.gh-btn-pulse`, la cual aplica una animación CSS continua (`transform: scale(...)`). Debido a esto, la verificación de estabilidad geométrica de Playwright (`waiting for element to be visible, enabled and stable`) detecta movimiento constante y reintenta el clic hasta agotar el timeout.
   - **Solución:** Se verificó primero que el botón estuviera visible (`await expect(confirmPublishBtn).toBeVisible()`) y posteriormente se accionó con `await confirmPublishBtn.click({ force: true })`.

4. **Sincronización del autoguardado en borradores (`CP-04`):**
   - **Dificultad:** Si se abandona el editor inmediatamente después de escribir sin esperar a que Ghost registre el post en el backend y asigne su identificador en la URL (`/ghost/#/editor/post/<id>`), el borrador puede no haberse persistido aún al volver al listado.
   - **Solución:** Se añadió una espera explícita sobre la URL del editor (`await expect(page).toHaveURL(/\/ghost\/#\/editor\/post\/[a-f0-9]+/)`) antes de regresar al listado de publicaciones.

5. **Colisión de sesiones concurrentes sobre el mismo usuario Staff:**
   - **Dificultad:** Al ejecutar múltiples workers en paralelo autenticándose exactamente en el mismo milisegundo con la cuenta `owner@ghost.test`, el endpoint `/ghost/api/admin/session` de Ghost devuelve `Unknown error` por contención de sesiones concurrentes.
   - **Solución:** Se configuró `fullyParallel: false` y `workers: 1` en `playwright.config.ts` para ejecutar los flujos E2E de manera secuencial y determinista.

