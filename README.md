# POS Modular

Cascarón de un punto de venta genérico para escritorio. La idea: un núcleo mínimo
(login del negocio, base de datos local, galería) y módulos independientes que se
activan o desactivan sin tocar el resto del sistema — Inventario, Delivery, Checador
de precios, etc.

No usa servidores ni bases de datos remotas: todo vive en un archivo SQLite local,
junto a la app, en la carpeta de datos del usuario.

## Cómo correrlo

Necesitas [Node.js](https://nodejs.org) instalado (v18 o más nuevo).

```bash
npm install
npm run dev
```

Esto abre Vite (la interfaz) y Electron (la ventana de escritorio) al mismo tiempo.

Para generar el instalable de escritorio:

```bash
npm run dist
```

El instalable queda en la carpeta `release/`.

## Cómo está organizado

```
electron/          # El "backend" de escritorio: ventana, base de datos, IPC
  main.js
  preload.js
  db.js             # Núcleo: tabla de negocio y de módulos activos
  moduleLoader.js    # Lee module.json de cada carpeta en src/modules

src/
  core/              # El shell de la app: barra lateral, galería, registro de módulos
  modules/           # Un módulo = una carpeta aquí
    checador-precios/   # Módulo de ejemplo, ya funcional
    _plantilla/          # Cópiala para crear un módulo nuevo
```

## Multiusuario y permisos por rol

El núcleo ahora pide iniciar sesión con un PIN numérico antes de mostrar nada.

- **Usuario de fábrica**: `Admin`, PIN `1234`. Cámbialo desde Administración en
  cuanto entren por primera vez (o crea un usuario nuevo y deshabilita este).
- **Roles**: `Administrador` (acceso total automático a todo, no se configura) y
  `Cajero` (arranca sin permisos — hay que dárselos módulo por módulo).
- **Niveles por módulo**: `ninguno`, `ver`, `editar`. Un módulo activo solo
  aparece en la barra lateral del usuario si su rol tiene al menos `ver`.
- **Panel de Administración** (solo visible para el rol Administrador): crear
  usuarios, deshabilitarlos, crear roles nuevos, y asignar el nivel de cada rol
  sobre cada módulo.

### Cómo un módulo usa el nivel de acceso

Dentro de cualquier `index.jsx` de un módulo:

```jsx
import { useNivelAcceso } from '../../core/ContextoAcceso.jsx';

export default function MiModulo() {
  const nivel = useNivelAcceso(); // 'ver' o 'editar'
  const puedeEditar = nivel === 'editar';

  return (
    <div className="panel-modulo">
      {puedeEditar && <button>Guardar cambios</button>}
    </div>
  );
}
```

El núcleo ya garantiza que el componente del módulo solo se monta si el usuario
tiene al menos `ver` — dentro del módulo solo hace falta decidir qué ocultar
cuando el nivel no llega a `editar`. Mira `src/modules/checador-precios/index.jsx`
para un ejemplo real (oculta el formulario de agregar producto si es `ver`).

## Cómo agregar un módulo nuevo

1. Copia la carpeta `src/modules/_plantilla` y renómbrala (ej. `src/modules/inventario`).
2. Edita `module.json`: nombre, descripción, ícono (usa nombres de
   [Tabler Icons](https://tabler.io/icons), ej. `"ti-package"`).
3. Si tu módulo necesita guardar datos, define sus tablas en `schema.sql`.
   Usa un prefijo único para tus tablas (ej. `inv_productos`, `inv_movimientos`)
   para que nunca choquen con las de otro módulo.
4. Construye tu pantalla en `index.jsx`. Tienes disponible `window.pos.consultaDB(sql, params)`
   para leer/escribir en tus propias tablas — no necesitas importar nada más.
5. Corre `npm run dev`. Tu módulo aparece automáticamente en la galería, listo para
   activarse. No hay que registrar nada a mano en el núcleo.

## Por qué esta arquitectura

- **El núcleo nunca conoce el contenido de un módulo.** Solo sabe su id, nombre e
  ícono (desde `module.json`) y si está activo o no (tabla `modulos_activos`).
  Esto significa que puedes borrar un módulo entero sin romper nada más.
- **Activar un módulo corre su `schema.sql` una sola vez**, de forma automática.
  Desactivarlo solo lo oculta — tus datos siguen ahí si lo vuelves a activar.
- **Cada módulo es dueño de sus propias tablas.** No hay una tabla `productos`
  genérica compartida por todos; cada módulo prefija las suyas, evitando conflictos
  cuando dos negocios distintos activan combinaciones distintas de módulos.

## Siguientes pasos sugeridos

- Construir el módulo de Inventario (el checador de precios ya te da el patrón base).
- Agregar una pantalla de "ajustes del negocio" en el núcleo (editar nombre, logo).
- Si más adelante quieren sincronización entre dispositivos, el único lugar que
  cambia es `electron/db.js` — el resto de la app no necesita saber si los datos
  vienen de SQLite local o de un servidor.
