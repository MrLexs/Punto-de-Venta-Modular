import React, { useEffect, useState } from 'react';
import Galeria from './Galeria.jsx';
import Administracion from './Administracion.jsx';
import PantallaLogin from './PantallaLogin.jsx';
import { ProveedorAcceso } from './ContextoAcceso.jsx';
import { componentesPorModulo } from './registroModulos.js';

export default function App() {
  const [usuario, setUsuario] = useState(null); // sesion actual, null = no ha iniciado sesion

  const [catalogo, setCatalogo] = useState([]); // todos los modulos que existen en el proyecto
  const [activos, setActivos] = useState([]); // ids de los modulos que este negocio activo
  const [accesos, setAccesos] = useState({}); // { idModulo: 'ninguno' | 'ver' | 'editar' } para el usuario actual
  const [vista, setVista] = useState('galeria'); // 'galeria' | 'administracion' | id de un modulo
  const [cargando, setCargando] = useState(true);

  async function recargar(usuarioActual) {
    const [catalogoNuevo, activosNuevo] = await Promise.all([
      window.pos.obtenerCatalogoModulos(),
      window.pos.obtenerModulosActivos(),
    ]);
    setCatalogo(catalogoNuevo);
    setActivos(activosNuevo);

    if (usuarioActual) {
      const mapa = await window.pos.admin.mapaDeAccesos(
        usuarioActual.id_rol,
        catalogoNuevo.map((m) => m.id)
      );
      setAccesos(mapa);
    }
    setCargando(false);
  }

  useEffect(() => {
    if (usuario) recargar(usuario);
  }, [usuario]);

  function manejarInicioSesion(usuarioNuevo) {
    setUsuario(usuarioNuevo);
  }

  function cerrarSesion() {
    setUsuario(null);
    setVista('galeria');
  }

  async function manejarActivar(idModulo) {
    await window.pos.activarModulo(idModulo);
    await recargar(usuario);
    setVista(idModulo);
  }

  async function manejarDesactivar(idModulo) {
    await window.pos.desactivarModulo(idModulo);
    if (vista === idModulo) setVista('galeria');
    await recargar(usuario);
  }

  if (!usuario) return <PantallaLogin onIniciarSesion={manejarInicioSesion} />;
  if (cargando) return <div className="cargando">Cargando...</div>;

  // Un modulo activo solo aparece en la barra lateral si el ROL del usuario tiene
  // al menos nivel 'ver'. Esto es lo que hace que dos empleados vean menus distintos.
  const modulosVisibles = catalogo.filter(
    (m) => activos.includes(m.id) && accesos[m.id] && accesos[m.id] !== 'ninguno'
  );

  const ComponenteActivo = componentesPorModulo[vista];
  const nivelVistaActual = accesos[vista] || 'ninguno';

  return (
    <div className="app-shell">
      <aside className="barra-lateral">
        <div className="marca">POS Modular</div>

        <button
          className={`item-nav ${vista === 'galeria' ? 'activo' : ''}`}
          onClick={() => setVista('galeria')}
        >
          <i className="ti ti-apps" /> Módulos
        </button>

        <div className="separador">Activos</div>
        {modulosVisibles.map((modulo) => (
          <button
            key={modulo.id}
            className={`item-nav ${vista === modulo.id ? 'activo' : ''}`}
            onClick={() => setVista(modulo.id)}
          >
            <i className={`ti ${modulo.icono || 'ti-puzzle'}`} /> {modulo.nombre}
          </button>
        ))}
        {modulosVisibles.length === 0 && (
          <p className="texto-tenue">No tienes módulos disponibles todavía.</p>
        )}

        {usuario.es_admin ? (
          <>
            <div className="separador">Sistema</div>
            <button
              className={`item-nav ${vista === 'administracion' ? 'activo' : ''}`}
              onClick={() => setVista('administracion')}
            >
              <i className="ti ti-settings" /> Administración
            </button>
          </>
        ) : null}

        <div className="pie-barra-lateral">
          <p className="texto-tenue">
            {usuario.nombre} · {usuario.rol}
          </p>
          <button className="item-nav" onClick={cerrarSesion}>
            <i className="ti ti-logout" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="contenido">
        {vista === 'galeria' && (
          <Galeria
            catalogo={catalogo}
            activos={activos}
            onActivar={manejarActivar}
            onDesactivar={manejarDesactivar}
          />
        )}
        {vista === 'administracion' && usuario.es_admin && <Administracion catalogo={catalogo} />}
        {ComponenteActivo && nivelVistaActual !== 'ninguno' && (
          <ProveedorAcceso nivel={nivelVistaActual}>
            <ComponenteActivo />
          </ProveedorAcceso>
        )}
      </main>
    </div>
  );
}
