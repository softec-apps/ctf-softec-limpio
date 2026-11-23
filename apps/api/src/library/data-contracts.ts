import type { ReferenceBook } from "./catalog";
export const DATA_CONTRACT_BOOKS: ReferenceBook[] = [
  {
    id: "volume-24",
    category: "Bases de datos",
    title: "Bases de datos · SQL, integridad y auditoría",
    pages: [
      {
        title: "Esquema antes que resultado",
        body: "Las tablas definen columnas y tipos. El esquema describe la forma de los datos; no enumera todas las reglas de autorización. sqlite_master permite examinar las tablas de SQLite.\n\nEmpieza por identificar claves y relaciones. SELECT recupera columnas; WHERE filtra filas. Elegir columnas explícitas facilita comprobar el alcance del resultado y evita publicar valores ajenos al objetivo.",
      },
      {
        title: "Exposición de configuración",
        body: "Una tabla de ajustes puede mezclar preferencias públicas y tokens internos. Que un servidor permita consultar una tabla no significa que cada columna sea adecuada para todo lector.\n\nRevisa permisos, vistas y exportaciones. La clasificación de cada dato debe acompañar sus copias, registros y respaldos. Las consultas parametrizadas previenen inyección, pero no conceden por sí mismas autorización.",
      },
      {
        title: "Borrado lógico y retención",
        body: "Una marca deleted_at suele retirar registros de las vistas habituales sin eliminar sus bytes. IS NULL e IS NOT NULL distinguen presencia y ausencia de un valor.\n\nDefine plazos de conservación, permisos de recuperación y tratamiento de copias. Una condición de interfaz no equivale a un control de acceso sobre las filas conservadas.",
      },
      {
        title: "Respaldos y adquisición",
        body: "Un hash permite comparar bytes con una referencia conocida. La integridad de un archivo y la completitud de una copia son preguntas distintas.\n\nConserva acta de adquisición, origen y estado del respaldo. Una coincidencia de hash debe interpretarse junto con la procedencia de la referencia; no demuestra quién produjo el archivo.",
      },
      {
        title: "Relaciones entre registros",
        body: "JOIN relaciona tablas usando condiciones explícitas. Una sesión puede enlazar un evento con una cuenta sin que el nombre humano aparezca en el registro original.\n\nRevisa cardinalidad y claves antes de unir. Un enlace incorrecto puede duplicar filas o atribuir una acción a otra cuenta. Los identificadores estables aportan mejor evidencia que una etiqueta reutilizable.",
      },
      {
        title: "Separación de tenants",
        body: "Una aplicación puede tener recursos y actores de varias organizaciones. La autorización debe comprobar el tenant además del rol y la acción.\n\nCruzar concesiones con propietarios revela permisos que atraviesan esa frontera. Comprobar solo un identificador global o un nombre de rol puede omitir el contexto organizativo requerido.",
      },
      {
        title: "Transacciones y revisiones",
        body: "Pending, committed y aborted representan estados diferentes de una operación. La versión más alta no siempre es la última versión confirmada.\n\nFiltra primero el estado aplicable y ordena después por versión. ORDER BY y LIMIT ayudan a seleccionar una revisión concreta. Una exportación de auditoría necesita declarar su punto de corte.",
      },
      {
        title: "Integridad compuesta",
        body: "En datos compartidos, una referencia puede depender de dos columnas: identificador y tenant. Unir solo por el identificador puede ocultar referencias inválidas.\n\nLEFT JOIN conserva filas sin coincidencia. Examinar las columnas nulas del lado relacionado permite localizar huérfanos. Una restricción de clave foránea debe reflejar la misma identidad compuesta.",
      },
      {
        title: "Reconstrucción contable",
        body: "Un saldo inicial y los movimientos confirmados permiten reconstruir un cierre. Una transferencia de una cuenta a sí misma tiene efecto neto cero.\n\nSUM y CASE permiten asignar signos por dirección. Evita contar movimientos pendientes o duplicados; COALESCE trata agregaciones vacías. Reconciliar exige documentar unidad, cuenta y estado de cada movimiento.",
      },
      {
        title: "Auditoría y alcance",
        body: "Una investigación relaciona sesiones, eventos y clasificación de objetos. Un código de éxito aporta evidencia diferente a un intento denegado.\n\nDelimita sesión y secuencia o tiempo antes de eliminar duplicados con DISTINCT. Ordena explícitamente la salida para hacerla reproducible. El laboratorio ejecuta SQLite en memoria por operación, con lectura limitada; no consulta la base del concurso.",
      },
    ],
  },
  {
    id: "volume-25",
    category: "Contratos inteligentes",
    title: "Contratos inteligentes · Estados, llamadas y firmas",
    pages: [
      {
        title: "Identidad y propiedad",
        body: "Un contrato recibe llamadas y transforma su estado. Una función que asigna propietario necesita una política explícita sobre quién puede invocarla.\n\nDistingue argumento de dirección y llamante efectivo. Revisar solamente el nombre setOwner no demuestra que exista un control de acceso. Las pruebas deben conservar estado anterior, llamada y estado posterior.",
      },
      {
        title: "Origen y llamante",
        body: "msg.sender identifica al llamante inmediato; tx.origin sigue el origen de una transacción a través de llamadas. Confundir ambos puede delegar autoridad a un intermediario no autorizado.\n\nRepresenta la cadena de llamadas completa y comprueba la identidad que necesita la operación. El laboratorio reproduce trazas de llamadas, sin emitir transacciones a una red.",
      },
      {
        title: "Inicializadores",
        body: "Un patrón de despliegue puede separar construcción e inicialización. Si una función pública queda disponible antes de configurar propietario, otra cuenta puede reclamar el estado.\n\nLa inicialización necesita una estrategia de despliegue y protección contra repeticiones. Audita también proxies e implementaciones: pueden mantener estados distintos aunque compartan código.",
      },
      {
        title: "Fuentes de aleatoriedad",
        body: "Los datos de un bloque son observables y algunos pueden estar influidos dentro de los límites del consenso. Un módulo sobre timestamp no proporciona azar secreto.\n\nExplica el modelo de adversario y los incentivos del sorteo. Protocolos de compromiso y revelación o fuentes verificables requieren analizar disponibilidad y sesgos, no solo sustituir una expresión.",
      },
      {
        title: "Reentrada y orden",
        body: "Una llamada externa puede devolver el control antes de que finalice la función original. Si el crédito permanece intacto, una llamada repetida puede observar el estado anterior.\n\nComprobaciones, efectos e interacciones ordenan las responsabilidades. Los bloqueos de reentrada aportan otra barrera. Verifica saldos y efectos de toda la traza, incluidas funciones relacionadas.",
      },
      {
        title: "Resultados de llamadas",
        body: "Una llamada de bajo nivel devuelve un indicador de éxito. Ignorarlo puede dejar un registro pagado aunque no se transfiera el valor esperado.\n\nRelaciona resultado, estado y manejo del fallo. Un recibo lógico no garantiza el efecto económico. Las pruebas con destinatarios que rechazan pagos ayudan a comprobar esa diferencia.",
      },
      {
        title: "Aritmética y versiones",
        body: "El comportamiento ante desbordamientos depende de la versión y del contexto de Solidity. Código anterior a 0.8 sin protecciones podía envolver enteros; unchecked requiere una revisión propia en versiones posteriores.\n\nDocumenta ancho de bits y orden de conversión. Un contador uint8 tiene 256 representaciones; una condición sobre el valor envuelto puede no limitar la cantidad real que se intenta gastar.",
      },
      {
        title: "Firmas y consumo único",
        body: "Una firma autentica bytes respecto de una clave. No demuestra que el mensaje siga vigente ni que no se haya utilizado antes.\n\nIncluye propósito, destinatario, cantidad, vigencia y un nonce consumible según el protocolo. Conserva exactamente los bytes firmados. Este laboratorio verifica recuperación secp256k1 con firmas EIP-191 para vales ficticios.",
      },
      {
        title: "Dominio de datos tipados",
        body: "EIP-712 estructura el mensaje y el dominio que se firma. chainId y verifyingContract permiten relacionar una autorización con cadena y despliegue cuando forman parte del dominio validado.\n\nUna firma correcta puede reutilizarse donde los campos omitidos no distinguen contextos. Compara el digest y los campos del dominio antes de atribuir una protección a una firma. El ejercicio usa cálculo y recuperación criptográfica reales, sin RPC.",
      },
      {
        title: "Delegatecall y almacenamiento",
        body: "Delegatecall ejecuta código ajeno usando el almacenamiento del llamante. Las variables se relacionan con ranuras, por lo que layouts incompatibles pueden cambiar un dato distinto al esperado.\n\nCompara layouts de proxy e implementación y la autorización de actualizaciones. Una inicialización que escribe slot0 puede sobrescribir otra variable en el proxy. El modelo didáctico muestra ranuras y transferencias ficticias; no es una implementación completa de la EVM.",
      },
    ],
  },
];
