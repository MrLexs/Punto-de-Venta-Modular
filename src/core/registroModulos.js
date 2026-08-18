// Vite escanea en tiempo de compilacion todas las carpetas dentro de src/modules
// y carga el componente principal (index.jsx) de cada una.
// Asi, agregar un modulo nuevo es solo: crear la carpeta -> aparece aqui automaticamente.
const componentes = import.meta.glob('../modules/*/index.jsx', { eager: true });

// Convierte la ruta "../modules/checador-precios/index.jsx" en el id "checador-precios"
// y guarda su componente exportado por default.
export const componentesPorModulo = Object.fromEntries(
  Object.entries(componentes).map(([ruta, mod]) => {
    const id = ruta.split('/').at(-2);
    return [id, mod.default];
  })
);
