
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pos', {
  // --- Sistema de modulos ---
  obtenerCatalogoModulos: () => ipcRenderer.invoke('modulos:catalogo'),
  obtenerModulosActivos: () => ipcRenderer.invoke('modulos:activos'),
  activarModulo: (idModulo) => ipcRenderer.invoke('modulos:activar', idModulo),
  desactivarModulo: (idModulo) => ipcRenderer.invoke('modulos:desactivar', idModulo),

  // --- Acceso a datos (cada modulo lo usa para sus propias tablas) ---
  consultaDB: (sql, params = []) => ipcRenderer.invoke('db:consulta', { sql, params }),

  // --- Autenticacion ---
  iniciarSesion: (pin) => ipcRenderer.invoke('auth:iniciarSesion', pin),

  // --- Administracion (usuarios, roles, permisos) ---
  admin: {
    listarUsuarios: () => ipcRenderer.invoke('admin:listarUsuarios'),
    crearUsuario: (datos) => ipcRenderer.invoke('admin:crearUsuario', datos),
    cambiarActivoUsuario: (idUsuario, activo) =>
      ipcRenderer.invoke('admin:cambiarActivoUsuario', { idUsuario, activo }),
    listarRoles: () => ipcRenderer.invoke('admin:listarRoles'),
    crearRol: (nombre) => ipcRenderer.invoke('admin:crearRol', nombre),
    listarPermisosDeRol: (idRol) => ipcRenderer.invoke('admin:listarPermisosDeRol', idRol),
    asignarPermiso: (idRol, idModulo, nivel) =>
      ipcRenderer.invoke('admin:asignarPermiso', { idRol, idModulo, nivel }),
    mapaDeAccesos: (idRol, idsModulos) =>
      ipcRenderer.invoke('admin:mapaDeAccesos', { idRol, idsModulos }),
  },
});
