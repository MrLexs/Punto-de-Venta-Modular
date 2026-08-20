import React, { useEffect, useState, useRef } from 'react';
import FormularioProducto from './FormularioProducto.jsx';
import { useNivelAcceso } from '../../core/ContextoAcceso.jsx';

export default function ModuloAlmacen() {
  const nivel = useNivelAcceso();
  const puedeEditar = nivel === 'editar';

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [productoEditar, setProductoEditar] = useState(null);
  
  // Referencia al contenedor principal del módulo
  const contenedorRef = useRef(null);

  const cargarInventario = async () => {
    try {
      if (window.pos?.consultaDB) {
        const resultado = await window.pos.consultaDB('SELECT * FROM alm_productos ORDER BY nombre ASC', []);
        setProductos(resultado || []);
      }
    } catch (error) {
      console.error('Error al cargar inventario:', error);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  const handleGuardar = async (form) => {
    try {
      if (!window.pos?.consultaDB) return;

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
        // OJO: Comentamos los alert nativos largos si los tienes, o los cambiamos por logs limpios
        console.log('¡Producto actualizado exitosamente!');
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
        console.log('¡Producto guardado exitosamente!');
      }

      setProductoEditar(null);
      await cargarInventario();

      // Forzar la recuperación del foco en el contenedor de la app por código
      if (contenedorRef.current) {
        const primerInput = contenedorRef.current.querySelector('input');
        if (primerInput) primerInput.focus();
      }

    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const eliminarProducto = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el producto "${nombre}"?`)) return;

    try {
      await window.pos.consultaDB('DELETE FROM alm_productos WHERE id = ?', [id]);
      await cargarInventario();
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const productosFiltrados = productos.filter(p =>
    (p.nombre && p.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  return (
    <div 
      ref={contenedorRef} 
      className="panel-modulo" 
      style={{ padding: '20px' }}
      onClick={() => {
        // Truco de rescate: si por alguna razón el foco se pierde, un clic en el módulo lo reactiva
        const active = document.activeElement;
        if (!active || active.tagName !== 'INPUT') {
          // Opcional si quieres reenfocar el buscador o dejarlo libre
        }
      }}
    >
      <h1>📦 Control de Almacén e Inventario</h1>
      <p className="texto-tenue">Administra existencias, precios y control de stock.</p>

      {/* Buscador */}
      <div style={{ margin: '20px 0' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre o código de barras..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: '8px', width: '350px' }}
        />
      </div>

      {/* Formulario aislado */}
      {puedeEditar && (
        <FormularioProducto 
          productoEditar={productoEditar}
          onGuardar={handleGuardar}
          onCancelar={() => setProductoEditar(null)}
        />
      )}

      {/* Tabla */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ background: '#e0e0e0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>ID</th>
            <th style={{ padding: '10px' }}>Código</th>
            <th style={{ padding: '10px' }}>Producto</th>
            <th style={{ padding: '10px' }}>Precio Venta</th>
            <th style={{ padding: '10px' }}>Stock Actual</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Estado</th>
            {puedeEditar && <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {productosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={puedeEditar ? 7 : 6} style={{ padding: '15px', textAlign: 'center' }}>No hay productos registrados.</td>
            </tr>
          ) : (
            productosFiltrados.map((prod) => {
              const estaFaltante = prod.stock_actual <= prod.stock_minimo;
              const sinStock = prod.stock_actual === 0;

              return (
                <tr key={prod.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{prod.id}</td>
                  <td style={{ padding: '10px' }}>{prod.codigo_barras}</td>
                  <td style={{ padding: '10px' }}>{prod.nombre}</td>
                  <td style={{ padding: '10px' }}>${prod.precio_venta ? prod.precio_venta.toFixed(2) : '0.00'}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: estaFaltante ? 'red' : 'green' }}>
                    {prod.stock_actual} unidades
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {sinStock ? '❌' : estaFaltante ? '⚠️' : '✅'}
                  </td>
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