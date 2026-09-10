import React, { useEffect, useState, useRef } from 'react';
import FormularioProducto from './FormularioProducto.jsx';
import { useNivelAcceso } from '../../core/ContextoAcceso.jsx';

export default function ModuloAlmacen() {
  const nivel = useNivelAcceso();
  const puedeEditar = nivel === 'editar';

  const [modo, setModo] = useState('almacen'); // 'almacen' o 'checador'
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [productoEditar, setProductoEditar] = useState(null);
  
  // Referencia al contenedor principal del módulo (vital para el foco en Electron)
  const contenedorRef = useRef(null);

  const cargarDatos = async () => {
    try {
      if (!window.pos?.consultaDB) return;

      if (modo === 'almacen') {
        const resultado = await window.pos.consultaDB('SELECT * FROM alm_productos ORDER BY nombre ASC', []);
        setProductos(resultado || []);
      } else {
        const resultado = await window.pos.consultaDB('SELECT * FROM chp_productos ORDER BY nombre ASC', []);
        setProductos(resultado || []);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [modo]);

  const handleGuardar = async (form) => {
    try {
      if (!window.pos?.consultaDB) return;

      if (modo === 'almacen') {
        if (productoEditar) {
          await window.pos.consultaDB(
            `UPDATE alm_productos SET codigo_barras = ?, nombre = ?, stock_actual = ?, stock_minimo = ?, precio_venta = ? WHERE id = ?`,
            [
              form.codigo.trim(),
              form.nombre.trim(),
              parseInt(form.stock) || 0,
              parseInt(form.minimo) || 5,
              parseFloat(form.precio) || 0.0,
              productoEditar.id
            ]
          );
          console.log('¡Producto de almacén actualizado exitosamente!');
        } else {
          await window.pos.consultaDB(
            `INSERT INTO alm_productos (codigo_barras, nombre, stock_actual, stock_minimo, precio_venta) VALUES (?, ?, ?, ?, ?)`,
            [
              form.codigo.trim(),
              form.nombre.trim(),
              parseInt(form.stock) || 0,
              parseInt(form.minimo) || 5,
              parseFloat(form.precio) || 0.0
            ]
          );
          console.log('¡Producto de almacén guardado exitosamente!');
        }
      } else {
        // Lógica para la tabla chp_productos del Checador
        if (productoEditar) {
          await window.pos.consultaDB(
            `UPDATE chp_productos SET codigo = ?, nombre = ?, precio = ? WHERE id = ?`,
            [
              form.codigo.trim(),
              form.nombre.trim(),
              parseFloat(form.precio) || 0.0,
              productoEditar.id
            ]
          );
          console.log('¡Producto del checador actualizado exitosamente!');
        } else {
          await window.pos.consultaDB(
            `INSERT INTO chp_productos (codigo, nombre, precio) VALUES (?, ?, ?)`,
            [
              form.codigo.trim(),
              form.nombre.trim(),
              parseFloat(form.precio) || 0.0
            ]
          );
          console.log('¡Producto del checador guardado exitosamente!');
        }
      }

      setProductoEditar(null);
      await cargarDatos();

      // Forzar la recuperación del foco en el contenedor de la app por código
      if (contenedorRef.current) {
        const primerInput = contenedorRef.current.querySelector('input');
        if (primerInput) primerInput.focus();
      }

    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar en la base de datos (verifica si el código ya existe).');
    }
  };

  const eliminarProducto = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto "${nombre}"?`)) return;

    try {
      const tabla = modo === 'almacen' ? 'alm_productos' : 'chp_productos';
      await window.pos.consultaDB(`DELETE FROM ${tabla} WHERE id = ?`, [id]);
      await cargarDatos();
      console.log('Producto eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const nombre = p.nombre || '';
    const codigo = p.codigo_barras || p.codigo || '';
    return nombre.toLowerCase().includes(busqueda.toLowerCase()) || codigo.includes(busqueda);
  });

  return (
    <div 
      ref={contenedorRef} 
      className="panel-modulo" 
      style={{ padding: '20px' }}
    >
      <h1>📦 Gestión de Catálogos</h1>
      <p className="texto-tenue">Administra tu inventario de almacén o los productos exclusivos del checador de precios.</p>

      {/* Pestañas para alternar entre Almacén y Checador */}
      <div style={{ margin: '15px 0', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => { setModo('almacen'); setProductoEditar(null); setBusqueda(''); }}
          style={{ padding: '10px 20px', background: modo === 'almacen' ? '#007bff' : '#e0e0e0', color: modo === 'almacen' ? '#fff' : '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🏪 Productos de Almacén
        </button>
        <button 
          onClick={() => { setModo('checador'); setProductoEditar(null); setBusqueda(''); }}
          style={{ padding: '10px 20px', background: modo === 'checador' ? '#17a2b8' : '#e0e0e0', color: modo === 'checador' ? '#fff' : '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🔍 Productos de Checador (chp_productos)
        </button>
      </div>

      {/* Buscador */}
      <div style={{ margin: '20px 0' }}>
        <input 
          type="text" 
          placeholder={`Buscar en ${modo === 'almacen' ? 'Almacén' : 'Checador'} por nombre o código...`} 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: '8px', width: '350px' }}
        />
      </div>

      {/* Formulario aislado (compatible con ambos modos) */}
      {puedeEditar && (
        <FormularioProducto 
          modo={modo}
          productoEditar={productoEditar}
          onGuardar={handleGuardar}
          onCancelar={() => setProductoEditar(null)}
        />
      )}

      {/* Tabla dinámica según el modo */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ background: '#e0e0e0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>ID</th>
            <th style={{ padding: '10px' }}>Código</th>
            <th style={{ padding: '10px' }}>Producto</th>
            <th style={{ padding: '10px' }}>Precio</th>
            {modo === 'almacen' && (
              <>
                <th style={{ padding: '10px' }}>Stock Actual</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Estado</th>
              </>
            )}
            {puedeEditar && <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {productosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={modo === 'almacen' ? 7 : 5} style={{ padding: '15px', textAlign: 'center' }}>No hay registros en esta sección.</td>
            </tr>
          ) : (
            productosFiltrados.map((prod) => {
              const codigoVal = modo === 'almacen' ? prod.codigo_barras : prod.codigo;
              const precioVal = modo === 'almacen' ? prod.precio_venta : prod.precio;
              const estaFaltante = modo === 'almacen' ? (prod.stock_actual <= prod.stock_minimo) : false;
              const sinStock = modo === 'almacen' ? (prod.stock_actual === 0) : false;

              return (
                <tr key={prod.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{prod.id}</td>
                  <td style={{ padding: '10px' }}>{codigoVal}</td>
                  <td style={{ padding: '10px' }}>{prod.nombre}</td>
                  <td style={{ padding: '10px' }}>${precioVal ? precioVal.toFixed(2) : '0.00'}</td>
                  {modo === 'almacen' && (
                    <>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: estaFaltante ? 'red' : 'green' }}>
                        {prod.stock_actual} unidades
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {sinStock ? '❌' : estaFaltante ? '⚠️' : '✅'}
                      </td>
                    </>
                  )}
                  {puedeEditar && (
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button 
                        onClick={() => setProductoEditar(prod)} 
                        style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer', background: '#ffc107', border: 'none', borderRadius: '3px' }}
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => eliminarProducto(prod.id, prod.nombre)} 
                        style={{ padding: '5px 10px', cursor: 'pointer', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '3px' }}
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}