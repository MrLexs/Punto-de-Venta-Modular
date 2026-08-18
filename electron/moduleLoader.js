import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARPETA_MODULOS = path.join(__dirname, '../src/modules');

// Un modulo "valido" es cualquier carpeta dentro de src/modules que tenga un module.json.
// La carpeta _plantilla empieza con "_" a proposito para que NUNCA se liste como modulo real.
function carpetasDeModulos() {
  return fs
    .readdirSync(CARPETA_MODULOS, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory() && !entrada.name.startsWith('_'))
    .map((entrada) => entrada.name);
}

export function listarModulosDisponibles() {
  return carpetasDeModulos()
    .map((idModulo) => obtenerManifiesto(idModulo))
    .filter(Boolean);
}

export function obtenerManifiesto(idModulo) {
  const rutaManifiesto = path.join(CARPETA_MODULOS, idModulo, 'module.json');
  if (!fs.existsSync(rutaManifiesto)) return null;

  const manifiesto = JSON.parse(fs.readFileSync(rutaManifiesto, 'utf-8'));

  const rutaSchema = path.join(CARPETA_MODULOS, idModulo, 'schema.sql');
  const schemaSql = fs.existsSync(rutaSchema) ? fs.readFileSync(rutaSchema, 'utf-8') : '';

  return { ...manifiesto, id: idModulo, schemaSql };
}
