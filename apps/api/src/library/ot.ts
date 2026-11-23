export const OT_REFERENCE_BOOK = {
  id: "volume-13",
  category: "OT",
  title: "OT · Control y confianza industrial",
  pages: [
    {
      title: "Del dato al proceso físico",
      body: "La tecnología operacional observa y modifica procesos físicos mediante sensores, controladores y actuadores. Una estación de supervisión puede mostrar medidas mientras un controlador toma decisiones sobre salidas. La disponibilidad, la fiabilidad y las consecuencias de una orden forman parte del análisis de seguridad.\n\nConviene identificar qué equipo mide, cuál decide y cuál ejecuta. La pantalla de operación, el controlador y la estación de ingeniería tienen responsabilidades distintas. La guía NIST SP800-82r3 aborda la protección de estos entornos considerando sus requisitos operativos: https://csrc.nist.gov/pubs/sp/800/82/r3/final .",
    },
    {
      title: "Segmentación y canales de acceso",
      body: "Un entorno industrial puede conservar protocolos diseñados para redes de confianza. La conectividad no demuestra que una estación tenga permiso para leer o escribir todos los recursos de un controlador.\n\nLa defensa combina segmentación, servicios mínimos, autenticación y autorización junto a cada operación. Los accesos de mantenimiento requieren una política propia. Una pantalla que desactiva un control no impide que otra herramienta envíe una petición por un canal distinto; las restricciones deben mantenerse en el componente que ejecuta la acción.",
    },
    {
      title: "Direcciones, funciones y representaciones",
      body: "Un protocolo de control organiza las peticiones mediante funciones, direcciones, cantidades y valores. Los números de una documentación pueden expresarse en bases distintas, y las unidades del proceso pueden usar escalas diferentes de las que muestra la interfaz.\n\nAl analizar una captura conviene separar cabecera, operación y datos, conservando el orden de los bytes y la longitud declarada. La semántica de una dirección procede del mapa del dispositivo, no de su apariencia. Un dato interpretado con una escala equivocada puede producir una conclusión incorrecta aunque los bytes se hayan leído bien.",
    },
    {
      title: "Identidades durante la puesta en marcha",
      body: "La integración suele requerir cuentas temporales, pruebas y respaldos de configuración. Estos elementos deben revisarse antes de entregar el sistema. Una credencial inicial no se vuelve segura por estar descrita únicamente en documentación de servicio.\n\nLas cuentas de observación, operación e ingeniería necesitan capacidades diferentes. La identidad debe verificarse en el servidor y sus permisos deben comprobarse en cada acción. Las tareas de rotación y retirada de accesos forman parte de la entrega y deben poder auditarse. CWE1392 describe el uso de credenciales predeterminadas: https://cwe.mitre.org/data/definitions/1392.html .",
    },
    {
      title: "Información de proceso y datos reservados",
      body: "Los registros de operación pueden incluir parámetros, medidas, estados y datos auxiliares. No toda la información almacenada en un equipo necesita estar disponible para todos sus clientes. Un canal de lectura también constituye una frontera de autorización.\n\nLos secretos, los respaldos y los registros internos deben conservarse con permisos adecuados y separados de los datos de supervisión. Limitar escrituras no protege por sí mismo la confidencialidad. La revisión debe considerar tanto los servicios de gestión como los mecanismos de exportación y los mapas de memoria expuestos.",
    },
    {
      title: "Valores, escalas y límites",
      body: "Una consigna necesita validarse según su significado físico, no solo por su tipo de dato. Que un registro pueda representar un número no implica que ese número sea admisible para el proceso. Los rangos y las relaciones entre valores deben definirse en unidades explícitas.\n\nLos límites necesitan aplicarse donde se ejecuta la decisión, incluso si la interfaz ya filtra valores. Las alarmas también dependen de esa configuración. MITRE describe cómo la modificación de parámetros puede alterar el comportamiento previsto del proceso: https://attack.mitre.org/techniques/T0836/ .",
    },
    {
      title: "Programa, enclavamiento y prueba",
      body: "Un programa de control relaciona entradas, condiciones y salidas. Los enclavamientos impiden ciertas acciones cuando no se cumplen condiciones necesarias. Revisar un programa requiere entender qué situación intenta evitar cada condición, además de leer sus instrucciones.\n\nLas pruebas con combinaciones de entradas ayudan a detectar comportamientos indebidos. La transferencia de programas debe autorizarse y registrarse, y su integridad debe vincularse a un origen confiable. MITRE recoge la modificación de programas de control como técnica de ataque: https://attack.mitre.org/techniques/T0889/ .",
    },
    {
      title: "Autenticidad a lo largo de las versiones",
      body: "Una imagen auténtica puede pertenecer a una versión que ya no resulta aceptable. Verificar la firma y comprobar si esa versión mantiene la política de seguridad son decisiones diferentes.\n\nLos mecanismos de arranque y actualización pueden necesitar un contador de versión protegido y una recuperación que respete sus límites. Si un componente permite reducir ese contador, puede reintroducir código vulnerable aunque conserve una firma válida. CWE1328 describe esa debilidad en el control de versiones de seguridad: https://cwe.mitre.org/data/definitions/1328.html .",
    },
    {
      title: "Una orden necesita contexto temporal",
      body: "Una firma demuestra integridad y autenticidad de los campos protegidos, pero no determina automáticamente que la orden siga vigente. Una captura antigua puede conservar datos auténticos que ya produjeron su efecto o pertenecen a otra ventana operativa.\n\nEl receptor necesita comprobar secuencias, identificadores, destinatarios y vigencia según el protocolo. La defensa debe conservar el estado necesario para rechazar repeticiones y definir qué ocurre al reiniciar el dispositivo. CWE294 describe fallos de autenticación por captura y repetición de mensajes: https://cwe.mitre.org/data/definitions/294.html .",
    },
    {
      title: "Cambio controlado y recuperación",
      body: "La investigación de un incidente industrial debe relacionar peticiones, cambios de configuración y efectos observados. Una respuesta aceptada no basta para demostrar que se aplicó una salida; conviene contrastarla con el estado del controlador y las medidas disponibles.\n\nLos cambios legítimos requieren autorización, trazabilidad y una recuperación probada. El entorno de práctica puede restaurarse sin borrar las evidencias de una investigación. Las herramientas y formatos simplificados deben identificar qué comportamiento representan y qué aspectos del equipo real quedan fuera de su alcance.",
    },
  ],
};
