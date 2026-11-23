export const IOT_REFERENCE_BOOK = {
  id: "volume-12",
  category: "IoT",
  title: "IoT · Dispositivos y confianza",
  pages: [
    {
      title: "Un dispositivo también es un sistema",
      body: "Un equipo conectado combina hardware, firmware, almacenamiento, interfaces físicas y servicios de red. Su pantalla muestra solo una parte de sus capacidades: pueden existir protocolos de impresión, telemetría, diagnóstico o actualización que no aparecen en el menú habitual.\n\nEl inventario debe relacionar fabricante, modelo, versión, función y responsables. Conviene registrar qué servicios son necesarios y qué información conservan. La identificación del dispositivo, la protección de datos, la configuración, el control de acceso y las actualizaciones forman parte de su seguridad durante todo el ciclo de vida.",
    },
    {
      title: "Identidad, instalación y mantenimiento",
      body: "Las credenciales entregadas durante la instalación facilitan la puesta en marcha, pero requieren rotación y protección. Una contraseña deducible a partir de información visible no adquiere fortaleza por cambiar entre equipos.\n\nEl acceso de servicio debe tener permisos limitados, caducidad cuando sea posible y trazabilidad. Los manuales públicos pueden describir operaciones de mantenimiento sin convertirse en un repositorio de secretos vigentes. El proceso de entrega debe comprobar que se retiraron cuentas temporales y configuraciones iniciales.",
    },
    {
      title: "Documentos que permanecen",
      body: "Una impresora multifunción puede conservar trabajos pendientes, documentos escaneados, destinos y libretas de direcciones. El final de una operación no implica necesariamente el borrado de todas sus copias.\n\nLa privacidad requiere controlar por separado quién lista, consulta, libera y elimina documentos. Los nombres y metadatos también pueden revelar información. Las políticas de retención, el cifrado del almacenamiento y el borrado verificable al retirar un equipo reducen la exposición de datos persistentes.",
    },
    {
      title: "Servicios y lenguajes de impresión",
      body: "Los sistemas de impresión pueden recibir peticiones mediante protocolos diferentes. IPP define objetos, operaciones y atributos; otros canales pueden aceptar lenguajes de trabajo o instrucciones de control del dispositivo. Permitir imprimir no debería equivaler a permitir administrar el equipo.\n\nLos atributos aportados por un cliente describen su petición, pero su fiabilidad depende de cómo se autenticó al emisor. Un nombre declarado necesita vincularse a una identidad comprobada. La referencia para el modelo y la semántica de IPP es RFC 8011: https://www.rfc-editor.org/info/rfc8011/ .",
    },
    {
      title: "Respaldos y superficie de soporte",
      body: "Una copia de configuración puede incluir direcciones, usuarios, destinos y datos de autenticación. Ocultar su enlace en la interfaz no determina quién puede descargarla. Cada ruta de exportación necesita controles de acceso propios.\n\nLos mecanismos de soporte deben publicar únicamente la información necesaria, limitar su vigencia y permitir revocar accesos. Conviene proteger las copias durante transferencia y almacenamiento, evitar secretos reutilizables y registrar las exportaciones. Las pruebas de restauración también deben verificar que no reaparezcan configuraciones inseguras.",
    },
    {
      title: "Publicaciones y datos retenidos",
      body: "MQTT organiza la comunicación en torno a publicaciones y suscripciones por temas. Un mensaje retenido puede entregarse a futuros suscriptores cuyo filtro coincida; esa capacidad sirve para distribuir estados actuales, pero exige revisar qué datos permanecen disponibles.\n\nLa autorización debe considerar quién publica y quién se suscribe en cada ámbito. Cifrar el transporte no decide por sí mismo qué información puede recibir una identidad. La retención, la expiración y el alcance de las suscripciones deben diseñarse juntos. Referencia: MQTT 5.0 de OASIS, https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html .",
    },
    {
      title: "Integridad y contexto de un mensaje",
      body: "Una firma o un código de autenticación protege exactamente los datos que intervienen en su cálculo. El resto del sobre, incluidos destinos, identidades o metadatos de transporte, puede quedar fuera de esa garantía.\n\nEl receptor debe vincular el contenido con su propósito, destinatario, origen y vigencia. Un contador o un identificador de época puede ayudar a detectar repeticiones, siempre que se compruebe y conserve de forma adecuada. La codificación y la compresión cambian la representación; no aportan autenticidad por sí mismas.",
    },
    {
      title: "Actualizaciones con una raíz de confianza",
      body: "Una actualización segura relaciona el software recibido con un origen autorizado y con el dispositivo que lo va a instalar. La integridad de una imagen y la autenticidad de su manifiesto son comprobaciones distintas; el diseño necesita vincularlas.\n\nTambién conviene controlar compatibilidad, versión, recuperación y posibles retrocesos. Una firma válida no corrige una política que permita estados inseguros. NISTIR 8259A incluye la actualización mediante mecanismos seguros y configurables entre las capacidades básicas de los dispositivos: https://csrc.nist.gov/pubs/ir/8259/a/final .",
    },
    {
      title: "Cuando dos componentes interpretan una dirección",
      body: "Una dirección estructurada puede contener esquema, credenciales, nombre de servidor, puerto, ruta y parámetros. Comparar una cadena por su apariencia o por un prefijo no equivale a interpretar sus componentes.\n\nLa validación y el cliente que realiza la transferencia deben compartir una interpretación coherente. Conviene limitar esquemas y destinos, considerar redirecciones y revisar el resultado de la resolución. Los dispositivos que envían documentos a otros servicios necesitan controles que impidan utilizar esa función para alcanzar recursos ajenos a su propósito.",
    },
    {
      title: "Observar, reducir y retirar",
      body: "El endurecimiento de un dispositivo empieza por reducir servicios, separar redes, asignar permisos y mantener versiones soportadas. Los registros de cambios, accesos y fallos permiten comprobar qué ocurrió sin convertir el diagnóstico en otra fuente de exposición.\n\nLa retirada debe revocar credenciales, borrar datos y retirar el equipo de inventarios y sistemas de gestión. Una revisión útil combina configuración, comportamiento y evidencia preservada. Las recomendaciones generales necesitan adaptarse al contexto del producto y a las consecuencias de una pérdida de disponibilidad o de información.",
    },
  ],
};
