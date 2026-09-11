import React, { useEffect, useState } from 'react';

export default function CorteCaja() {
  const [tickets, setTickets] = useState([]);
  const [acumulados, setAcumulados] = useState([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [detallesTicket, setDetallesTicket] = useState([]);
  
  // Estados para el Historial de Cortes
  const [vistaHistorial, setVistaHistorial] = useState(false);
  const [historialCortes, setHistorialCortes] = useState([]);

  // Cargar la información del día actual
  const cargarDatosCorte = async () => {
    try {
      if (!window.pos?.consultaDB) return;

      const resultadoTickets = await window.pos.consultaDB(
        `SELECT * FROM vta_ventas WHERE DATE(creado_en) = DATE('now', 'localtime') ORDER BY id DESC`,
        []
      );
      setTickets(resultadoTickets || []);

      const resultadoAcumulados = await window.pos.consultaDB(
        `SELECT 
          COALESCE(dv.nombre_producto, 'Producto General') as nombre_producto, 
          SUM(dv.cantidad) as total_vendidos, 
          SUM(dv.subtotal) as total_generado
          FROM vta_detalle_ventas dv
          JOIN vta_ventas v ON dv.venta_id = v.id
          WHERE DATE(v.creado_en) = DATE('now', 'localtime')
          GROUP BY dv.producto_id, dv.nombre_producto
          ORDER BY total_vendidos DESC`,
        []
      );
      setAcumulados(resultadoAcumulados || []);

    } catch (error) {
      console.error('Error al cargar datos del corte de caja:', error);
    }
  };

  const cargarHistorialCortes = async () => {
    try {
      if (!window.pos?.consultaDB) return;
      const historial = await window.pos.consultaDB(
        `SELECT * FROM vta_cortes ORDER BY id DESC`,
        []
      );
      setHistorialCortes(historial || []);
    } catch (error) {
      console.error('Error al cargar historial de cortes:', error);
    }
  };

  useEffect(() => {
    cargarDatosCorte();
  }, []);

  const cambiarVistaHistorial = (estado) => {
    setVistaHistorial(estado);
    if (estado) {
      cargarHistorialCortes();
    }
  };

  const verDetalleTicket = async (ticket) => {
    setTicketSeleccionado(ticket);
    try {
      const productos = await window.pos.consultaDB(
        `SELECT * FROM vta_detalle_ventas WHERE venta_id = ?`,
        [ticket.id]
      );
      setDetallesTicket(productos || []);
    } catch (error) {
      console.error('Error al cargar detalles del ticket:', error);
    }
  };

  const totalIngresosDia = tickets.reduce((acc, t) => acc + t.total, 0);
  const totalTicketsDia = tickets.length;

  // FUNCIÓN ACTUALIZADA: Envía los datos directamente por IPC para abrir el explorador de archivos nativo
  const exportarPDFCorte = async (datosCorte, listaProductos) => {
    try {
      if (!window.pos?.guardarPDF) {
        alert('La función de guardado PDF no está disponible.');
        return;
      }

      // Preparamos los datos completos para asegurar consistencia en ambos escenarios (Turno Actual / Historial)
      const payloadDatos = {
        fecha_corte: datosCorte.fecha_corte || 'Turno Actual en Proceso',
        total_tickets: datosCorte.total_tickets !== undefined ? datosCorte.total_tickets : totalTicketsDia,
        ingreso_total: datosCorte.ingreso_total !== undefined ? datosCorte.ingreso_total : totalIngresosDia
      };

      const res = await window.pos.guardarPDF(payloadDatos, listaProductos);

      if (res && res.success) {
        alert('¡PDF guardado con éxito en:\n' + res.path);
      }
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Ocurrió un error al generar el PDF.');
    }
  };

  const realizarCorteYLimpiar = async () => {
    if (tickets.length === 0) {
      alert('No hay ventas registradas para realizar el corte el día de hoy.');
      return;
    }

    const confirmar = window.confirm(
      '¿Estás seguro de realizar el corte de caja?\nEsto guardará el reporte histórico y limpiará los tickets actuales para iniciar un nuevo turno.'
    );

    if (!confirmar) return;

    try {
      if (!window.pos?.consultaDB) return;

    await window.pos.consultaDB(`
        CREATE TABLE IF NOT EXISTS vta_cortes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha_corte TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          total_tickets INTEGER NOT NULL,
          ingreso_total REAL NOT NULL,
          detalle_productos TEXT
        )
      `, []);

      // Por si la tabla ya existía de antes sin esta columna, la agregamos de forma segura:
      try {
        await window.pos.consultaDB(`ALTER TABLE vta_cortes ADD COLUMN detalle_productos TEXT;`, []);
      } catch (e) {
        // Si la columna ya existe, SQLite lanzará un error que ignoramos tranquilamente
      }

      const jsonDetalleProductos = JSON.stringify(acumulados);

      await window.pos.consultaDB(
        `INSERT INTO vta_cortes (total_tickets, ingreso_total, detalle_productos) VALUES (?, ?, ?)`,
        [totalTicketsDia, totalIngresosDia, jsonDetalleProductos]
      );

      await window.pos.consultaDB(
        `DELETE FROM vta_detalle_ventas WHERE venta_id IN (SELECT id FROM vta_ventas WHERE DATE(creado_en) = DATE('now', 'localtime'))`,
        []
      );

      await window.pos.consultaDB(
        `DELETE FROM vta_ventas WHERE DATE(creado_en) = DATE('now', 'localtime')`,
        []
      );

      alert('¡Corte de caja realizado con éxito! La caja ha quedado limpia para el siguiente turno.');

      setTicketSeleccionado(null);
      setDetallesTicket([]);
      cargarDatosCorte();

    } catch (error) {
      console.error('Error al realizar el corte de caja:', error);
      alert('Hubo un error al procesar el corte en la base de datos.');
    }
  };

  return (
    <div className="panel-modulo" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100vh', boxSizing: 'border-box', background: '#f8f9fa' }}>
      
      {/* Cabecera y Resumen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '15px 20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>📊 Corte de Caja y Turnos</h1>
          <p className="texto-tenue" style={{ margin: '5px 0 0 0' }}>Administra el turno actual o consulta el historial de cortes pasados.</p>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', background: '#f1f1f1', borderRadius: '6px', padding: '3px' }}>
            <button 
              onClick={() => cambiarVistaHistorial(false)}
              style={{ padding: '8px 12px', background: !vistaHistorial ? '#fff' : 'transparent', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', boxShadow: !vistaHistorial ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Corte Actual
            </button>
            <button 
              onClick={() => cambiarVistaHistorial(true)}
              style={{ padding: '8px 12px', background: vistaHistorial ? '#fff' : 'transparent', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', boxShadow: vistaHistorial ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Historial de Cortes
            </button>
          </div>

          {!vistaHistorial && (
            <>
              <div style={{ textAlign: 'right', paddingLeft: '10px', borderLeft: '2px solid #eee' }}>
                <div style={{ fontSize: '11px', color: '#666' }}>Tickets Hoy</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{totalTicketsDia}</div>
              </div>
              <div style={{ textAlign: 'right', paddingLeft: '10px' }}>
                <div style={{ fontSize: '11px', color: '#666' }}>Total en Caja</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>${totalIngresosDia.toFixed(2)}</div>
              </div>

              {/* Botón para Guardar PDF del Turno Actual */}
              <button 
                onClick={() => exportarPDFCorte({ total_tickets: totalTicketsDia, ingreso_total: totalIngresosDia }, acumulados)}
                disabled={tickets.length === 0}
                style={{ 
                  padding: '10px 12px', 
                  background: tickets.length === 0 ? '#cccccc' : '#17a2b8', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 'bold', 
                  cursor: tickets.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                💾 Guardar PDF Turno
              </button>

              <button 
                onClick={realizarCorteYLimpiar}
                disabled={tickets.length === 0}
                style={{ 
                  padding: '10px 14px', 
                  background: tickets.length === 0 ? '#cccccc' : '#dc3545', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 'bold', 
                  cursor: tickets.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                🔒 Cerrar Turno y Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contenido Dinámico */}
      {!vistaHistorial ? (
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flex: 1, overflow: 'hidden' }}>
          
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h3>🎟️ Tickets Registrados Hoy</h3>
            <div style={{ flex: 1, overflowY: 'auto', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tickets.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>No hay ventas registradas el día de hoy.</p>
              ) : (
                tickets.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => verDetalleTicket(t)}
                    style={{ 
                      padding: '12px', 
                      borderRadius: '6px', 
                      border: '1px solid', 
                      borderColor: ticketSeleccionado?.id === t.id ? 'var(--color-primario, #007bff)' : '#e0e0e0',
                      background: ticketSeleccionado?.id === t.id ? '#f0f4ff' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Ticket #{t.id}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Hora: {t.creado_en}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#28a745', fontSize: '15px' }}>${t.total.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Pagó con: ${t.pago_con.toFixed(2)} | Cambio: ${t.cambio.toFixed(2)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {ticketSeleccionado && (
              <div style={{ marginTop: '10px', borderTop: '2px dashed #ddd', paddingTop: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Detalle del Ticket #{ticketSeleccionado.id}:</div>
                {detallesTicket.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#444' }}>
                    <span>{d.cantidad}x {d.nombre_producto}</span>
                    <span>${d.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h3>📦 Productos Vendidos en Total (Acumulado)</h3>
            <div style={{ flex: 1, overflowY: 'auto', marginTop: '10px' }}>
              {acumulados.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>Sin mercancía desplazada hoy.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', color: '#666' }}>
                      <th style={{ padding: '8px' }}>Producto</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Cant. Salida</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Total Generado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acumulados.map((item, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.nombre_producto}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{ background: '#e2f0d9', color: '#155724', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {item.total_vendidos} un.
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#28a745', fontWeight: 'bold' }}>
                          ${item.total_generado.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

      ) : (
        
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', flex: 1, overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>📜 Historial de Cortes de Caja Guardados</h3>
          <p className="texto-tenue">Listado inalterable de todos los cierres de turno realizados previamente.</p>

          {historialCortes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>Aún no hay cortes de caja registrados en el historial.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', color: '#666' }}>
                  <th style={{ padding: '10px' }}>ID Corte</th>
                  <th style={{ padding: '10px' }}>Fecha y Hora del Cierre</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Tickets Emitidos</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Ingreso Total</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historialCortes.map(corte => {
                  let productosHistorial = [];
                  try {
                    productosHistorial = corte.detalle_productos ? JSON.parse(corte.detalle_productos) : [];
                  } catch (e) {
                    productosHistorial = [];
                  }

                  return (
                    <tr key={corte.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>#{corte.id}</td>
                      <td style={{ padding: '12px', color: '#444' }}>{corte.fecha_corte}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ background: '#e1f5fe', color: '#01579b', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                          {corte.total_tickets} tickets
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#28a745', fontWeight: 'bold', fontSize: '16px' }}>
                        ${corte.ingreso_total.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={() => exportarPDFCorte(corte, productosHistorial)}
                          style={{ padding: '6px 12px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          title="Guardar este corte directamente como PDF"
                        >
                          💾 Guardar PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      )}

    </div>
  );
}