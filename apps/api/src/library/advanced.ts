import type { ReferenceBook } from "./catalog";
export const ADVANCED_BOOKS: ReferenceBook[] = [
  {
    id: "volume-19",
    category: "Cloud",
    title: "Cloud · Identidades, recursos y confianza",
    pages: [
      {
        title: "Responsabilidad y alcance",
        body: "La seguridad de una nube relaciona identidad, configuración de servicios, datos y operación. Un entorno de laboratorio puede reproducir decisiones de autorización sin ser una cuenta de un proveedor real.\n\nCada evaluación necesita delimitar servicios y recursos y registrar qué comportamiento se comprobó. Las simulaciones no acreditan compatibilidad con todas las políticas de una plataforma.",
      },
      {
        title: "Políticas e identidades",
        body: "Una identidad y una política de recurso pueden contribuir a una decisión de acceso. Es importante distinguir acciones, recursos, condiciones y relaciones entre cuentas.\n\nEn IAM de AWS una denegación explícita aplicable prevalece sobre permisos; un ejercicio de configuración no debe confundirse con un fallo de ese motor. El mínimo privilegio limita también el alcance de comodines.",
      },
      {
        title: "Almacenamiento público",
        body: "La publicación de una colección debe considerar todos los objetos que cubre la política, incluidos respaldos y archivos incorporados después. Un prefijo visible no delimita por sí solo el permiso.\n\nEl inventario y las reglas del servicio ayudan a detectar recursos que heredan una exposición no prevista. Ocultar una clave de objeto no sustituye la autorización.",
      },
      {
        title: "Secretos de funciones",
        body: "Las variables de entorno y configuraciones pueden contener datos que requieren permisos distintos a los metadatos públicos. Las vistas de diagnóstico merecen la misma revisión que la ejecución.\n\nLa gestión de secretos limita lectura, rotación y uso. Los registros y exportaciones también pueden conservar valores después de que se retire su exposición inicial.",
      },
      {
        title: "Enlaces y capacidades",
        body: "Un enlace firmado concede una capacidad definida por los campos que autentica. Su validación debe relacionar recurso, acción, destinatario y vigencia según el diseño.\n\nUna firma válida no protege campos omitidos de su construcción. La prueba de un enlace necesita preservar bytes y explicar qué partes se pueden cambiar sin invalidar la firma.",
      },
      {
        title: "Identidades federadas",
        body: "La federación necesita comprobar emisor, destinatario y sujeto, además de la autenticidad del token. Cada campo responde a una pregunta distinta sobre la confianza.\n\nLas condiciones deben limitar quién obtiene una identidad y con qué alcance. Compartir un emisor no implica que todas sus credenciales tengan el mismo propósito.",
      },
      {
        title: "Metadata y redes internas",
        body: "La capacidad de una aplicación para consultar recursos puede acercarla a servicios de identidad internos. La protección depende de permisos, red y controles del protocolo.\n\nLos ensayos didácticos deben indicar cuándo una dirección es simbólica. No es necesario realizar conexiones externas para estudiar una decisión incorrecta de alcance.",
      },
      {
        title: "Claves y contexto",
        body: "Autorizar una operación criptográfica no equivale a autorizar todos los datos que procesa. Los grants y condiciones de contexto pueden separar dominios de uso.\n\nUna simulación de autorización de claves no implementa un proveedor KMS. Las conclusiones deben limitarse a las comprobaciones que realmente se observaron.",
      },
      {
        title: "Roles y cadenas de permisos",
        body: "Un conjunto de permisos modestos puede permitir una acción más amplia cuando se combinan servicios y roles. Pasar una identidad a un servicio introduce una relación de confianza adicional.\n\nLa revisión necesita seguir la cadena completa, incluyendo roles aceptados y código o tareas que pueden ejecutarse bajo esa identidad. Los permisos se evalúan en cada paso.",
      },
      {
        title: "Eventos, copias y procedencia",
        body: "Los eventos de una cola y las instantáneas compartidas conservan una procedencia que no debe confundirse con autoridad. La confianza en el transporte no autoriza todo recurso nombrado dentro del mensaje.\n\nUna recuperación requiere comprobar propietario, cuenta, región, cifrado y destino. La revisión de exposición incluye copias e imágenes, no solo los datos activos.",
      },
    ],
  },
  {
    id: "volume-20",
    category: "Contenedores y DevOps",
    title: "Contenedores y DevOps · Builds, permisos y procedencia",
    pages: [
      {
        title: "Construcciones reproducibles",
        body: "Una construcción relaciona fuentes, dependencias, herramientas y parámetros. La imagen final es solo una parte de esa historia.\n\nRegistrar digests y versiones ayuda a reproducir y auditar un resultado. Una etiqueta humana puede cambiar de destino sin que cambie su nombre.",
      },
      {
        title: "Secretos del build",
        body: "Los argumentos y variables pueden persistir en imágenes, metadatos o registros del proceso de construcción. No son un mecanismo apropiado para transportar secretos duraderos.\n\nLos mecanismos de secretos del constructor permiten limitar su exposición durante una etapa. Aun así, el proceso debe evitar copiar o registrar el contenido sensible.",
      },
      {
        title: "Usuarios y capacidades",
        body: "El usuario predeterminado de la imagen puede ser sobrescrito al desplegar. Evaluar privilegios requiere mirar el estado efectivo y las capacidades disponibles.\n\nLa configuración debe limitar acceso al anfitrión y a servicios. Un UID por sí solo no describe todos los permisos ni garantiza aislamiento.",
      },
      {
        title: "Secretos de orquestación",
        body: "Una representación Base64 codifica bytes; no los cifra. Los objetos de configuración requieren controles de lectura, registros y una política de gestión de secretos.\n\nLa protección depende también del almacenamiento y del alcance de las cuentas que consultan la API. Una exportación de un objeto puede ampliar su exposición.",
      },
      {
        title: "Eventos y pipelines",
        body: "Las reglas de un pipeline determinan qué fuentes y eventos pueden activar trabajos. No todas las contribuciones tienen el mismo nivel de confianza.\n\nSeparar pruebas de despliegue y revisar las credenciales disponibles por evento evita que un trabajo de validación herede privilegios de publicación.",
      },
      {
        title: "Capas y whiteouts",
        body: "Una vista final puede ocultar archivos conservados en capas inferiores. La eliminación de una entrada de la vista no elimina necesariamente todos sus bytes de la historia.\n\nEl análisis necesita distinguir el formato nativo de una exportación didáctica. Los digests deben calcularse sobre la representación exacta que describe el manifiesto.",
      },
      {
        title: "Atestaciones",
        body: "Una declaración de procedencia solo aporta confianza cuando se verifica su integridad y se evalúa su contenido contra una política. Un campo que dice trusted no se autentica por sí mismo.\n\nLa firma, el repositorio, el constructor y el artefacto deben quedar relacionados. Una firma válida de otro proyecto no autoriza una publicación en el proyecto examinado.",
      },
      {
        title: "Etapas y contexto",
        body: "Las construcciones por etapas reducen contenido, pero una copia demasiado amplia puede volver a introducir archivos de trabajo o secretos.\n\nLas rutas, filtros y directorios de salida forman parte del diseño. Hay que revisar qué bytes atraviesan cada límite, sin asumir que una etapa final pequeña sea automáticamente segura.",
      },
      {
        title: "Permisos del runner",
        body: "Los permisos del runner y las cuentas de servicio pueden alcanzar recursos de otros espacios. Kubernetes RBAC combina autorizaciones de forma aditiva.\n\nLos bindings de ámbito global y los de namespace tienen efectos distintos. La revisión debe relacionar sujetos, roles, verbos y recursos de manera explícita.",
      },
      {
        title: "Cachés e integridad",
        body: "Un caché acelera construcciones, pero su clave debe representar los elementos que afectan al resultado y su origen debe estar controlado.\n\nUna coincidencia de clave no demuestra equivalencia de dependencias o fuentes. Los hits y los artefactos consumidos deben poder trazarse hasta su contexto de construcción.",
      },
    ],
  },
  {
    id: "volume-21",
    category: "Seguridad de IA",
    title: "Seguridad de IA · Contexto, herramientas y autorización",
    pages: [
      {
        title: "Datos y autoridad",
        body: "Un sistema con modelos o agentes recibe instrucciones y también datos no confiables. El diseño debe impedir que el contenido de una fuente adquiera permisos por aparecer en el contexto.\n\nLos ejercicios del laboratorio usan un protocolo determinista de mensajes y herramientas. Eso permite reproducir fallos de integración sin prometer el comportamiento de un modelo comercial.",
      },
      {
        title: "Roles de mensajes",
        body: "Los roles representan niveles de confianza definidos por la aplicación. Permitir que el cliente elija un rol privilegiado rompe ese límite antes de consultar al modelo.\n\nLa pasarela necesita construir mensajes de control en el servidor. Las etiquetas recibidas de usuarios o documentos siguen siendo datos hasta que una política les conceda autoridad.",
      },
      {
        title: "Inyección indirecta",
        body: "Un documento recuperado o una página de búsqueda puede contener texto que intenta dirigir al agente. La procedencia de ese contenido importa tanto como su formato.\n\nEl acceso a herramientas y recursos debe depender de una autorización externa al documento. Un resultado de búsqueda no puede aprobar su propia ejecución.",
      },
      {
        title: "Plantillas y delimitadores",
        body: "Los delimitadores de texto ayudan a representar secciones, pero una colisión puede alterar un parser o una interpretación posterior. No forman por sí solos un control de acceso.\n\nUna integración necesita preservar estructura y contexto. Los campos de datos no deben convertirse en mensajes de control simplemente al concatenar cadenas.",
      },
      {
        title: "Uso de salidas",
        body: "Una salida que parece JSON no se vuelve confiable por su sintaxis. Las llamadas a herramientas necesitan validar parámetros y permisos antes de actuar.\n\nLa aplicación debe decidir qué acciones requieren aprobación y cómo se relaciona esa aprobación con el usuario y la operación concreta.",
      },
      {
        title: "Fuentes y RAG",
        body: "Una colección o un título son metadatos de organización, no una firma del contenido. La recuperación debe conservar procedencia y controles de publicación.\n\nLos documentos no deben ampliar el alcance de un agente. Las reglas de acceso al contenido y a las herramientas se evalúan de manera independiente.",
      },
      {
        title: "Memoria y separación",
        body: "Las claves de caché y los historiales necesitan separar identidades y dominios de acceso. Compartir un nombre de sesión puede mezclar datos si falta contexto de autorización.\n\nLa retención, invalidación y lectura deben diseñarse juntas. La información preservada de un escenario no es una conversación real de otro participante.",
      },
      {
        title: "Herramientas y normalización",
        body: "Una herramienta introduce un límite entre instrucciones del agente y operaciones concretas. Las rutas y los argumentos deben validarse en su representación efectiva.\n\nAutorizar antes de normalizar puede producir decisiones sobre un recurso distinto del que finalmente se usa. La herramienta no debe heredar todos los permisos de la aplicación.",
      },
      {
        title: "Aprobaciones vinculadas",
        body: "Una aprobación debe quedar ligada a recurso, operación, identidad y vigencia. Reutilizar una autorización de consulta para otra acción amplía su significado sin permiso.\n\nLa integridad de un recibo y la autorización de su uso son comprobaciones diferentes. Las operaciones críticas necesitan reglas verificables fuera de la generación de texto.",
      },
      {
        title: "Delegación entre agentes",
        body: "La delegación puede cambiar qué capacidades intervienen en una tarea. Un agente limitado no debe otorgarse capacidades nuevas mediante datos de un resultado.\n\nLos handoffs y sus trazas necesitan vincular contexto, recursos y permisos. OWASP GenAI trata la inyección de instrucciones y la agencia excesiva como riesgos de la integración completa.",
      },
    ],
  },
  {
    id: "volume-22",
    category: "Redes inalámbricas",
    title: "Redes inalámbricas · Identidad, asociaciones y radio",
    pages: [
      {
        title: "Observación de radio",
        body: "Una captura describe lo observado desde un punto y periodo concretos. La ausencia de un paquete no demuestra ausencia de actividad fuera de ese alcance.\n\nEl laboratorio utiliza exportaciones de paquetes preservadas; no activa radios ni afirma compatibilidad PCAP. Los campos y limitaciones se indican en cada expediente.",
      },
      {
        title: "SSID y BSSID",
        body: "Un nombre de red es una etiqueta visible para el usuario. El identificador de un punto de acceso describe una interfaz y requiere contexto de inventario.\n\nLa repetición de nombres puede ser legítima en una red distribuida. La evaluación debe comparar configuración, procedencia y activos autorizados, no solo texto.",
      },
      {
        title: "Privacidad y RSN",
        body: "Los anuncios de una red contienen capacidades y elementos de seguridad. Su interpretación requiere distinguir la información anunciada de lo que finalmente se negocia.\n\nUn indicador aislado no describe toda la protección del tráfico. Los controles deben comprobarse dentro de la asociación y del protocolo correspondiente.",
      },
      {
        title: "Sondas e identidad exterior",
        body: "Las solicitudes y los intercambios de autenticación pueden revelar metadatos de configuración o identidad. Su exposición depende del protocolo y de las opciones usadas.\n\nEl análisis debe conservar el ámbito de estación y sesión para evitar atribuir un nombre o una identidad a otro dispositivo.",
      },
      {
        title: "Bluetooth y GATT",
        body: "Los permisos de una característica GATT y la seguridad del enlace son dimensiones relacionadas pero distintas. El permiso de escritura debe evaluarse junto a autenticación y cifrado.\n\nLa enumeración de servicios no implica autorización para modificar datos. El laboratorio analiza políticas exportadas, sin emparejar equipos reales.",
      },
      {
        title: "Emparejamiento",
        body: "Las modalidades de emparejamiento ofrecen garantías diferentes frente a adversarios. Hay que considerar las capacidades de entrada y salida y la política esperada.\n\nLas conclusiones deben basarse en ambos extremos del intercambio. El nombre de una modalidad no sustituye la comprobación de parámetros negociados.",
      },
      {
        title: "Tramas de gestión",
        body: "La protección de tramas de gestión requiere negociación y soporte adecuados. La evaluación distingue asociación, política y tramas concretas observadas.\n\nLos ensayos sobre registros no realizan desconexiones. Un campo protegido debe interpretarse dentro de su contexto de protocolo y estado de asociación.",
      },
      {
        title: "Autenticación, movilidad y servicio",
        body: "Una asociación y un Access-Accept no garantizan conectividad de aplicación. En conmutación local, el tráfico debe atravesar el uplink del punto de acceso con la segmentación asignada; la renovación de direcciones y el servicio de aplicación añaden dependencias distintas.\n\nUn cambio se valida con movilidad y clientes ya conectados, además de altas nuevas. Mantener la conectividad legítima y rechazar accesos entre segmentos son criterios simultáneos. El candidato, la configuración aplicada y las trazas de prueba deben distinguirse.",
      },
      {
        title: "Identidades BLE y permisos de aplicación",
        body: "Una dirección privada puede cambiar sin que cambie la identidad aprovisionada del equipo. La resolución de identidad utiliza información de confianza del bond; un fabricante, UUID o dirección observada no reemplaza esa relación.\n\nLa seguridad de enlace, la autorización de una característica y la autenticidad de una actualización son controles distintos. Una revisión debe conservar telemetría y mantenimiento autorizado, y comprobar que un cliente sin aprovisionar, un emparejamiento sin autenticación o una imagen sin firma no ganan capacidades indebidas.",
      },
      {
        title: "Certificados y confianza",
        body: "EAP-TLS debe verificar la identidad del servidor mediante cadena de confianza, nombres permitidos del SAN, propósito del certificado y vigencia. Una CA de confianza y un certificado final no son intercambiables: fijar únicamente el certificado final puede romper la renovación o el segundo servidor legítimo.\n\nLa revocación requiere una política explícita y datos utilizables. Las pruebas deben incluir servidores legítimos distintos y rechazos de raíz ajena, nombre incorrecto, caducidad y credenciales revocadas. Desactivar validaciones para recuperar conectividad deja sin resolver el problema de seguridad.",
      },
    ],
  },
  {
    id: "volume-23",
    category: "Forense de memoria",
    title: "Forense de memoria · Procesos, regiones y adquisición",
    pages: [
      {
        title: "Adquirir memoria",
        body: "Una adquisición conserva un estado parcial de un sistema en un momento concreto. La herramienta, el alcance y los cambios durante la captura afectan lo que puede concluirse.\n\nLos snapshots del juego son exportaciones didácticas de procesos y regiones, no volcados nativos de Windows o Linux. Se analizan sin leer la memoria del anfitrión.",
      },
      {
        title: "Listas y exploración",
        body: "Una lista activa y un recorrido de objetos pueden mostrar conjuntos diferentes. Los objetos terminados pueden permanecer un tiempo y necesitan contexto temporal.\n\nLa diferencia entre dos vistas no basta por sí sola para atribuir ocultación. Hay que considerar creación, salida, identidad y cobertura de la adquisición.",
      },
      {
        title: "Conexiones y propietarios",
        body: "Los endpoints de red se relacionan con procesos mediante datos preservados que pueden estar incompletos o haber sido reutilizados.\n\nUn estado de escucha no demuestra una conexión establecida. La atribución necesita identidad y tiempos, además de PID y dirección remota.",
      },
      {
        title: "Líneas de comando",
        body: "Una línea de comandos puede incluir texto codificado y parámetros de interpretación. Decodificar una representación no exige ejecutar la instrucción.\n\nLa codificación de bytes y el formato de texto deben conservarse. UTF16LE y UTF8 pueden producir interpretaciones distintas del mismo Base64.",
      },
      {
        title: "Handles y objetos",
        body: "Un handle relaciona un proceso con un objeto mediante derechos y un ámbito concretos. Un nombre puede permanecer en memoria después de cambiar en disco.\n\nLa lectura debe separar el objeto observado de inferencias sobre su uso. Las rutas y los tipos de objeto ayudan a descartar coincidencias que no responden a la pregunta.",
      },
      {
        title: "Regiones y permisos",
        body: "Las regiones de memoria tienen procedencia, permisos y contenido. Un área privada ejecutable merece revisión, pero no es una prueba automática de código malicioso.\n\nLos análisis heurísticos deben explicar sus criterios y límites. Un prefijo de bytes no valida por sí solo una imagen ejecutable completa.",
      },
      {
        title: "Identidad temporal de procesos",
        body: "Los PID pueden reutilizarse. Un padre aparente puede corresponder a una instancia creada después del hijo si solo se mira el número.\n\nLos GUID y tiempos de creación ayudan a distinguir instancias. La reconstrucción debe comprobar coherencia temporal en lugar de asumir que el estado actual representa toda la historia.",
      },
      {
        title: "Tokens y privilegios",
        body: "La identidad esperada de un proceso y los atributos del token efectivo pueden diferir. Un privilegio listado no equivale necesariamente a estar habilitado.\n\nLa evaluación relaciona contexto de proceso, identidad y estado del privilegio. El laboratorio usa identificadores ficticios y no extrae credenciales del equipo real.",
      },
      {
        title: "Páginas y buffers",
        body: "El orden físico de fragmentos puede diferir del orden virtual. Los offsets, longitudes, estado de asignación y bytes sobrantes importan al reconstruir un buffer.\n\nLa integridad se verifica sobre los bytes del rango lógico. Los fragmentos pendientes o residuos no deben incorporarse solo porque produzcan texto legible.",
      },
      {
        title: "Versiones y diarios",
        body: "Una reconstrucción incremental necesita una base verificable y una secuencia de cambios comprometidos. El orden y la integridad de cada paso permiten detectar mezclas de versiones.\n\nEl estado pendiente no representa necesariamente lo adquirido como válido. La interpretación debe declarar el formato utilizado y las comprobaciones que realmente se aplicaron.",
      },
    ],
  },
];
