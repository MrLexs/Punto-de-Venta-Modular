import React, { useEffect, useState } from 'react';

const NIVELES = ['ninguno', 'ver', 'editar'];

export default function Administracion({ catalogo }) {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [permisos, setPermisos] = useState({});

  const [nombreNuevo, setNombreNuevo] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');
  const [rolNuevoId, setRolNuevoId] = useState('');
  const [nombreRolNuevo, setNombreRolNuevo] = useState('');

  async function cargarTodo() {
    const [listaUsuarios, listaRoles] = await Promise.all([
      window.pos.admin.listarUsuarios(),
      window.pos.admin.listarRoles(),
    ]);
    setUsuarios(listaUsuarios);
    setRoles(listaRoles);
    if (!rolSeleccionado && listaRoles.length > 0) {
      setRolSeleccionado(listaRoles[0].id);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    if (rolSeleccionado == null) return;
    window.pos.admin.listarPermisosDeRol(rolSeleccionado).then((filas) => {
      const mapa = {};
      filas.forEach((f) => (mapa[f.id_modulo] = f.nivel));
      setPermisos(mapa);
    });
  }, [rolSeleccionado]);

  async function crearUsuario(e) {
    e.preventDefault();
    if (!nombreNuevo || !pinNuevo || !rolNuevoId) return;
    await window.pos.admin.crearUsuario({
      nombre: nombreNuevo,
      pin: pinNuevo,
      idRol: Number(rolNuevoId),
    });
    setNombreNuevo('');
    setPinNuevo('');
    setRolNuevoId('');
    cargarTodo();
  }

  async function alternarActivo(usuario) {
    await window.pos.admin.cambiarActivoUsuario(usuario.id, usuario.activo ? 0 : 1);
    cargarTodo();
  }

  async function crearRol(e) {
    e.preventDefault();
    if (!nombreRolNuevo) return;
    await window.pos.admin.crearRol(nombreRolNuevo);
    setNombreRolNuevo('');
    cargarTodo();
  }

  async function cambiarNivel(idModulo, nivel) {
    setPermisos((prev) => ({ ...prev, [idModulo]: nivel }));
    await window.pos.admin.asignarPermiso(rolSeleccionado, idModulo, nivel);
  }

  const rolActual = roles.find((r) => r.id === rolSeleccionado);

  return (
    <div className="panel-modulo">
      <h1>Administración</h1>

      <section className="seccion-admin">
        <h2>Usuarios</h2>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.rol}</td>
                <td>{u.activo ? 'Activo' : 'Deshabilitado'}</td>
                <td>
                  <button className="boton boton-secundario boton-chico" onClick={() => alternarActivo(u)}>
                    {u.activo ? 'Deshabilitar' : 'Habilitar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="formulario-linea" onSubmit={crearUsuario}>
          <input
            className="campo-busqueda"
            placeholder="Nombre"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
          />
          <input
            className="campo-busqueda"
            placeholder="PIN (4-6 dígitos)"
            value={pinNuevo}
            onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
          />
          <select value={rolNuevoId} onChange={(e) => setRolNuevoId(e.target.value)}>
            <option value="">Rol...</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          <button className="boton boton-primario" type="submit">
            Agregar usuario
          </button>
        </form>
      </section>

      <section className="seccion-admin">
        <h2>Roles y permisos por módulo</h2>

        <form className="formulario-linea" onSubmit={crearRol}>
          <input
            className="campo-busqueda"
            placeholder="Nombre del rol nuevo (ej. Repartidor)"
            value={nombreRolNuevo}
            onChange={(e) => setNombreRolNuevo(e.target.value)}
          />
          <button className="boton boton-secundario" type="submit">
            Crear rol
          </button>
        </form>

        <div className="pestanas-roles">
          {roles.map((r) => (
            <button
              key={r.id}
              className={`pestana-rol ${rolSeleccionado === r.id ? 'activa' : ''}`}
              onClick={() => setRolSeleccionado(r.id)}
            >
              {r.nombre}
            </button>
          ))}
        </div>

        {rolActual?.es_admin ? (
          <p className="texto-tenue">
            Este rol es administrador: siempre tiene acceso de edición completo a todos los
            módulos, sin importar esta tabla.
          </p>
        ) : (
          <table className="tabla-datos">
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Nivel de acceso</th>
              </tr>
            </thead>
            <tbody>
              {catalogo.map((modulo) => (
                <tr key={modulo.id}>
                  <td>{modulo.nombre}</td>
                  <td>
                    <select
                      value={permisos[modulo.id] || 'ninguno'}
                      onChange={(e) => cambiarNivel(modulo.id, e.target.value)}
                    >
                      {NIVELES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
