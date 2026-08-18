import React, { useEffect, useState } from 'react';
import { useNivelAcceso } from '../../core/ContextoAcceso.jsx';


export default function ModuloAlmacen() {
  const nivel = useNivelAcceso();
  const puedeEditar = nivel === 'editar';

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  //Estados para el formulario del nuevo producto
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevoMinimo, setNuevoMinimo] = useState('');

  //Cargar productos al abrir el modulo

  const cargarInventario = () => {
    try{
      const resultado = await window.postMessage.constultaDB('SELECT * FROM alm_productos ORDER BY nombre ASC', []);
      setProductos(resultado);
    } catch (error) {
      console.error('Error al cargar el inventario:', error);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  //Funcion para agregar producto nuevo
  const handleAgregarProducto = async (e) => {
    e.preventDefault();
    if (!nuevoCodigo || !nuevoNombre || !nuevoStock) return;

    try{
      await window.postMessage.constultaDB(
        'INSERT INTO alm_productos (codigo_barras, nombre, stock_actual, stock_minimo) VALUES (?, ?, ?, ?)',
        [nuevoCodigo, nuevoNombre, parseInt(nuevoStock), parseInt(nuevoMinimo) || 5]
      );
      // Limpiar el formulario
      setNuevoCodigo('');
      setNuevoNombre('');
      setNuevoStock('');
      setNuevoMinimo('');

      // Recargar el inventario
      cargarInventario();
    } catch (error) {
      alert('Error al registrar el producto ¿El codigo de barras ya existe?:');
    }
  };

  //Filrar productos segun la barra de busqueda
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_barras.includes(busqueda)
  );

  return (
    <div className="panel-modulo" style={{ padding: '20px' }}>
      <h1>📦 Control de Almacén</h1>
      <p className="texto-tenue">Administra tus existencias y detecta productos faltantes.</p>

      {/* Barra de búsqueda */}
      <div style={{ margin: '20px 0' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre o código de barras..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: '8px', width: '300px', marginRight: '10px' }}
        />
      </div>

      {/* Formulario de registro (Solo visible si tiene permisos de edición) */}
      {puedeEditar && (
        <form onSubmit={handleAgregarProducto} style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Agregar Nuevo Producto al Almacén</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' }}>
            <input 
              type="text" placeholder="Código de barras" 
              value={nuevoCodigo} onChange={e => setNuevoCodigo(e.target.value)} required 
            />
            <input 
              type="text" placeholder="Nombre del producto" 
              value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} required 
            />
            <input 
              type="number" placeholder="Stock actual" 
              value={nuevoStock} onChange={e => setNuevoStock(e.target.value)} required 
            />
            <input 
              type="number" placeholder="Stock mínimo (alerta)" 
              value={nuevoMinimo} onChange={e => setNuevoMinimo(e.target.value)} 
            />
          </div>
          <button type="submit" style={{ marginTop: '10px', padding: '8px 15px', cursor: 'pointer' }}>
            Guardar Producto
          </button>
        </form>
      )}

      {/* Tabla de inventario */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ background: '#e0e0e0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>Código</th>
            <th style={{ padding: '10px' }}>Producto</th>
            <th style={{ padding: '10px' }}>Stock Actual</th>
            <th style={{ padding: '10px' }}>Estado / Alerta</th>
          </tr>
        </thead>
        <tbody>
          {productosFiltrados.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: '15px', textAlign: 'center' }}>No hay productos registrados.</td>
            </tr>
          ) : (
            productosFiltrados.map((prod) => {
              const estaFaltante = prod.stock_actual <= prod.stock_minimo;
              return (
                <tr key={prod.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{prod.codigo_barras}</td>
                  <td style={{ padding: '10px' }}>{prod.nombre}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{prod.stock_actual}</td>
                  <td style={{ padding: '10px' }}>
                    {estaFaltante ? (
                      <span style={{ color: 'red', fontWeight: 'bold' }}>⚠️ ¡Faltante / Bajo stock!</span>
                    ) : (
                      <span style={{ color: 'green' }}>✔ Stock suficiente</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
