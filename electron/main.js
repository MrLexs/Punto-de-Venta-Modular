import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
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
      // Usamos app.getAppPath() para asegurar que encuentre el archivo raíz sin importar el entorno
      preload: path.join(app.getAppPath(), 'electron', 'preload.js'),
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

// --- Exportación a PDF para la USB de los vendedores ---
ipcMain.handle('solicitar-guardar-pdf', async (event, datosCorte = {}, listaProductos = []) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    
    // Aseguramos valores por defecto si alguna propiedad viene vacía/indefinida
    const fechaCorteStr = datosCorte.fecha_corte || 'Turno Actual en Proceso';
    const totalTicketsVal = datosCorte.total_tickets !== undefined ? datosCorte.total_tickets : 0;
    const ingresoTotalVal = datosCorte.ingreso_total !== undefined ? datosCorte.ingreso_total : 0;
    
    // 1. Crear una ventana de fondo oculta para renderizar el reporte
    const ventanaOculta = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    // 2. Construir el HTML del reporte de manera limpia
    const htmlContenido = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Reporte de Corte de Caja</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
            h2, h3 { text-align: center; margin: 0 0 10px 0; color: #111; }
            .info { margin-bottom: 25px; font-size: 14px; border-bottom: 2px solid #eee; padding-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f4f4f4; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-box { margin-top: 25px; text-align: right; font-size: 18px; font-weight: bold; color: #28a745; }
          </style>
        </head>
        <body>
          <h2>POS Modular - Reporte Oficial de Corte de Caja</h2>
          <div class="info">
            <p><strong>Identificador / Fecha del Corte:</strong> ${fechaCorteStr}</p>
            <p><strong>Total de Tickets Emitidos:</strong> ${totalTicketsVal}</p>
          </div>
          <h3>Desglose de Productos Desplazados (Almacén)</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-center">Cant. Vendida</th>
                <th class="text-right">Total Generado</th>
              </tr>
            </thead>
            <tbody>
              ${
                listaProductos.length === 0 
                  ? '<tr><td colspan="3" class="text-center">Sin productos registrados en este turno.</td></tr>' 
                  : listaProductos.map(p => `
                    <tr>
                      <td>${p.nombre_producto}</td>
                      <td class="text-center">${p.total_vendidos} un.</td>
                      <td class="text-right">$${Number(p.total_generado).toFixed(2)}</td>
                    </tr>
                  `).join('')
              }
            </tbody>
          </table>
          <div class="total-box">
            Ingreso Total Acumulado: $${Number(ingresoTotalVal).toFixed(2)}
          </div>
        </body>
      </html>
    `;

    await ventanaOculta.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContenido)}`);

    // 3. Generar el PDF desde la ventana oculta
    const pdfData = await ventanaOculta.webContents.printToPDF({ 
      printBackground: true,
      pageSize: 'A4'
    });

    ventanaOculta.close();

    // 4. Abrir el diálogo nativo de Linux para elegir la USB
    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Guardar Corte de Caja en PDF',
      defaultPath: `CorteDeCaja_${new Date().toISOString().slice(0, 10)}.pdf`,
      filters: [{ name: 'Archivos PDF', extensions: ['pdf'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, pdfData);
      return { success: true, path: filePath };
    }
    return { success: false };
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return { success: false, error: error.message };
  }
});