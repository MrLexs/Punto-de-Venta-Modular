-- Tabla para registrar los tickets de venta generados en caja
CREATE TABLE IF NOT EXISTS vta_ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    pago_con REAL NOT NULL,
    cambio REAL NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Tabla para guardar los detalles o productos específicos de cada ticket
CREATE TABLE IF NOT EXISTS vta_detalle_ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    nombre_producto TEXT NOT NULL,
    precio_unitario REAL NOT NULL,
    cantidad INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES vta_ventas(id) ON DELETE CASCADE
);