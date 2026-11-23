import type { ReferenceBook } from "./catalog";
export const SPECIALIST_BOOKS: ReferenceBook[] = [
  {
    id: "volume-15",
    category: "Seguridad de APIs",
    title: "Seguridad de APIs · Contratos, identidades y límites",
    pages: [
      {
        title: "Un recurso tiene propietario",
        body: "La identidad autenticada y el identificador de un objeto resuelven preguntas diferentes. Cada lectura o cambio debe autorizarse para la persona, acción y recurso concretos. Un identificador difícil de adivinar no reemplaza esa decisión.\n\nLas pruebas comparan usuarios y organizaciones distintos, incluyendo operaciones de listado y exportación. Una interfaz que oculta enlaces no garantiza que las rutas estén protegidas.",
      },
      {
        title: "Funciones y roles",
        body: "La autorización de una función debe comprobarse donde se ejecuta. Separar menús por perfil ayuda a organizar la interfaz, pero no impide construir una petición directa.\n\nEl mínimo privilegio se aplica también a funciones administrativas, versiones antiguas y tareas de servicio. Conviene inventariar rutas y revisar permisos de cada método.",
      },
      {
        title: "Propiedades de lectura y escritura",
        body: "Un modelo interno suele contener más campos que una respuesta pública. El contrato de salida debe seleccionar propiedades según su finalidad y los permisos del solicitante.\n\nLa entrada también necesita una lista explícita de propiedades editables. Vincular objetos completos puede permitir cambios de campos que pertenecen al servidor.",
      },
      {
        title: "Reglas del negocio",
        body: "Una API no solo necesita validar tipos: debe aplicar cantidades, transiciones y límites del negocio. El estado compartido debe protegerse ante repeticiones y operaciones concurrentes.\n\nLas pruebas deben verificar resultados de la operación. Los límites del navegador o un mensaje de validación no prueban que el servidor aplique la misma política.",
      },
      {
        title: "Salidas hacia otros servicios",
        body: "Una función de vista previa o importación puede consultar recursos en nombre del usuario. Esa capacidad necesita límites de origen, resolución, redirección y protocolos.\n\nEl diseño debe evitar convertir entradas externas en acceso arbitrario a servicios internos. Las pruebas didácticas pueden reproducir decisiones de autorización sin efectuar conexiones reales.",
      },
      {
        title: "Inventario y versiones",
        body: "Las versiones antiguas siguen siendo superficie de exposición mientras continúan accesibles. Documentación, gateways y servicios desplegados pueden divergir.\n\nEl inventario relaciona rutas, métodos, propietarios y reglas de retiro. Una versión heredada necesita controles y seguimiento hasta su eliminación efectiva.",
      },
      {
        title: "Tokens y confianza",
        body: "Decodificar un token permite leer su contenido; validarlo exige verificar firma, algoritmo permitido, emisor, destinatario y vigencia según el protocolo. Las afirmaciones no se vuelven confiables por estar codificadas.\n\nLa selección del algoritmo debe responder a una política del servidor. El contexto de organización y los alcances deben evaluarse después de establecer la autenticidad.",
      },
      {
        title: "Parsers que discrepan",
        body: "Distintos componentes pueden interpretar de modo diferente parámetros repetidos, rutas y estructuras de entrada. Un control realizado sobre una interpretación no protege necesariamente otra.\n\nLa solución necesita un contrato de normalización único y rechazo de entradas ambiguas. Los registros deben conservar suficientes datos para reproducir la petición original.",
      },
      {
        title: "Datos recibidos de proveedores",
        body: "Un dato de un tercero puede ser erróneo, incompleto o manipulado. La integración necesita comprobar estructura, procedencia, integridad y relación con la operación pendiente.\n\nLa autenticidad y la validez de negocio son controles distintos. Una respuesta auténtica tampoco autoriza un cambio de precio, destino o estado fuera de las reglas del sistema.",
      },
      {
        title: "Probar y registrar",
        body: "Un comprobante de laboratorio demuestra el comportamiento de una versión del simulador. Una evaluación real debe registrar método, contexto, límites y datos utilizados, evitando filtrar secretos en los informes.\n\nOWASP API Security Top 10:2023 ofrece un marco de riesgos; los casos pueden cubrir varias categorías y no equivalen automáticamente a una vulnerabilidad de un producto concreto.",
      },
    ],
  },
  {
    id: "volume-16",
    category: "Análisis de malware",
    title: "Análisis de malware · Evidencia estática y comportamiento",
    pages: [
      {
        title: "Conservar la muestra",
        body: "La adquisición registra origen, tamaño, resumen y método de obtención. El análisis se realiza sobre una copia y se separa el material observado de las conclusiones.\n\nUna exportación de cadenas o telemetría no es el ejecutable completo. Las limitaciones del formato deben quedar claras para no atribuir capacidades no observadas.",
      },
      {
        title: "Cadenas e indicadores",
        body: "Las cadenas visibles ayudan a localizar rutas, dominios, mensajes y parámetros. Pueden incluir señuelos, recursos legítimos o texto nunca utilizado.\n\nUn indicador gana valor al relacionarlo con llamadas, configuración y telemetría. Una coincidencia textual por sí sola no demuestra ejecución ni actividad de red.",
      },
      {
        title: "Persistencia",
        body: "Las entradas de inicio, servicios y tareas pueden mantener software entre sesiones o reinicios. Esas funciones también tienen usos legítimos.\n\nLa evaluación relaciona imagen, ruta, creador, momento y contexto. Conviene documentar tanto los indicios de abuso como las explicaciones alternativas que se descartaron.",
      },
      {
        title: "Configuración codificada",
        body: "Base64, hexadecimal y otras representaciones facilitan transportar datos. No prueban por sí solas intención maliciosa ni confidencialidad.\n\nEl orden de las transformaciones y la codificación de texto afectan al resultado. La evidencia original debe conservarse junto con los pasos reproducibles de decodificación.",
      },
      {
        title: "Ofuscación",
        body: "Operaciones como XOR o permutaciones pueden dificultar la lectura de una configuración. El análisis estático reconstruye la transformación sin ejecutar instrucciones de la muestra.\n\nEs importante distinguir bytes de caracteres y conservar el material antes y después de cada paso. Una transformación que produce texto legible todavía necesita validación contextual.",
      },
      {
        title: "Reglas de clasificación",
        body: "Una regla combina condiciones positivas y exclusiones. Las coincidencias dependen de la semántica del motor y de si se examina el archivo original o una exportación.\n\nLas pruebas deben incluir casos benignos y variantes cercanas. Una regla didáctica de cadenas no implica compatibilidad con motores como YARA.",
      },
      {
        title: "Ramas y entornos",
        body: "Un programa puede elegir comportamientos según configuración o características del entorno. Leer todas sus cadenas no identifica automáticamente la rama activa.\n\nEl analista documenta las condiciones que puede demostrar. El pseudocódigo preservado permite razonar sin convertir el entorno de trabajo en un ejecutor de muestras.",
      },
      {
        title: "Fragmentación e integridad",
        body: "La configuración puede estar repartida en recursos o bloques que tienen un orden lógico propio. Los nombres y posiciones físicas no garantizan el orden correcto.\n\nLa reconstrucción necesita referencias de asignación, longitud y controles de integridad. Los residuos o recursos descartados deben identificarse y conservarse por separado.",
      },
      {
        title: "Correlacionar procesos",
        body: "Un evento aislado de memoria o creación de hilos puede tener varios significados. La correlación usa identidad de proceso, relaciones y regiones concretas.\n\nLos identificadores de proceso pueden reutilizarse en un sistema real. Las conclusiones deben indicar alcance temporal y apoyarse en identificadores duraderos cuando estén disponibles.",
      },
      {
        title: "Clasificación y alcance",
        body: "Relacionar dominios, mutex y hashes ayuda a comparar muestras con un catálogo. La normalización debe estar definida y no destruir distinciones relevantes.\n\nMITRE ATT&CK describe comportamientos observables; una coincidencia no atribuye por sí sola una campaña o actor. Las muestras de esta colección son representaciones inertes y no se ejecutan.",
      },
    ],
  },
  {
    id: "volume-17",
    category: "Respuesta a incidentes",
    title: "Respuesta a incidentes · Correlación, contención y recuperación",
    pages: [
      {
        title: "Una alerta no es una conclusión",
        body: "Una alerta inicia una evaluación; su severidad no demuestra por sí sola compromiso. La respuesta recoge contexto, confirma observaciones y registra incertidumbre.\n\nNIST SP800-61r3 sitúa la respuesta dentro de la gestión del riesgo. Preparación, detección, respuesta y recuperación requieren decisiones coordinadas y evidencias.",
      },
      {
        title: "Identificar activos",
        body: "Los inventarios relacionan agentes, nombres, direcciones y responsables. Una dirección puede cambiar o ser compartida por varios equipos.\n\nLas relaciones deben evaluarse para el momento del evento. Los identificadores duraderos y el historial de asignaciones reducen atribuciones incorrectas.",
      },
      {
        title: "Sesiones y cuentas",
        body: "Una IP no equivale a una persona. La atribución operativa relaciona cuentas, sesiones, tokens, trazas y recursos dentro de un alcance temporal.\n\nLas cuentas de servicio y la delegación añaden límites de confianza. Un uso legítimo del recurso no demuestra que todos los usos de esa cuenta sean legítimos.",
      },
      {
        title: "Indicadores y resultados",
        body: "Una consulta de dominio o un intento de conexión no demuestra una descarga completada. Los resultados y bytes observados ayudan a evaluar el impacto.\n\nLa normalización de indicadores debe conservar su significado. Conviene relacionar observaciones de varias fuentes y separar intentos, conexiones y operaciones de aplicación.",
      },
      {
        title: "Contención proporcionada",
        body: "La contención busca reducir el daño considerando dependencias y continuidad. Aislar un endpoint no cumple la misma función que detener un servicio compartido.\n\nEl plan identifica alcance, canal de administración y criterio de reversión. Las acciones requieren observar su efecto y conservar la evidencia necesaria para investigar.",
      },
      {
        title: "Cronologías y relojes",
        body: "Las fuentes pueden usar zonas y desfases diferentes. Comparar sus horas requiere conocer referencia, precisión y correcciones aplicadas.\n\nEl orden debe basarse en tiempos normalizados sin ocultar incertidumbre. Los tiempos de recepción del colector y los tiempos del evento original pueden diferir.",
      },
      {
        title: "Fuentes incompletas",
        body: "La pérdida o borrado local de registros no implica que desaparezcan todas sus copias. Las fuentes remotas pueden conservar contexto independiente.\n\nLa ausencia de un registro no prueba que el evento no ocurriera. El informe debe expresar qué cobertura se conoce y qué preguntas no puede responder el material adquirido.",
      },
      {
        title: "Movimiento y alcance",
        body: "Un grafo de sesiones ayuda a reconstruir relaciones entre equipos. No todas las conexiones son movimientos laterales ni todas las cuentas comparten el mismo contexto.\n\nLas rutas deben apoyarse en autenticación, resultado y secuencia temporal. Los ciclos, intentos fallidos y sesiones ajenas pueden distorsionar una reconstrucción apresurada.",
      },
      {
        title: "Evaluar la exposición",
        body: "El alcance combina objetos afectados, clasificación y operaciones observadas. Varias lecturas del mismo objeto no son necesariamente varios objetos expuestos.\n\nLos intentos denegados y las operaciones de otras sesiones deben distinguirse de los accesos relevantes. La deduplicación y la política de clasificación deben documentarse.",
      },
      {
        title: "Cerrar con evidencia",
        body: "La recuperación incluye restaurar un estado conocido, gestionar credenciales afectadas y verificar funciones y controles. Un test anterior al cambio no valida el resultado posterior.\n\nLos criterios de cierre deben ser explícitos y comprobables. La revisión posterior conserva aprendizajes y tareas pendientes sin confundir una recuperación parcial con el cierre total.",
      },
    ],
  },
  {
    id: "volume-18",
    category: "Identidad y acceso físico",
    title: "Identidad y acceso físico · Credenciales, controladores y sensores",
    pages: [
      {
        title: "Identificar y autorizar",
        body: "Presentar una credencial permite reconocer una identidad; autorizar una puerta depende además de políticas, tiempo y contexto. Un identificador visible no demuestra autenticidad.\n\nLa evaluación considera lector, controlador, servicio de identidad y mecanismo físico. La confianza en un componente no reemplaza controles en los demás.",
      },
      {
        title: "Revocación y vigencia",
        body: "La revocación cambia la autorización antes de que termine una vigencia programada. Cada controlador necesita conocer qué estado debe aplicar.\n\nLos intervalos deben definir límites, zona horaria y tratamiento de errores de reloj. Una lista desactualizada puede producir decisiones distintas de la política central.",
      },
      {
        title: "Contadores y repetición",
        body: "Un mecanismo contra repetición necesita un estado y un ámbito definidos. Reinicios, varios lectores o sincronización parcial pueden afectar sus garantías.\n\nLos registros deben permitir distinguir credencial, controlador y orden observado. Un contador por sí solo no sustituye una verificación criptográfica del origen.",
      },
      {
        title: "Grupos y puertas",
        body: "Los permisos pueden relacionar identidades, grupos, horarios y zonas. Los accesos administrativos y las excepciones necesitan un alcance explícito.\n\nLa autorización se evalúa para cada evento. Las membresías transitivas y las reglas de denegación deben tener una semántica común en todos los componentes.",
      },
      {
        title: "Estado de las zonas",
        body: "Las políticas de entrada y salida dependen del estado físico que se intenta representar. Una autorización denegada no tiene necesariamente el mismo efecto que una entrada completada.\n\nLos sensores y el registro de paso pueden aportar información distinta de la lectura de una tarjeta. El modelo debe explicar cómo trata pasos incompletos y eventos perdidos.",
      },
      {
        title: "Credenciales copiadas",
        body: "Una lectura del mismo identificador en varios dispositivos puede indicar uso legítimo o una copia. Se necesita contexto adicional para distinguir hipótesis.\n\nLa autenticación resistente a clonación se apoya en protocolos y secretos adecuados, no solo en ocultar un UID. El laboratorio utiliza exportaciones ficticias sin programar tarjetas reales.",
      },
      {
        title: "Permisos heredados",
        body: "Las relaciones entre grupos forman un grafo. Los ciclos, reglas contradictorias y excepciones requieren decisiones reproducibles.\n\nLa resolución debe definir precedencia de denegaciones y tratamiento de grupos no disponibles. Las pruebas útiles incluyen herencia y combinaciones que la interfaz no muestra directamente.",
      },
      {
        title: "Controladores desconectados",
        body: "La operación sin conexión plantea una decisión entre disponibilidad y actualización de políticas. Las revisiones locales permiten explicar qué información tenía el equipo.\n\nLos periodos de caché y reconexión deben registrarse. Una aceptación fuera de línea puede revelar una política obsoleta sin demostrar que el lector haya sido manipulado.",
      },
      {
        title: "Eventos físicos y energía",
        body: "Una orden de apertura, una lectura de tarjeta y un sensor abierto son observaciones distintas. La pérdida de energía puede afectar al mecanismo según su diseño.\n\nLa correlación necesita identificar puerta y controlador además del tiempo. Los casos didácticos no accionan la puerta ni modifican alimentación real; trabajan sobre registros preservados.",
      },
      {
        title: "Integridad de atributos",
        body: "Una firma o MAC protege los bytes y campos definidos por su formato. Base64 solo representa datos. La verificación necesita una clave y un contexto adecuados.\n\nUna credencial auténtica puede seguir teniendo permisos excesivos. Deben comprobarse integridad, vigencia, revocación y autorización. NIST SP800-116r1 ofrece criterios para el uso de credenciales PIV en control de acceso físico, sin convertir estos ejercicios en un sistema PIV real.",
      },
    ],
  },
];
