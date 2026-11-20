// Vite escanea en tiempo de compilacion todas las carpetas dentro de src/modules
// y carga el componente principal (index.tsx) de cada una.
// Asi, agregar un modulo nuevo es solo: crear la carpeta -> aparece aqui automaticamente.
// El <{ default: any }> le dice a TypeScript que cada modulo exporta un "default".
const componentes = import.meta.glob<{ default: any }>('../modules/*/index.tsx', { eager: true });

// Convierte la ruta "../modules/checador-precios/index.tsx" en el id "checador-precios"
// y guarda su componente exportado por default.
const listaDeEntradas: [string, any][] = [];
const rutas = Object.keys(componentes);

for (let i = 0; i < rutas.length; i++) {
  const ruta = rutas[i];
  const partes = ruta.split('/');
  // El id es la penultima parte de la ruta (la carpeta del modulo)
  const id = partes[partes.length - 2];
  listaDeEntradas.push([id, componentes[ruta].default]);
}

export const componentesPorModulo = Object.fromEntries(listaDeEntradas);