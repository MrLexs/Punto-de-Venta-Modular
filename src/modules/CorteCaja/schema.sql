-- Tabla para almacenar el historial de cortes de caja realizados
CREATE TABLE IF NOT EXISTS vta_cortes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_corte TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    total_tickets INTEGER NOT NULL,
    ingreso_total REAL NOT NULL
);