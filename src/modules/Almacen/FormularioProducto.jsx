import React, { useState, useEffect } from 'react';

export default function FormularioProducto({ modo, productoEditar, onGuardar, onCancelar }) {
  const [form, setForm] = useState({ codigo: '', nombre: '', stock: '', minimo: '', precio: '' });

  useEffect(() => {
    if (productoEditar) {
      if (modo === 'almacen') {
        setForm({
          codigo: productoEditar.codigo_barras || '',
          nombre: productoEditar.nombre || '',
          stock: productoEditar.stock_actual ?? '',
          minimo: productoEditar.stock_minimo ?? '',
          precio: productoEditar.precio_venta ?? ''
        });
      } else {
        setForm({
          codigo: productoEditar.codigo || '',
          nombre: productoEditar.nombre || '',
          stock: '',
          minimo: '',
          precio: productoEditar.precio ?? ''
        });
      }
    } else {
      setForm({ codigo: '', nombre: '', stock: '', minimo: '', precio: '' });
    }
  }, [productoEditar, modo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.codigo || !form.nombre || (modo === 'almacen' && form.stock === '')) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }
    onGuardar(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: modo === 'almacen' ? '#f4f4f4' : '#e2f0d9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>
        {productoEditar 
          ? (modo === 'almacen' ? '✏️ Modificar Producto de Almacén' : '✏️ Modificar Producto de Checador') 
          : (modo === 'almacen' ? 'Registrar Nuevo Producto en Almacén' : 'Registrar en Checador (chp_productos)')}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: modo === 'almacen' ? 'repeat(5, 1fr)' : 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
        <input 
          type="text" 
          placeholder="Código" 
          value={form.codigo} 
          onChange={e => setForm({...form, codigo: e.target.value})} 
          required 
        />
        <input 
          type="text" 
          placeholder="Nombre del producto" 
          value={form.nombre} 
          onChange={e => setForm({...form, nombre: e.target.value})} 
          required 
        />
        
        {modo === 'almacen' && (
          <>
            <input 
              type="number" 
              placeholder="Stock actual" 
              value={form.stock} 
              onChange={e => setForm({...form, stock: e.target.value})} 
              required 
            />
            <input 
              type="number" 
              placeholder="Stock mínimo" 
              value={form.minimo} 
              onChange={e => setForm({...form, minimo: e.target.value})} 
            />
          </>
        )}

        <input 
          type="number" 
          step="0.01" 
          placeholder="Precio" 
          value={form.precio} 
          onChange={e => setForm({...form, precio: e.target.value})} 
          required={modo === 'checador'} 
        />
      </div>

      <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
        <button 
          type="submit" 
          style={{ padding: '8px 15px', cursor: 'pointer', background: productoEditar ? '#28a745' : '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {productoEditar ? 'Actualizar' : 'Guardar'}
        </button>
        {productoEditar && (
          <button 
            type="button" 
            onClick={onCancelar} 
            style={{ padding: '8px 15px', cursor: 'pointer', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px' }}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}