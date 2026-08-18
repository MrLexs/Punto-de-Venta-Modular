import React, { useEffect, useState } from 'react';
import { useNivelAcceso } from '../../core/ContextoAcceso.jsx';

// Este es el componente que se muestra cuando el usuario abre tu modulo
// desde la barra lateral. Recibe la app en modo React "normal": puedes
// usar useState, useEffect, etc. sin restricciones.
//
// Para leer/escribir en TUS tablas (las que creaste en schema.sql), usa:
//   await window.pos.consultaDB('SELECT * FROM plantilla_items', [])
//   await window.pos.consultaDB('INSERT INTO plantilla_items (nombre) VALUES (?)', ['ejemplo'])
//
// El puente window.pos ya esta disponible en cualquier modulo, no hay que importarlo.
//
// useNivelAcceso() devuelve 'ver' o 'editar' segun el rol del usuario que abrio
// el modulo (el nucleo ya filtro que el usuario tenga AL MENOS 'ver'; si no,
// nunca llega a renderizar este componente). Usalo para ocultar botones de
// escritura cuando el nivel sea 'ver'.

export default function ModuloPlantilla() {
  const nivel = useNivelAcceso();
  const puedeEditar = nivel === 'editar';

  const [ejemplo, setEjemplo] = useState(null);

  useEffect(() => {
    // ejemplo: window.pos.consultaDB('SELECT * FROM plantilla_items', []).then(setEjemplo);
  }, []);

  return (
    <div className="panel-modulo">
      <h1>Nombre del módulo</h1>
      <p>Reemplaza este archivo por la pantalla real de tu módulo.</p>
      {puedeEditar ? (
        <p className="texto-tenue">El usuario actual puede editar.</p>
      ) : (
        <p className="texto-tenue">El usuario actual solo puede ver (modo lectura).</p>
      )}
    </div>
  );
}
