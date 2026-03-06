# Sistema de Administración de Barrio
**Fecha:** 18/02/2026

---

## 1. Login + Registro (con control de barrio)

### Objetivo
Asegurar que solo entren residentes o usuarios autorizados al sistema.

### Incluye
* **Login:** Acceso mediante email y contraseña.
* **Registro:** Validación mediante código de invitación (por unidad/lote) o aprobación por administrador.
* **Datos mínimos:** Nombre, unidad, área, latitud/longitud y teléfono.
* **Roles básicos:**
    * Vecino
    * Admin (Administración)
    * Seguridad/Guardia (si aplica)

### Pantallas
* Login
* Registro
* Recuperar contraseña
* Perfil

---

## 2. Botón Pánico (SOS)

### Objetivo
Alertar de forma inmediata enviando ubicación y evidencia a los responsables.

### Incluye
* **Botón principal:** Interfaz destacada tipo “SOS”.
* **Activación segura:** Mantener presionado 2–3s + vibración de confirmación (evita falsos positivos).
* **Envío de datos:** Ubicación GPS, usuario + unidad y marca de tiempo (*timestamp*).
* **Estados:** Enviado, recibido por seguridad/admin, cerrado.
* **Historial:** Sección de "Mis alertas" para el usuario.
* **Panel de recepción:** Vista para admin/guardia con listado de alertas activas y mapa.
* **Notificaciones:** En MVP vía email y notificaciones *push* internas (Firebase opcional).

---

## 3. Zona de calor según robos / incidentes

### Objetivo
Visualizar incidentes en un mapa para detectar zonas críticas y tendencias.

### Incluye
* **Reporte de incidente:** Formulario para vecino o admin incluyendo tipo (robo, intento, sospechoso, vandalismo, etc.).
* **Ubicación:** Selección vía GPS o pin manual en mapa.
* **Detalles:** Descripción y fotografía opcional.
* **Visibilidad:** Configurable como “solo admin” o “visible a vecinos” según política del barrio.
* **Visualización:** Mapa con puntos y/o mapa de calor (*heatmap*).
* **Filtros:** Por tipo de incidente y rango de fechas (7, 30 o 90 días).

### Implementación Técnica
* **Mapas:** OpenStreetMap + Leaflet.
* **Heatmap:** Plugin de Leaflet o *clustering* (agrupamiento) para el MVP.

> **Nota:** El mapa de calor real requiere volumen de datos. Si al inicio hay pocos reportes, se recomienda usar pines con clustering y activar el heatmap más adelante.

---

## 4. Requerimientos del barrio (pedidos / reclamos / sugerencias)

### Objetivo
Canalizar solicitudes de mantenimiento y servicios (iluminación, poda, calles, etc.).

### Incluye
* **Creación:** Categoría, descripción y foto opcional.
* **Flujo de estados:** Nuevo → En progreso → Resuelto → Cerrado.
* **Gestión:** Comentarios y actualizaciones de estado por parte del administrador.
* **Vistas:** Listado general del barrio y sección de “Mis requerimientos”.

---

## 5. Mascotas perdidas

### Objetivo
Publicación rápida y comunitaria para el hallazgo de mascotas.

### Incluye
* **Publicar:** Ficha con foto, nombre, descripción, zona de contacto y estado (perdida/encontrada).
* **Feed:** Listado cronológico con filtros de búsqueda.
* **Notificaciones:** Alerta interna y aviso por email opcional.