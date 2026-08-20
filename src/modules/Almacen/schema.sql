CREATE TABLE IF NOT EXISTS alm_productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 5,
    precio_compra REAL DEFAULT 0.0,
    precio_venta REAL DEFAULT 0.0,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
