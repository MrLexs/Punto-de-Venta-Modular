import React, { useEffect, useState, useRef } from 'react';
import { useNivelAcceso } from '../../core/ContextoAcceso.jsx';

export default function ModuloVentas() {
  const nivel = useNivelAcceso();
  const [inventario, setInventario] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [pagoCon, setPagoCon] = useState('');

  const inputEscannerRef = useRef(null);

  // Cargar productos con stock disponible
  const cargarInventario = async () => {
    try {
      if (window.pos?.consultaDB) {
        const resultado = await window.pos.consultaDB('SELECT * FROM alm_productos WHERE stock_actual > 0 ORDER BY nombre ASC', []);
        setInventario(resultado || []);
      }
    } catch (error) {
      console.error('Error al cargar inventario para ventas:', error);
    }
  };

  useEffect(() => {
    cargarInventario();
    if (inputEscannerRef.current) inputEscannerRef.current.focus();
  }, []);

  // Agregar producto al carrito (o incrementar cantidad si ya está)
  const agregarAlCarrito = (prod) => {
    setCarrito(prevCarrito => {
      const index = prevCarrito.findIndex(item => item.id === prod.id);
      if (index >= 0) {
        const itemExistente = prevCarrito[index];
        if (itemExistente.cantidad + 1 > prod.stock_actual) {
          alert('No hay más stock disponible para este producto.');
          return prevCarrito;
        }
        const nuevoCarrito = [...prevCarrito];
        nuevoCarrito[index] = { ...itemExistente, cantidad: itemExistente.cantidad + 1 };
        return nuevoCarrito;
      } else {
        return [...prevCarrito, { ...prod, cantidad: 1 }];
      }
    });

    setBusqueda('');
    if (inputEscannerRef.current) {
      inputEscannerRef.current.focus();
    }
  };

  // Buscar por código exacto al presionar Enter (ideal para lector de códigos de barras)
  const handleKeyDownBusqueda = (e) => {
    if (e.key === 'Enter' && busqueda.trim() !== '') {
      const encontrado = inventario.find(p => 
        p.codigo_barras === busqueda.trim() || 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      );

      if (encontrado) {
        agregarAlCarrito(encontrado);
      } else {
        alert('Producto no encontrado o sin stock disponible.');
      }
    }
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCantidad = item.cantidad + delta;
        if (nuevaCantidad > item.stock_actual) {
          alert('Supera el stock actual en almacén.');
          return item;
        }
        return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const eliminarItem = (id) => {
    setCarrito(prev => prev.filter(item => item.id !== id));
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => acc + (item.precio_venta * item.cantidad), 0);
  };

  const totalVenta = calcularTotal();
  const cambio = parseFloat(pagoCon) >= totalVenta ? parseFloat(pagoCon) - totalVenta : 0;

  // Finalizar cobro, registrar ticket en SQLite y descontar stock
 // Finalizar cobro, registrar ticket en SQLite y descontar stock
  const procesarCobro = async () => {
    if (carrito.length === 0) return;
    
    // Asegurar que el monto ingresado sea un número válido
    const montoPagado = parseFloat(pagoCon) || 0;

    if (montoPagado < totalVenta) {
      alert('El monto recibido es menor al total de la venta.');
      return;
    }

    try {
      if (!window.pos?.consultaDB) return;

      // 1. Guardar la venta principal asegurando valores numéricos limpios
      await window.pos.consultaDB(
        `INSERT INTO vta_ventas (total, pago_con, cambio) VALUES (?, ?, ?)`,
        [totalVenta, montoPagado, cambio]
      );
      
      const idVentaQuery = await window.pos.consultaDB(`SELECT last_insert_rowid() as id`, []);
      const ventaId = idVentaQuery[0]?.id;

      if (ventaId) {
        // 2. Guardar detalles de la venta
        for (const item of carrito) {
          await window.pos.consultaDB(
            `INSERT INTO vta_detalle_ventas (venta_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
            [ventaId, item.id, item.nombre, item.precio_venta, item.cantidad, item.precio_venta * item.cantidad]
          );
        }
      }

      // 3. Descontar stock de almacén
      for (const item of carrito) {
        await window.pos.consultaDB(
          `UPDATE alm_productos SET stock_actual = stock_actual - ? WHERE id = ?`,
          [item.cantidad, item.id]
        );
      }

      alert(`¡Venta cobrada con éxito!\nCambio a entregar: $${cambio.toFixed(2)}`);

      setCarrito([]);
      setPagoCon('');
      await cargarInventario();
      if (inputEscannerRef.current) inputEscannerRef.current.focus();

    } catch (error) {
      console.error('Error al procesar la venta:', error);
      alert('Hubo un error al guardar la venta en la base de datos.');
    }
  };

  return (
    <div className="panel-modulo" style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', height: '100vh', boxSizing: 'border-box' }}>
      
      {/* Columna Izquierda: Búsqueda y Catálogo rápido */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <h1>🛒 Caja y Ventas</h1>
          <p className="texto-tenue">Escanea el código de barras o busca productos para agregarlos al ticket.</p>
        </div>

        {/* Input del escáner */}
        <div>
          <input 
            ref={inputEscannerRef}
            type="text" 
            placeholder="Escanea el código de barras o escribe para buscar..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDownBusqueda}
            style={{ padding: '12px', width: '100%', fontSize: '16px', boxSizing: 'border-box', border: '2px solid var(--color-primario, #007bff)', borderRadius: '6px' }}
          />
        </div>

        {/* Listado de productos disponibles con código visible */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '10px', background: '#fafafa' }}>
          <h3>Productos Disponibles</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginTop: '10px' }}>
            {inventario
              .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.codigo_barras && p.codigo_barras.includes(busqueda)))
              .map(prod => (
                <div 
                  key={prod.id} 
                  onClick={() => agregarAlCarrito(prod)}
                  style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e0e0e0', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'transform 0.1s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace', background: '#f1f1f1', padding: '2px 4px', borderRadius: '3px', display: 'inline-block', marginBottom: '4px' }}>
                      {prod.codigo_barras || 'Sin código'}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', lineHeight: '1.2' }}>{prod.nombre}</div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
                    <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '15px' }}>${prod.precio_venta.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Stock: {prod.stock_actual}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Ticket / Carrito y Cobro */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginTop: 0 }}>Ticket de Venta</h3>

        {/* Lista del carrito */}
        <div style={{ flex: 1, overflowY: 'auto', margin: '10px 0' }}>
          {carrito.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>El ticket está vacío.</p>
          ) : (
            carrito.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', padding: '8px 0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>${item.precio_venta.toFixed(2)} x {item.cantidad}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <button onClick={() => cambiarCantidad(item.id, -1)} style={{ padding: '2px 6px', cursor: 'pointer' }}>-</button>
                  <span>{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(item.id, 1)} style={{ padding: '2px 6px', cursor: 'pointer' }}>+</button>
                  <button onClick={() => eliminarItem(item.id)} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '3px 6px', cursor: 'pointer', borderRadius: '3px', marginLeft: '5px' }}>×</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y Sección de Pago */}
        <div style={{ borderTop: '2px solid #eee', paddingTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            <span>Total:</span>
            <span style={{ color: '#28a745' }}>${totalVenta.toFixed(2)}</span>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#555' }}>Paga con ($):</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={pagoCon}
              onChange={(e) => setPagoCon(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontSize: '16px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', marginBottom: '15px', background: '#e2f0d9', padding: '8px', borderRadius: '4px' }}>
            <span>Cambio:</span>
            <span style={{ color: '#155724' }}>${cambio.toFixed(2)}</span>
          </div>

          <button 
            disabled={carrito.length === 0 || parseFloat(pagoCon) < totalVenta}
            onClick={procesarCobro}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: carrito.length === 0 || parseFloat(pagoCon) < totalVenta ? '#cccccc' : '#28a745', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              cursor: carrito.length === 0 || parseFloat(pagoCon) < totalVenta ? 'not-allowed' : 'pointer' 
            }}
          >
            Cobrar e Imprimir Ticket
          </button>
        </div>

      </div>

    </div>
  );
}