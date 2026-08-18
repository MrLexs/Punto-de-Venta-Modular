import React, { createContext, useContext } from 'react';

// Cada modulo puede llamar useNivelAcceso() para saber si el usuario actual
// solo puede 'ver' o si puede 'editar'. El modulo decide que hacer con eso
// (ej. ocultar el boton "Guardar" si es 'ver'). El nucleo nunca impone la UI,
// solo informa el nivel.
const ContextoAcceso = createContext('ver');

export function ProveedorAcceso({ nivel, children }) {
  return <ContextoAcceso.Provider value={nivel}>{children}</ContextoAcceso.Provider>;
}

export function useNivelAcceso() {
  return useContext(ContextoAcceso); // 'ver' | 'editar'
}
