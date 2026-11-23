# ctf-softec

Plataforma **Capture the Flag (CTF)** para organizar competencias de ciberseguridad. Los participantes exploran un entorno interactivo, resuelven retos en laboratorios simulados y envían sus *flags* para sumar puntos en la clasificación.

## Qué incluye

- **Participantes.** Escenario interactivo, catálogo de retos, envío de respuestas y seguimiento del progreso.
- **Competencia.** Validación de *flags* en el servidor, puntuación y clasificación.
- **Administración.** Gestión de participantes y seguimiento de la actividad de la competencia.

## Instalación

Necesitas **Node.js 22.12 o posterior**, **npm**, una base **PostgreSQL vacía en UTF-8** y **Nginx** para servir la interfaz y dirigir las solicitudes a la API.

```sh
git clone https://github.com/softec-apps/ctf-softec-limpio.git
cd ctf-softec-limpio
npm ci
```

Crea un archivo `.env` en la raíz con valores propios. Usa una contraseña de administración de al menos 16 caracteres y un secreto de *flags* aleatorio.

```dotenv
DATABASE_URL=postgresql://ctf:REEMPLAZAR@127.0.0.1:5432/ctf
APP_ORIGIN=http://localhost:8080
PORT=3001
ADMIN_ALIAS=admin
ADMIN_PASSWORD=REEMPLAZAR_CON_UNA_CONTRASENA_PRIVADA
REGISTRATION_CODE=REEMPLAZAR_CON_UN_CODIGO_PROPIO
FLAG_SECRET=REEMPLAZAR_CON_UN_SECRETO_ALEATORIO
NODE_ENV=development
```

Compila el frontend y la API, aplica las migraciones de una base nueva, carga el catálogo inicial y arranca la API.

```sh
npm run build
npm run db:migrate
npm run db:seed
npm start
```

Incorpora [nginx.conf](nginx.conf) a tu configuración de Nginx y cambia la directiva `root` por la ruta absoluta a `apps/web/dist`. Abre `http://localhost:8080`. Si cambias el puerto de la API, actualiza también las directivas `proxy_pass`. Para servir la plataforma por HTTPS, usa el origen HTTPS correspondiente en `APP_ORIGIN` y configura `NODE_ENV=production`.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `apps/web/src/` | Código fuente de la interfaz web |
| `apps/web/public/` | Recursos visuales de la interfaz |
| `apps/api/src/` | Código fuente de la API NestJS y lógica de la competencia |
| `apps/api/assets/` | Archivos de los retos |
| `apps/api/prisma/` | Esquema y migraciones de PostgreSQL |
| `packages/` | Módulos compartidos |
| `tests/` | Pruebas del proyecto |

## Licencia

El código propio de **ctf-softec** usa la licencia **BSD Zero Clause (0BSD)**. Permite usarlo, modificarlo y redistribuirlo, también para fines comerciales y sin exigir atribución. Las dependencias y los recursos de terceros conservan sus licencias. [Licencia del proyecto](LICENSE) · [Avisos de terceros](THIRD_PARTY_NOTICES.md)
