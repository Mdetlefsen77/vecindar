# Spec Delta

## Purpose

Permite que un evento de dominio (incidente, requerimiento, mascota perdida) se comparta hacia un canal externo como un aviso breve con un link rastreable, para medir si eso mueve la adopción de la app sin exponer datos sensibles del evento ni depender de una integración automática.

## ADDED Requirements

### Requirement: Link rastreable por evento compartido
El sistema SHALL generar, para cada evento que se comparte, un código corto no enumerable asociado a la URL real de detalle del evento, y SHALL persistir ese código antes de que el link se entregue al usuario que comparte.

#### Scenario: Código no adivinable
- **WHEN** se genera un link rastreable para un evento
- **THEN** el código no sigue una secuencia predecible (no es un contador ni un id de base de datos expuesto directamente)

#### Scenario: Link persistido antes de compartir
- **WHEN** un gestor activa la acción de compartir sobre un evento
- **THEN** el link rastreable ya existe en el sistema antes de que se le muestre u ofrezca cualquier medio para enviarlo

### Requirement: Redirección y registro de clicks
Al visitarse un link rastreable desde un navegador, el sistema SHALL redirigir a la URL real del evento y SHALL registrar el click, incluyendo si existía una sesión activa en ese momento, sin registrar la IP ni el user-agent completo del visitante.

#### Scenario: Click sin sesión
- **WHEN** una persona sin sesión activa visita un link rastreable
- **THEN** el sistema registra el click marcado como sin sesión y la redirige hacia el flujo de autenticación con el destino original preservado

#### Scenario: Click con sesión activa
- **WHEN** una persona con sesión activa visita un link rastreable
- **THEN** el sistema registra el click marcado como con sesión y la redirige directamente al detalle del evento

### Requirement: Vista previa del link sin contenido protegido
Cuando un link rastreable es solicitado por un crawler de vista previa en vez de una persona, el sistema SHALL responder con metadatos de vista previa genéricos (o específicos del tipo de evento, nunca del contenido particular del evento) y SHALL NOT incluir descripción, ubicación exacta, fotos, ni datos de contacto del evento.

#### Scenario: Vista previa de un incidente
- **WHEN** un crawler de vista previa solicita un link rastreable de un incidente
- **THEN** la respuesta incluye un título y descripción genéricos de tipo "incidente" y no incluye la descripción cargada por quien reportó

### Requirement: Compartir un evento hacia un canal externo
El sistema SHALL ofrecer una acción para compartir manualmente un incidente, un requerimiento o una mascota perdida hacia un canal externo, visible para cualquier usuario autenticado de cualquier rol (decisión del dueño de producto, 2026-09-23: más difusión; el volumen lo limita el requirement "Un evento no se comparte dos veces"). Al activarse, SHALL componer un mensaje breve según la plantilla del tipo de evento y SHALL dejar registrado quién lo compartió y cuándo.

#### Scenario: Cualquier rol puede compartir
- **WHEN** un usuario con rol `VECINO` visita el detalle de un requerimiento, una mascota o un incidente con `visibleVecinos = true`
- **THEN** ve la acción de compartir

#### Scenario: Compartir un incidente
- **WHEN** un usuario activa la acción de compartir sobre un incidente con `visibleVecinos = true`
- **THEN** el sistema genera el link rastreable, compone el mensaje según la plantilla de incidente, y registra el evento como compartido por ese usuario en ese momento

#### Scenario: No se ofrece compartir un incidente restringido
- **WHEN** un incidente tiene `visibleVecinos = false`
- **THEN** la acción de compartir no está disponible para ese incidente

### Requirement: Un evento no se comparte dos veces
El sistema SHALL impedir que el mismo evento sea compartido por el mismo canal más de una vez.

#### Scenario: Intento de compartir un evento ya compartido
- **WHEN** un usuario intenta compartir un evento que ya fue marcado como compartido hacia el mismo canal
- **THEN** el sistema no genera una nueva publicación y comunica que ya fue compartido, por quién y cuándo

### Requirement: El mensaje compartido nunca incluye datos sensibles
El mensaje compuesto para compartir un evento SHALL incluir únicamente: tipo de evento, autor identificado como nombre más inicial de apellido (salvo que el usuario haya optado por no mostrarse), fecha, y el link rastreable. SHALL NOT incluir la descripción libre del evento, ubicación exacta, fotos o adjuntos, datos de contacto, ni nombres de terceros.

#### Scenario: Mensaje de mascota perdida sin foto ni contacto
- **WHEN** se comparte una mascota perdida
- **THEN** el mensaje generado no incluye la foto de la mascota ni el dato de contacto cargado

#### Scenario: Autor con opt-out
- **WHEN** el usuario que originó el evento optó por no mostrar su nombre
- **THEN** el mensaje generado no incluye su nombre ni inicial

### Requirement: Preservación del destino al autenticarse desde un link externo
Cuando una persona sin sesión llega a una ruta protegida a través de un link rastreable, el sistema SHALL preservar esa ruta como destino y SHALL redirigirla a ese mismo destino inmediatamente después de iniciar sesión o completar el registro.

#### Scenario: Login exitoso desde un link externo
- **WHEN** una persona con cuenta existente inicia sesión llegando desde un link rastreable
- **THEN** es redirigida al detalle del evento que originó el link, no a la pantalla de inicio

#### Scenario: Registro nuevo desde un link externo
- **WHEN** una persona sin cuenta completa el registro llegando desde un link rastreable, y la cuenta requiere aprobación
- **THEN** ve un mensaje claro de que su alta está pendiente de aprobación y qué va a pasar después, y el destino original queda asociado a su cuenta para cuando sea aprobada

### Requirement: Contexto antes de pedir login a un visitante externo
Una persona sin sesión que llega desde un link rastreable a una ruta protegida SHALL ver una pantalla que explica qué es la aplicación y ofrece registrarse o iniciar sesión, en lugar de un error de autorización o un formulario de login sin contexto.

#### Scenario: Visitante externo sin cuenta
- **WHEN** una persona sin sesión ni cuenta visita un link rastreable
- **THEN** ve una pantalla explicativa con las opciones de registrarse o iniciar sesión, no un error 401

### Requirement: Atribución de registro por canal externo
Cuando una cuenta se crea a partir de un flujo iniciado desde un link rastreable, el sistema SHALL registrar ese origen en la cuenta creada.

#### Scenario: Alta atribuida
- **WHEN** una persona se registra después de llegar desde un link rastreable
- **THEN** la cuenta creada queda marcada con ese origen de registro

### Requirement: El link deja de mostrar contenido si el evento deja de ser visible
El sistema SHALL NOT bypasear las reglas de visibilidad vigentes de un evento al redirigir desde un link rastreable: si el evento ya no es visible para quien hace click (por cambio de estado o de visibilidad posterior a haberse compartido), SHALL mostrarse un estado que indique que el contenido ya no está disponible, no el detalle del evento.

#### Scenario: Evento marcado como no visible después de compartido
- **WHEN** un incidente fue compartido y luego un gestor cambia su visibilidad a no visible para vecinos
- **THEN** una persona sin permisos de gestión que visite ese link ve un mensaje de contenido no disponible, no el detalle del incidente
