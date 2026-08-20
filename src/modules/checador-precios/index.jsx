import React, { useEffect, useState } from 'react';
import { useNivelAcceso } from '../../core/ContextoAcceso.jsx';

export default function ChecadorPrecios() {
  // 'ver' o 'editar', segun el rol del usuario que inicio sesion.
  // Este es el patron que cualquier modulo nuevo puede copiar.
  const nivel = useNivelAcceso();
  const puedeEditar = nivel === 'editar';

  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  async function cargarProductos(texto) {
    //Se consula ambas tablas, tanto el checado y la del almacen
    const filas = await window.pos.consultaDB(
      'SELECT codigo, nombre, precio FROM chp_productos WHERE nombre LIKE ? OR codigo LIKE ? UNION SELECT codigo_barras AS codigo, nombre, precio_venta AS precio FROM alm_productos WHERE nombre LIKE ? OR codigo_barras LIKE ? ORDER BY nombre',
      [`%${texto}%`, `%${texto}%`, `%${texto}%`, `%${texto}%`]
    );
    setProductos(filas || []);
  }

  useEffect(() => {
    cargarProductos('');
  }, []);

  function manejarBusqueda(e) {
    const texto = e.target.value;
    setBusqueda(texto);
    cargarProductos(texto);
  }

  async function agregarProducto(e) {
    e.preventDefault();
    if (!nuevoNombre || !nuevoPrecio) return;
    await window.pos.consultaDB('INSERT INTO chp_productos (nombre, precio) VALUES (?, ?)', [
      nuevoNombre,
      Number(nuevoPrecio),
    ]);
    setNuevoNombre('');
    setNuevoPrecio('');
    cargarProductos(busqueda);
  }

  return (
    <div className="panel-modulo">
      <h1>Checador de precios</h1>
      {!puedeEditar && (
        <p className="texto-tenue">Tu rol solo puede consultar precios, no agregar productos.</p>
      )}
      <input
        className="campo-busqueda"
        placeholder="Buscar por nombre o código..."
        value={busqueda}
        onChange={manejarBusqueda}
      />

      {puedeEditar && (
        <form className="formulario-linea" onSubmit={agregarProducto}>
          <input
            className="campo-busqueda"
            placeholder="Nombre del producto nuevo"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
          />
          <input
            className="campo-busqueda"
            placeholder="Precio"
            value={nuevoPrecio}
            onChange={(e) => setNuevoPrecio(e.target.value.replace(/[^0-9.]/g, ''))}
          />
          <button className="boton boton-primario" type="submit">
            Agregar
          </button>
        </form>
      )}

      <table className="tabla-datos">
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Precio</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p, index) => (
            <tr key={p.codigo + '-' + index}>
              <td>{p.codigo}</td>
              <td>{p.nombre}</td>
              <td>${p.precio ? p.precio.toFixed(2) : '0.00'}</td>
            </tr>
          ))}
          {productos.length === 0 && (
            <tr>
              <td colSpan="3">No se encontraron productos.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
