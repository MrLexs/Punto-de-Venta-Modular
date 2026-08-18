import Database from 'better-sqlite3';
import path from 'node:path';
import crypto from 'node:crypto';
import { obtenerManifiesto } from './moduleLoader.js';

let db;

export function initDatabase(carpetaDatos) {
  const rutaArchivo = path.join(carpetaDatos, 'pos-modular.db');
  db = new Database(rutaArchivo);
  db.pragma('journal_mode = WAL');

  // Tablas del NUCLEO. Estas siempre existen, sin importar que modulos use el negocio.
  db.exec(`
    CREATE TABLE IF NOT EXISTS negocio (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre TEXT NOT NULL DEFAULT 'Mi negocio',
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO negocio (id, nombre) VALUES (1, 'Mi negocio');

    CREATE TABLE IF NOT EXISTS modulos_activos (
      id_modulo TEXT PRIMARY KEY,
      activado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_admin INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      pin_sal TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      id_rol INTEGER NOT NULL REFERENCES roles(id),
      activo INTEGER NOT NULL DEFAULT 1
    );

    -- nivel: 'ninguno' | 'ver' | 'editar'
    CREATE TABLE IF NOT EXISTS permisos (
      id_rol INTEGER NOT NULL REFERENCES roles(id),
      id_modulo TEXT NOT NULL,
      nivel TEXT NOT NULL DEFAULT 'ninguno',
      PRIMARY KEY (id_rol, id_modulo)
    );
  `);

  sembrarAdminInicial();

  return db;
}

// La primera vez que arranca la app, crea el rol Admin (acceso total, sin pasar
// por la tabla de permisos) y un usuario con PIN 1234 para que puedan entrar.
// Se recomienda cambiar el PIN desde Administración en cuanto entren.
function sembrarAdminInicial() {
  const yaHayRoles = db.prepare('SELECT COUNT(*) AS n FROM roles').get().n > 0;
  if (yaHayRoles) return;

  const idRolAdmin = db
    .prepare('INSERT INTO roles (nombre, es_admin) VALUES (?, 1)')
    .run('Administrador').lastInsertRowid;
  db.prepare('INSERT INTO roles (nombre, es_admin) VALUES (?, 0)').run('Cajero');

  const { sal, hash } = hashearPin('1234');
  db.prepare(
    'INSERT INTO usuarios (nombre, pin_sal, pin_hash, id_rol) VALUES (?, ?, ?, ?)'
  ).run('Admin', sal, hash, idRolAdmin);
}

function hashearPin(pin) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, sal, 64).toString('hex');
  return { sal, hash };
}

function pinCoincide(pin, sal, hashGuardado) {
  const hashIntento = crypto.scryptSync(pin, sal, 64);
  const hashGuardadoBuffer = Buffer.from(hashGuardado, 'hex');
  if (hashIntento.length !== hashGuardadoBuffer.length) return false;
  return crypto.timingSafeEqual(hashIntento, hashGuardadoBuffer);
}

// --- Autenticacion ---

// No pedimos "usuario", solo el PIN: buscamos entre todos los usuarios activos
// cual coincide. Funciona bien porque en una caja fisica esperamos pocos usuarios.
export function iniciarSesionPorPin(pin) {
  const usuarios = db
    .prepare(
      `SELECT u.id, u.nombre, u.pin_sal, u.pin_hash, r.id AS id_rol, r.nombre AS rol, r.es_admin
       FROM usuarios u JOIN roles r ON r.id = u.id_rol
       WHERE u.activo = 1`
    )
    .all();

  const encontrado = usuarios.find((u) => pinCoincide(pin, u.pin_sal, u.pin_hash));
  if (!encontrado) return { ok: false };

  const { pin_sal, pin_hash, ...usuarioSeguro } = encontrado;
  return { ok: true, usuario: usuarioSeguro };
}

// --- Usuarios y roles (para la pantalla de Administracion) ---

export function listarUsuarios() {
  return db
    .prepare(
      `SELECT u.id, u.nombre, u.activo, r.id AS id_rol, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id = u.id_rol ORDER BY u.nombre`
    )
    .all();
}

export function crearUsuario({ nombre, pin, idRol }) {
  const { sal, hash } = hashearPin(pin);
  const resultado = db
    .prepare('INSERT INTO usuarios (nombre, pin_sal, pin_hash, id_rol) VALUES (?, ?, ?, ?)')
    .run(nombre, sal, hash, idRol);
  return { ok: true, id: resultado.lastInsertRowid };
}

export function cambiarActivoUsuario(idUsuario, activo) {
  db.prepare('UPDATE usuarios SET activo = ? WHERE id = ?').run(activo ? 1 : 0, idUsuario);
  return { ok: true };
}

export function listarRoles() {
  return db.prepare('SELECT id, nombre, es_admin FROM roles ORDER BY id').all();
}

export function crearRol(nombre) {
  const resultado = db.prepare('INSERT INTO roles (nombre, es_admin) VALUES (?, 0)').run(nombre);
  return { ok: true, id: resultado.lastInsertRowid };
}

// --- Permisos por rol + modulo ---

export function listarPermisosDeRol(idRol) {
  return db.prepare('SELECT id_modulo, nivel FROM permisos WHERE id_rol = ?').all(idRol);
}

export function asignarPermiso(idRol, idModulo, nivel) {
  db.prepare(
    `INSERT INTO permisos (id_rol, id_modulo, nivel) VALUES (?, ?, ?)
     ON CONFLICT (id_rol, id_modulo) DO UPDATE SET nivel = excluded.nivel`
  ).run(idRol, idModulo, nivel);
  return { ok: true };
}

// Nivel efectivo que un usuario tiene sobre un modulo: 'ninguno' | 'ver' | 'editar'.
// Los administradores siempre tienen 'editar' en todo, sin pasar por la tabla.
export function nivelDeAcceso(idRol, idModulo) {
  const rol = db.prepare('SELECT es_admin FROM roles WHERE id = ?').get(idRol);
  if (rol?.es_admin) return 'editar';

  const fila = db
    .prepare('SELECT nivel FROM permisos WHERE id_rol = ? AND id_modulo = ?')
    .get(idRol, idModulo);
  return fila?.nivel ?? 'ninguno';
}

// Todos los niveles de acceso de un rol sobre TODOS los modulos del catalogo,
// para que el nucleo pueda filtrar la barra lateral de una sola vez.
export function mapaDeAccesos(idRol, idsModulos) {
  const mapa = {};
  for (const idModulo of idsModulos) {
    mapa[idModulo] = nivelDeAcceso(idRol, idModulo);
  }
  return mapa;
}

export function listarModulosActivos() {
  return db.prepare('SELECT id_modulo FROM modulos_activos').all().map((f) => f.id_modulo);
}

// Activar un modulo = correr su schema.sql (crea SUS tablas) + registrarlo como activo.
// Es idempotente: si ya esta activo, no hace nada.
export function activarModulo(idModulo) {
  const yaActivo = db.prepare('SELECT 1 FROM modulos_activos WHERE id_modulo = ?').get(idModulo);
  if (yaActivo) return { ok: true, yaEstaba: true };

  const manifiesto = obtenerManifiesto(idModulo);
  if (!manifiesto) return { ok: false, error: 'Modulo no encontrado' };

  const ejecutarTodo = db.transaction(() => {
    if (manifiesto.schemaSql && manifiesto.schemaSql.trim().length > 0) {
      db.exec(manifiesto.schemaSql);
    }
    db.prepare('INSERT INTO modulos_activos (id_modulo) VALUES (?)').run(idModulo);
  });
  ejecutarTodo();

  return { ok: true, yaEstaba: false };
}

// Desactivar SOLO oculta el modulo del dashboard. No borra sus tablas ni datos,
// para que si lo vuelven a activar despues, todo siga ahi.
export function desactivarModulo(idModulo) {
  db.prepare('DELETE FROM modulos_activos WHERE id_modulo = ?').run(idModulo);
  return { ok: true };
}

// Puente generico de consultas SQL que usan los modulos para leer/escribir en SUS tablas.
export function ejecutarConsulta(sql, params) {
  const comando = sql.trim().slice(0, 6).toUpperCase();
  if (comando === 'SELECT') {
    return db.prepare(sql).all(...params);
  }
  const resultado = db.prepare(sql).run(...params);
  return { changes: resultado.changes, lastInsertRowid: resultado.lastInsertRowid };
}
