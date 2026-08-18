CREATE TABLE IF NOT EXISTS chp_productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE,
  nombre TEXT NOT NULL,
  precio REAL NOT NULL DEFAULT 0
);

-- Un par de productos de ejemplo para que la pantalla no se vea vacia
-- la primera vez que activas el modulo.
INSERT OR IGNORE INTO chp_productos (codigo, nombre, precio) VALUES
  ('001', 'Refresco 600ml', 18.50),
  ('002', 'Bolsa de papas', 22.00),
  ('003', 'Agua natural 1L', 15.00);
