import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initDatabase,
  listarModulosActivos,
  activarModulo,
  desactivarModulo,
  ejecutarConsulta,
  iniciarSesionPorPin,
  listarUsuarios,
  crearUsuario,
  cambiarActivoUsuario,
  listarRoles,
  crearRol,
  listarPermisosDeRol,
  asignarPermiso,
  mapaDeAccesos,
} from './db.js';
import { listarModulosDisponibles } from './moduleLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const esDev = !app.isPackaged;

let ventanaPrincipal;

function crearVentana() {
  ventanaPrincipal = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (esDev) {
    ventanaPrincipal.loadURL('http://localhost:5173');
    ventanaPrincipal.webContents.openDevTools();
  } else {
    ventanaPrincipal.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase(app.getPath('userData'));
  crearVentana();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- Puente entre el nucleo (React) y el sistema de archivos/BD ---

// Devuelve el catalogo de modulos que existen en /src/modules (esten activos o no)
ipcMain.handle('modulos:catalogo', () => listarModulosDisponibles());

// Devuelve solo los IDs de modulos que este negocio activo
ipcMain.handle('modulos:activos', () => listarModulosActivos());

// Activa un modulo: corre su schema.sql (si existe) y lo marca como activo
ipcMain.handle('modulos:activar', (_evento, idModulo) => activarModulo(idModulo));

// Desactiva un modulo (no borra sus datos, solo lo oculta del dashboard)
ipcMain.handle('modulos:desactivar', (_evento, idModulo) => desactivarModulo(idModulo));

// Consulta generica de solo lectura/escritura para que cada modulo use su propia tabla
ipcMain.handle('db:consulta', (_evento, { sql, params }) => ejecutarConsulta(sql, params));

// --- Autenticacion ---
ipcMain.handle('auth:iniciarSesion', (_evento, pin) => iniciarSesionPorPin(pin));

// --- Administracion: usuarios, roles y permisos ---
ipcMain.handle('admin:listarUsuarios', () => listarUsuarios());
ipcMain.handle('admin:crearUsuario', (_evento, datos) => crearUsuario(datos));
ipcMain.handle('admin:cambiarActivoUsuario', (_evento, { idUsuario, activo }) =>
  cambiarActivoUsuario(idUsuario, activo)
);
ipcMain.handle('admin:listarRoles', () => listarRoles());
ipcMain.handle('admin:crearRol', (_evento, nombre) => crearRol(nombre));
ipcMain.handle('admin:listarPermisosDeRol', (_evento, idRol) => listarPermisosDeRol(idRol));
ipcMain.handle('admin:asignarPermiso', (_evento, { idRol, idModulo, nivel }) =>
  asignarPermiso(idRol, idModulo, nivel)
);
ipcMain.handle('admin:mapaDeAccesos', (_evento, { idRol, idsModulos }) =>
  mapaDeAccesos(idRol, idsModulos)
);
