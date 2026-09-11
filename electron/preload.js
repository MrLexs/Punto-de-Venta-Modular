const { contextBridge, ipcRenderer } = require('electron');

// 1. Definimos todas las funciones base de forma plana
const api = {
  // Catálogo y control de módulos
  modulosCatalogo: () => ipcRenderer.invoke('modulos:catalogo'),
  obtenerCatalogoModulos: () => ipcRenderer.invoke('modulos:catalogo'),
  
  modulosActivos: () => ipcRenderer.invoke('modulos:activos'),
  obtenerModulosActivos: () => ipcRenderer.invoke('modulos:activos'),
  
  activarModulo: (idModulo) => ipcRenderer.invoke('modulos:activar', idModulo),
  desactivarModulo: (idModulo) => ipcRenderer.invoke('modulos:desactivar', idModulo),

  // Base de datos genérica
  consultaDB: (sql, params) => ipcRenderer.invoke('db:consulta', { sql, params }),

  // Autenticación
  iniciarSesion: (pin) => ipcRenderer.invoke('auth:iniciarSesion', pin),

  // Administración (Usuarios, Roles y Permisos)
  listarUsuarios: () => ipcRenderer.invoke('admin:listarUsuarios'),
  obtenerUsuarios: () => ipcRenderer.invoke('admin:listarUsuarios'),
  crearUsuario: (datos) => ipcRenderer.invoke('admin:crearUsuario', datos),
  cambiarActivoUsuario: (idUsuario, activo) => ipcRenderer.invoke('admin:cambiarActivoUsuario', { idUsuario, activo }),
  
  listarRoles: () => ipcRenderer.invoke('admin:listarRoles'),
  obtenerRoles: () => ipcRenderer.invoke('admin:listarRoles'),
  crearRol: (nombre) => ipcRenderer.invoke('admin:crearRol', nombre),
  
  listarPermisosDeRol: (idRol) => ipcRenderer.invoke('admin:listarPermisosDeRol', idRol),
  obtenerPermisosDeRol: (idRol) => ipcRenderer.invoke('admin:listarPermisosDeRol', idRol),
  asignarPermiso: (idRol, idModulo, nivel) => ipcRenderer.invoke('admin:asignarPermiso', { idRol, idModulo, nivel }),
  
  mapaDeAccesos: (idRol, idsModulos) => ipcRenderer.invoke('admin:mapaDeAccesos', { idRol, idsModulos }),
  obtenerMapaDeAccesos: (idRol, idsModulos) => ipcRenderer.invoke('admin:mapaDeAccesos', { idRol, idsModulos }),

  // Exportación a PDF para la USB
  guardarPDF: (datosCorte, listaProductos) => ipcRenderer.invoke('solicitar-guardar-pdf', datosCorte, listaProductos)
};

// 2. Añadimos namespaces anidados por si App.jsx los llama como window.pos.admin.mapaDeAccesos
api.admin = {
  listarUsuarios: api.listarUsuarios,
  crearUsuario: api.crearUsuario,
  cambiarActivoUsuario: api.cambiarActivoUsuario,
  listarRoles: api.listarRoles,
  crearRol: api.crearRol,
  listarPermisosDeRol: api.listarPermisosDeRol,
  asignarPermiso: api.asignarPermiso,
  mapaDeAccesos: api.mapaDeAccesos,
  obtenerMapaDeAccesos: api.obtenerMapaDeAccesos
};

api.modulos = {
  catalogo: api.modulosCatalogo,
  activos: api.modulosActivos,
  activar: api.activarModulo,
  desactivar: api.desactivarModulo
};

// 3. Exponemos el objeto completo al mundo global de React
contextBridge.exposeInMainWorld('pos', api);