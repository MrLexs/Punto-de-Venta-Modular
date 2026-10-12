Requerimientos 

Funcionales 
•	RF-01: Iniciar sesión con PIN y validar el rol de acceso del usuario.
•	RF-02: Registrar una venta agregando productos por búsqueda o código de barras.
•	RF-03: Calcular el total y el cambio de la venta, guardarla e imprimir el ticket.
•	RF-04: Registrar y editar productos: código, nombre, existencia, mínimo y precios.
•	RF-05: Modificar el precio de venta de un producto ya registrado.
•	RF-06: Consultar las existencias y marcar los productos en o por debajo del mínimo.
•	RF-07: Consultar el precio vigente de un producto sin venderlo.
•	RF-08: Consultar los tickets del turno y el detalle de cada uno.
•	RF-09: Realizar el corte de caja al cierre del turno, calculando total de tickets e ingreso.
•	RF-10: Consultar el historial de cortes de caja de días anteriores.
•	RF-11: Administrar el nivel de acceso (ninguno, ver, editar) de cada rol por módulo.
No funcionales 
•	RNF-01: El sistema debe registrar una venta y calcular el cambio en menos de 2 segundos, incluso en horas pico.
•	RNF-02: El sistema debe operar en una computadora con lector de código de barras e impresora de tickets conectados.
•	RNF-03: El acceso a cada módulo debe restringirse según el rol del usuario, verificado mediante PIN.
•	RNF-04: Persistencia de datos local; el sistema debe conservar el historial aunque el equipo se apague.
•	RNF-05: Interfaz intuitiva que permita registrar una venta en tres pasos o menos.

Requisitos de seguridad 

•	Autenticación requerida: Todo usuario debe autenticarse mediante un PIN antes de acceder a cualquier funcionalidad. 
•	Autorización basada en Roles (RBAC): Restricción de operaciones. La empleada (Cajero) no debe poder cambiar precios ni modificar el inventario, solo el Dueño (Administrador) puede hacerlo. 
•	Seguridad de la información: Almacenamiento seguro en base de datos local SQLite para prevenir la pérdida de registros financieros (cortes y ventas). 
•	Validaciones Previstas: Evitar inyección de dependencias en las consultas locales SQLite y evitar el registro de precios negativos o en cero durante la gestión de productos. 
Casos de uso 
•	CU-01 Iniciar sesión con PIN: El usuario ingresa su PIN para acceder al sistema según su rol (Dueño o Cajero).
•	CU-02 y CU-03 Registrar venta y cobrar: El cajero arma el ticket escaneando productos, cobra, calcula el cambio, guarda la venta en BD y emite el ticket.
•	CU-04 y CU-05 Gestionar productos y precios: El dueño da de alta, edita existencias o modifica el precio de venta de los artículos del catálogo.
•	CU-06 Consultar existencias/faltantes: Revisión del inventario para detectar qué está por debajo del stock mínimo.
•	CU-09 y CU-10 Corte de caja: El cajero cierra su turno calculando el ingreso, y el dueño puede consultar el historial de días anteriores.
•	CU-11 Administrar permisos: El dueño define si un rol tiene acceso de tipo ninguno, ver, o editar sobre los distintos módulos.



Modelo entidad relación 

Relación	Tipo	Multiplicidad	Justificación
Negocio — Usuario	Asociación	1 / *	Un negocio agrupa a los usuarios que trabajan en él.
Usuario — Rol	Asociación	* / 1	Cada usuario tiene un único rol que define su nivel general de acceso.
Rol — Permiso	Asociación	1 / *	Un rol puede tener distintos permisos, uno por cada módulo.
Permiso — Modulo	Asociación	* / 1	Cada permiso aplica a un módulo específico.
Permiso — NivelAcceso	Asociación	— / —	El permiso usa la enumeración para fijar su nivel (ninguno, ver, editar).
Modulo ◁ subclases	Generalización	— / —	ModuloAlmacen, ModuloVentas, ModuloCorteCaja y ModuloChecadorPrecios comparten atributos y comportamiento comunes definidos en Modulo.
GestorModulos — Modulo	Agregación	1 / *	El gestor administra los módulos, pero un módulo puede existir sin depender exclusivamente del gestor activo.
ModuloAlmacen — Producto	Composición	1 / *	Los productos pertenecen exclusivamente al módulo de almacén; no tienen sentido fuera de él.
ModuloVentas — Venta	Composición	1 / *	Las ventas pertenecen exclusivamente al módulo de ventas.
Venta — DetalleVenta	Composición	1 / *	El detalle de una venta no existe sin la venta a la que pertenece.
DetalleVenta — Producto	Asociación	* / 1	Cada renglón de venta hace referencia a un producto del catálogo.
ModuloCorteCaja — CorteCaja	Composición	1 / *	Los cortes de caja pertenecen exclusivamente al módulo de corte de caja.
Modulo — BaseDatos	Dependencia	— / —	Todo módulo usa la base de datos para leer y guardar su información, pero no es dueño de ella.

