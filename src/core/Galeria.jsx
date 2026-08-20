import React from 'react';

export default function Galeria({ catalogo, activos, onActivar, onDesactivar, esAdmin }) {
  if (!esAdmin) {
    return (
      <div className="galeria" style={{ textAlign: 'center', marginTop: '40px' }}>
        <h2>🚫 Acceso Restringido</h2>
        <p className="texto-tenue">
          Solo el Administrador tiene permisos para activar o desactivar módulos del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="galeria">
      <h1>Módulos disponibles</h1>
      <p className="texto-tenue">
        Activa solo lo que tu negocio necesita. Puedes desactivarlo después sin perder tus datos.
      </p>

      <div className="rejilla-tarjetas">
        {catalogo.map((modulo) => {
          const estaActivo = activos.includes(modulo.id);
          return (
            <div key={modulo.id} className="tarjeta-modulo">
              <i className={`ti ${modulo.icono || 'ti-puzzle'} icono-tarjeta`} />
              <h3>{modulo.nombre}</h3>
              <p>{modulo.descripcion}</p>
              {estaActivo ? (
                <button className="boton boton-secundario" onClick={() => onDesactivar(modulo.id)}>
                  Desactivar
                </button>
              ) : (
                <button className="boton boton-primario" onClick={() => onActivar(modulo.id)}>
                  Activar
                </button>
              )}
            </div>
          );
        })}

        {catalogo.length === 0 && (
          <p className="texto-tenue">
            No hay módulos en src/modules todavía. Sigue la plantilla en src/modules/_plantilla
            para crear el primero.
          </p>
        )}
      </div>
    </div>
  );
}