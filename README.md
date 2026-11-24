# Habitat · Demo pública

Interfaz de administración de conjuntos residenciales y apartamentos en arriendo, publicada con GitHub Pages.

La demo contiene únicamente datos ficticios. Cada visitante tiene una copia independiente en su navegador: los mensajes no llegan a otras personas, no hay cuentas reales, no se procesan cobros bancarios y no se crean invitaciones de acceso. No ingresar información sensible. El sistema con servidor, autenticación y base de datos se mantiene separado.

## Ver y compartir

El enlace de GitHub Pages se muestra en la sección **Deployments / github-pages** del repositorio después de una publicación exitosa. No requiere iniciar sesión.

Los cambios de interfaz publicados en `main` se despliegan automáticamente. Quien tenga el enlace puede recargar la página para ver la nueva versión. La demo no sincroniza entre visitantes los registros que cada uno crea durante sus pruebas.

## Desarrollo

```sh
npm ci
npm run dev
npm run build
```

Abrir la ruta `/habitat-apartamentos/` en el servidor local. Se requiere Node 22.

## Sincronizar desde la aplicación principal

Si el directorio hermano `../habitat-admin` está disponible, `npm run sync` copia su interfaz y estilos, aplicando las adaptaciones para la demo. El adaptador local `src/demo-api.ts` y sus datos ficticios se mantienen independientes.

Después de sincronizar: revisar cambios, ejecutar `npm run build`, confirmar el commit y subirlo a `main`. GitHub Actions construye y publica la demo; revisar el resultado antes de anunciar una actualización.

El botón de restablecer en el perfil reinicia los datos de prueba de ese navegador. Los datos de prueba no se envían a ningún servidor.
