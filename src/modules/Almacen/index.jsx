import React, { useEffect, useState } from 'react';
import { useNivelAcceso } from '../../core/ContextoAcceso.jsx';

export default function ModuloAlmacen() {
  const nivel = useNivelAcceso();
  const puedeEditar = nivel === 'editar';

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // Estados del formulario
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevoMinimo, setNuevoMinimo] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  // Cargar inventario desde la base de datos de manera segura
  const cargarInventario = async () => {
    try {
      if (!window.pos || !window.pos.consultaDB) {
        console.warn('El puente window.pos aún no está disponible.');
        return;
      }
      const resultado = await window.pos.consultaDB('SELECT * FROM alm_productos ORDER BY nombre ASC', []);
      setProductos(resultado || []);
    } catch (error) {
      console.error('Error al cargar el inventario:', error);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  // Guardar producto nuevo
  const handleAgregarProducto = async (e) => {
    e.preventDefault();
    if (!nuevoCodigo || !nuevoNombre || !nuevoStock) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      if (!window.pos || !window.pos.consultaDB) {
        alert('Error: La base de datos no está disponible en este momento.');
        return;
      }

      await window.pos.consultaDB(
        `INSERT INTO alm_productos (codigo_barras, nombre, stock_actual, stock_minimo, precio_venta) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          nuevoCodigo.trim(), 
          nuevoNombre.trim(), 
          parseInt(nuevoStock) || 0, 
          parseInt(nuevoMinimo) || 5, 
          parseFloat(nuevoPrecio) || 0.0
        ]
      );

      // Limpiar formulario
      setNuevoCodigo('');
      setNuevoNombre('');
      setNuevoStock('');
      setNuevoMinimo('');
      setNuevoPrecio('');

      // Recargar la tabla
      cargarInventario();
      alert('¡Producto guardado exitosamente!');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al registrar el producto. ¿El código de barras ya existe?');
    }
  };

  // Filtrar productos en la tabla
  const productosFiltrados = productos.filter(p =>
    (p.nombre && p.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
    (p.codigo_barras && p.codigo_barras.includes(busqueda))
  );

  return (
    <div className="panel-modulo" style={{ padding: '20px' }}>
      <h1>📦 Control de Almacén e Inventario</h1>
      <p className="texto-tenue">Administra tus existencias de manera modular.</p>

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

      {/* Formulario de Registro */}
      {puedeEditar && (
        <form onSubmit={handleAgregarProducto} style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Registrar Nuevo Producto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '10px' }}>
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
              type="number" placeholder="Stock mínimo" 
              value={nuevoMinimo} onChange={e => setNuevoMinimo(e.target.value)} 
            />
            <input 
              type="number" step="0.01" placeholder="Precio venta ($)" 
              value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} 
            />
          </div>
          <button type="submit" style={{ marginTop: '12px', padding: '8px 15px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Guardar en Almacén
          </button>
        </form>
      )}


      {/* Tabla de Productos */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ background: '#e0e0e0', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>ID</th>
            <th style={{ padding: '10px' }}>Código</th>
            <th style={{ padding: '10px' }}>Producto</th>
            <th style={{ padding: '10px' }}>Precio Venta</th>
            <th style={{ padding: '10px' }}>Stock Actual</th>
            <th style={{ padding: '10px' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {productosFiltrados.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ padding: '15px', textAlign: 'center' }}>No hay productos registrados.</td>
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
                  
                  {/* Stock actual con número exacto y color dinámico */}
                  <td style={{ padding: '10px', fontWeight: 'bold', color: estaFaltante ? 'red' : 'green' }}>
                    {prod.stock_actual} unidades
                  </td>

                  {/* Indicador visual con etiqueta flotante (tooltip) */}
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {sinStock ? (
                      <span 
                        title="No hay stock suficiente" 
                        style={{ cursor: 'help', fontSize: '18px' }}
                      >
                        ❌
                      </span>
                    ) : estaFaltante ? (
                      <span 
                        title="Se requiere más stock (por debajo del mínimo)" 
                        style={{ cursor: 'help', fontSize: '18px' }}
                      >
                        ⚠️
                      </span>
                    ) : (
                      <span 
                        title="Stock suficiente dentro del límite" 
                        style={{ cursor: 'help', fontSize: '18px', color: 'green' }}
                      >
                        ✅
                      </span>
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