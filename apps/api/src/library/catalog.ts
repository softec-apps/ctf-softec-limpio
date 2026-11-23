import { DATA_CONTRACT_BOOKS } from "./data-contracts";
import { ADVANCED_BOOKS } from "./advanced";
import { SPECIALIST_BOOKS } from "./specialist";
import { FILE_REFERENCE_BOOK } from "./files";
import { OT_REFERENCE_BOOK } from "./ot";
import { IOT_REFERENCE_BOOK } from "./iot";
export type ReferenceBook = {
  id: string;
  category: string;
  title: string;
  pages: { title: string; body: string }[];
};

export const REFERENCE_BOOKS: ReferenceBook[] = [
  {
    id: "volume-01",
    category: "Web",
    title: "Web · Seguridad de aplicaciones",
    pages: [
      {
        title: "Autorización y pertenencia",
        body: "Autenticar a una persona permite reconocerla. Autorizarla determina qué acciones puede realizar sobre cada recurso. Un identificador localiza información; por sí solo no concede permiso para leerla o modificarla.\n\nEl control de acceso falla cuando una operación confía en datos del cliente, comprueba únicamente que exista una sesión o aplica permisos de forma desigual entre rutas. La interfaz puede ocultar una función mientras el servidor continúa aceptándola. El efecto puede ser una lectura indebida, una modificación ajena o una acción fuera del rol previsto.",
      },
      {
        title: "Un límite que se comprueba siempre",
        body: "La autorización debe aplicarse en el servidor, junto a la operación protegida, considerando identidad, acción y recurso. Una política de mínimo privilegio parte de la denegación y concede solo lo necesario.\n\nLos permisos necesitan pruebas entre usuarios y roles diferentes. Los identificadores difíciles de adivinar reducen algunas exposiciones, pero no reemplazan una comprobación de acceso. Tampoco basta con proteger una sola pantalla si otras rutas realizan la misma operación.",
      },
      {
        title: "Decisiones entre servicios",
        body: "Un límite de acceso también existe entre una estación, un recurso compartido y el directorio que administra sus identidades. Reconocer un nombre no demuestra que el servicio de destino deba aceptar todas sus capacidades.\n\nLa revisión debe distinguir autenticación, autorización y delegación. Las pruebas útiles presentan identidades con permisos distintos, comprueban el objeto concreto y conservan evidencia del resultado sin convertir una respuesta de la interfaz en una autorización.",
      },
      {
        title: "Configuración y contexto",
        body: "Una aplicación depende de configuraciones del servidor, el entorno, los servicios y las bibliotecas. Un ajuste adecuado durante el desarrollo puede resultar peligroso al publicar el sistema.\n\nLas funciones de diagnóstico, mensajes demasiado detallados, servicios innecesarios o credenciales predeterminadas amplían la superficie de exposición. El fallo no requiere que una función esté mal programada: también aparece cuando una capacidad legítima permanece habilitada para un público que no la necesita.",
      },
      {
        title: "Reducir lo que se publica",
        body: "El endurecimiento empieza por un inventario y una configuración mínima reproducible. Separar entornos, retirar funciones que no se usan y revisar permisos evita depender de ajustes manuales olvidados.\n\nLa configuración debe verificarse después del despliegue. Un mensaje al usuario puede ser breve mientras el detalle operativo queda en un registro protegido. La ausencia de enlaces visibles no demuestra que un recurso sea privado; su exposición depende de controles efectivos.",
      },
      {
        title: "El inventario como punto de partida",
        body: "Un inventario útil relaciona equipos, funciones y servicios expuestos. Un cliente de escritorio puede pertenecer a un dominio sin ser su controlador. Una interfaz de administración y un protocolo de acceso tampoco cumplen la misma función.\n\nReducir superficie exige saber qué capacidad es necesaria y quién debe utilizarla. Las configuraciones heredadas merecen una revisión propia: retirar una opción del editor no elimina necesariamente documentos o credenciales distribuidos con anterioridad.",
      },
      {
        title: "El software que llega de fuera",
        body: "Un programa incorpora componentes que no escribe su equipo: paquetes, herramientas de compilación, imágenes y servicios de distribución. Cada incorporación abre una relación de confianza.\n\nLos fallos de cadena de suministro pueden aparecer en la procedencia de un paquete, la elección de un registro, una cuenta comprometida o el proceso de publicación. Que un nombre resulte conocido no demuestra quién controla el contenido que se instala. Una versión fijada tampoco garantiza, por sí sola, que el componente sea seguro.",
      },
      {
        title: "Procedencia y trazabilidad",
        body: "Los controles incluyen inventariar dependencias, limitar las fuentes de distribución y revisar versiones y permisos. Una lista de materiales ayuda a conocer qué contiene un producto y dónde puede afectar una incidencia.\n\nLa integridad del artefacto y la protección del proceso de compilación son partes distintas de la defensa. Conviene poder explicar quién produjo un componente, mediante qué proceso y desde qué fuente llegó, además de mantener un procedimiento de actualización y respuesta.",
      },
      {
        title: "Artefactos y herramientas de análisis",
        body: "Una herramienta de análisis también forma parte de la cadena de confianza. Conviene conocer su procedencia, el formato que admite y si trabaja sobre el contenido original o sobre una interpretación parcial.\n\nNo todos los archivos etiquetados como captura son paquetes de red nativos. Los formatos didácticos, exportaciones y contenedores deben identificar su alcance. La reproducción de un resultado exige conservar versión, parámetros y bytes relevantes, sin ejecutar contenido ajeno por el mero hecho de abrirlo.",
      },
      {
        title: "Dónde cambia el significado",
        body: "Un intérprete trata ciertas entradas como instrucciones: consultas, expresiones, plantillas o comandos. La inyección surge cuando datos de una fuente no confiable pasan a modificar esa estructura.\n\nEl problema consiste en cruzar una frontera de significado. Un dato que debería representar un valor termina alterando la operación que el sistema ejecuta. La misma familia de errores puede aparecer en tecnologías muy diferentes; no se limita a una base de datos concreta.",
      },
      {
        title: "Separar estructura y valores",
        body: "Las interfaces parametrizadas y los mecanismos propios de cada tecnología permiten separar instrucciones y datos. La validación añade restricciones del dominio, pero no sustituye esa separación.\n\nLa protección debe corresponder al contexto donde se interpreta la entrada. Una transformación útil para un formato puede no servir para otro. Reducir privilegios y controlar errores limita consecuencias, mientras que la corrección principal mantiene la estructura de la operación fuera del control del cliente.",
      },
      {
        title: "Cuando el contenido se convierte en acción",
        body: "Una cadena puede permanecer inofensiva mientras se conserva como dato y adquirir otra función al pasar a un intérprete, una directiva o una rutina de inicio. El contexto de ejecución determina la consecuencia.\n\nLa defensa mantiene separadas las entradas, limita quién puede escribir configuraciones ejecutables y comprueba la identidad bajo la que se aplican. El examen estático de un programa y una prueba controlada aportan evidencia distinta; ninguno autoriza a ejecutar contenido arbitrario fuera del entorno previsto.",
      },
      {
        title: "Un diseño puede permitir el abuso",
        body: "Una aplicación puede cumplir todas sus especificaciones técnicas y seguir siendo insegura si sus reglas permiten un resultado no deseado. El diseño inseguro afecta al modelo de confianza y a las decisiones del negocio.\n\nEl cliente puede proponer datos, pero no debe decidir hechos que el servidor necesita garantizar. Un límite implementado solo en la interfaz no es una regla efectiva. Tampoco basta con validar cada dato por separado si su combinación viola una condición del proceso.",
      },
      {
        title: "Invariantes del sistema",
        body: "Una invariante es una condición que debe mantenerse durante las operaciones relevantes. Identificar esas condiciones exige modelar actores, incentivos y formas de uso indebido antes de implementar pantallas.\n\nLas decisiones sensibles necesitan una fuente autoritativa y controles en cada transición. Las pruebas deben considerar repeticiones, cambios de orden y concurrencia. Añadir controles al final puede limitar algunos efectos, pero las debilidades del modelo requieren revisar el diseño.",
      },
      {
        title: "Comprobar una cadena completa",
        body: "Algunos resultados dependen de varias decisiones: obtener un acceso, cambiar un objeto, aplicar una configuración y observar un efecto. Validar un paso intermedio no demuestra que la cadena haya terminado.\n\nEs necesario definir el estado esperado y comprobarlo en el sistema que recibe el cambio. También deben probarse repeticiones, permisos revocados y operaciones incompletas. Una resolución puede conservarse para auditoría aunque el entorno de trabajo se restaure a su estado inicial.",
      },
      {
        title: "Una afirmación no es una prueba",
        body: "La autenticación establece una identidad mediante pruebas que el servidor considera válidas. Una sesión mantiene ese vínculo entre operaciones. Aceptar una afirmación del cliente sin verificar su autenticidad rompe ese vínculo.\n\nLos fallos incluyen recuperación de cuentas débil, manejo inseguro de sesiones y validación incompleta de credenciales o tokens. Leer el contenido de un token no equivale a verificar quién lo emitió ni si sigue siendo aceptable.",
      },
      {
        title: "El contexto de una credencial",
        body: "Un verificador necesita comprobar las propiedades relevantes de la credencial, incluida su procedencia y vigencia. La aceptación debe basarse en una política explícita, no en opciones elegidas por quien presenta el dato.\n\nLas sesiones requieren expiración, revocación apropiada y almacenamiento protegido. Las defensas frente a intentos repetidos y la autenticación multifactor reducen ciertos riesgos, pero no corrigen una validación que confía en información no autenticada.",
      },
      {
        title: "Sesión local y acceso remoto",
        body: "La identidad del navegador, el acceso a una red privada y una credencial utilizada por un servicio remoto son estados independientes. Salir de una aplicación no demuestra que todos los servicios hayan revocado sus accesos.\n\nCada sesión necesita un alcance y una forma de terminación coherentes con su función. Los registros deben permitir distinguir quién inició una operación y a qué recurso llegó. Una credencial de laboratorio no debe confundirse con la contraseña de una cuenta personal o del sistema anfitrión.",
      },
      {
        title: "Conservar significado y origen",
        body: "La integridad permite detectar cambios no autorizados. La procedencia ayuda a establecer quién generó un dato y mediante qué proceso. Deserializar o leer un documento no demuestra ninguna de las dos propiedades.\n\nUn sistema falla cuando usa contenido modificable para decidir aprobaciones, ejecutar actualizaciones o restaurar estados sin una verificación adecuada. La confianza puede perderse tanto al recibir un archivo como al transportarlo entre componentes.",
      },
      {
        title: "Verificar antes de confiar",
        body: "Los controles de integridad deben cubrir el contenido relevante y comprobarse antes de tomar decisiones basadas en él. Un resumen sin autenticación detecta cambios solo si el valor de referencia procede de un canal confiable.\n\nLas firmas, los mecanismos autenticados y la validación del formato cumplen funciones diferentes. Ninguno autoriza por sí solo una operación: después de verificar origen y contenido, siguen siendo necesarias las reglas de permiso y de negocio.\n\nUna firma o un MAC válido no demuestra que el documento siga vigente. También deben comprobarse versión, destinatario, propósito y las reglas que autorizan usarlo en ese momento. Restaurar un estado antiguo puede reintroducir permisos retirados aunque los bytes preserven su autenticidad. Las políticas de recuperación necesitan controles contra la vuelta a versiones obsoletas.",
      },
      {
        title: "De los bytes a una conclusión",
        body: "Un archivo puede tener una extensión que contradiga su firma. También puede conservar una estructura válida y contener datos adicionales que el visor habitual ignore. La interpretación debe basarse en el formato y en la evidencia preservada.\n\nVerificar longitud, límites y comprobaciones de integridad ayuda a detectar truncamientos. Cuando una transformación produce un resultado legible, aún hay que comprobar su relación con el contenido original y evitar tratar una casualidad o un señuelo como una prueba definitiva.",
      },
      {
        title: "Observar una acción",
        body: "Los registros permiten reconstruir lo que un sistema observó y decidió. Si faltan acciones relevantes, contexto o alertas, una actividad puede producirse sin que el equipo detecte su importancia.\n\nLa ausencia de un registro no demuestra que un hecho nunca ocurrió. Puede reflejar pérdida de datos, una ruta sin instrumentar o un fallo de correlación. Un registro de acceso tampoco equivale necesariamente a una auditoría de la operación realizada.",
      },
      {
        title: "Evidencia útil y protegida",
        body: "Los eventos necesitan tiempo, contexto y referencias que permitan relacionarlos. La monitorización debe convertir señales significativas en avisos atendibles, con procedimientos para investigar y responder.\n\nLos registros también requieren protección de integridad, acceso y retención. Almacenarlos no justifica copiar secretos o datos innecesarios. Un sistema observable conserva información suficiente para explicar sus decisiones sin crear una nueva exposición.",
      },
      {
        title: "Correlación entre origen y destino",
        body: "Una acción remota puede dejar señales en el cliente, el directorio y el equipo de destino. Esas señales describen observaciones diferentes: una solicitud, una autenticación, un cambio de configuración o un acceso efectivo.\n\nPara reconstruir una secuencia hay que relacionar identidades, recursos y tiempos, manteniendo el contexto del registro. Un identificador de evento no explica por sí solo toda la actividad. La conservación de evidencia debe evitar copiar contraseñas o material secreto que no sea necesario para demostrar el hecho.",
      },
      {
        title: "Estados excepcionales",
        body: "Los sistemas encuentran datos incompletos, recursos indisponibles y operaciones que no terminan como se esperaba. El manejo inseguro de estas condiciones puede transformar un error en un permiso, un estado parcial o una exposición.\n\nUna comprobación que no pudo completarse no equivale a una comprobación satisfactoria. Capturar una excepción tampoco demuestra que la operación pueda continuar con seguridad. El comportamiento excepcional forma parte del diseño de la aplicación.",
      },
      {
        title: "Un fallo con límites",
        body: "Las decisiones sensibles necesitan un estado seguro cuando falta información para autorizarlas. Las operaciones relacionadas requieren una estrategia coherente frente a fallos parciales y recuperación.\n\nConviene probar entradas mal formadas, interrupciones y errores de dependencias. Los mensajes públicos pueden explicar el problema sin exponer detalles internos. El objetivo es mantener las propiedades de seguridad durante el fallo, además de ofrecer una respuesta comprensible.",
      },
      {
        title: "Revocación y recuperación",
        body: "Cuando un recurso desaparece o se retira un permiso, el comportamiento esperado no es continuar usando un resultado antiguo como si siguiera autorizado. Las cachés y las sesiones pueden conservar una apariencia que ya no corresponda al estado del servidor.\n\nLas operaciones sensibles necesitan comprobar la disponibilidad vigente y recuperarse de fallos parciales. La interfaz debe comunicar el error en el contexto de la acción, conservar el trabajo que siga siendo válido y ofrecer una forma de reintentar sin conceder acceso por defecto.",
      },
    ],
  },
  {
    id: "volume-02",
    category: "Criptografía",
    title: "Criptografía · Teoría y herramientas",
    pages: [
      {
        title: "Qué protege un cifrado",
        body: "La criptografía puede aportar confidencialidad, autenticidad e integridad, según la construcción empleada. Elegir un algoritmo es solo una parte del sistema: también importan las claves, los parámetros y su ciclo de vida.\n\nLos fallos aparecen al usar mecanismos inadecuados, reutilizar valores que deben ser únicos o exponer las claves junto a la información protegida. Una representación ilegible no constituye evidencia de seguridad. La protección debe evaluarse según la amenaza y el uso de los datos.\n\nAES-GCM combina cifrado y comprobación de autenticidad. Sus entradas incluyen clave, valor de inicialización, texto cifrado y etiqueta de autenticación. Una etiqueta rechazada impide aceptar el resultado como auténtico; que una transformación produzca bytes legibles no sustituye esa comprobación. La unicidad del valor de inicialización para una misma clave forma parte del uso correcto del algoritmo.",
      },
      {
        title: "Gestionar el secreto",
        body: "Una defensa adecuada usa bibliotecas mantenidas, construcciones apropiadas y gestión separada de claves. Los secretos necesitan permisos, rotación y mecanismos de recuperación coherentes con el servicio.\n\nProteger información en tránsito y almacenada exige decisiones diferentes. Las contraseñas requieren funciones específicas de derivación y almacenamiento; cifrarlas de forma reversible no equivale a proteger un verificador. Los mecanismos caseros suelen omitir propiedades esenciales aunque sus resultados parezcan complejos.",
      },
      {
        title: "La identidad de una clave",
        body: "Una contraseña de usuario, una clave de servicio y una clave usada para firmar credenciales tienen ciclos de vida y efectos diferentes. Comprometer una de ellas no demuestra automáticamente el control sobre todas las identidades.\n\nEl análisis debe establecer qué dato se verifica, qué servicio conserva el verificador y qué permisos siguen aplicándose después. Una función de derivación de contraseñas, una firma y un cifrado reversible resuelven problemas distintos; su parecido visual no permite intercambiarlos.",
      },
      {
        title: "Sustitución y espacio de claves",
        body: "Los cifrados de sustitución cambian símbolos siguiendo una regla. En una sustitución monoalfabética, cada símbolo conserva siempre la misma correspondencia; desplazar o reflejar un alfabeto son formas sencillas de esa familia.\n\nUn espacio de claves pequeño facilita examinar posibilidades. Además, conservar patrones del idioma deja relaciones observables entre letras y palabras. Estos mecanismos ayudan a estudiar la diferencia entre representación y secreto, pero no ofrecen protección adecuada para información sensible actual.",
      },
      {
        title: "Tablas y coordenadas",
        body: "Una tabla puede representar cada símbolo mediante una posición. Para interpretar una coordenada es necesario conocer el conjunto de símbolos, sus índices y el orden de sus ejes. Distintas convenciones pueden producir interpretaciones diferentes.\n\nLa debilidad de una representación pública no reside en un error matemático: reside en confundir la notación con una protección secreta. Si el procedimiento de lectura no exige un secreto resistente, la dificultad visual no aporta confidencialidad.",
      },
      {
        title: "Orden y transposición",
        body: "La transposición conserva los símbolos y cambia su posición. La forma del soporte y el recorrido de escritura o lectura determinan una permutación. Las repeticiones, el tamaño de los bloques y otras restricciones pueden limitar mucho las disposiciones posibles.\n\nReordenar información no elimina la estructura del contenido. El interés didáctico está en distinguir qué propiedad cambia y cuál permanece. Aumentar el desorden aparente no garantiza seguridad frente a un análisis de las regularidades.",
      },
      {
        title: "Alfabetos variables",
        body: "Una sustitución polialfabética cambia la correspondencia a lo largo del texto mediante una secuencia. Vigenère es un ejemplo clásico basado en desplazamientos controlados por letras de una clave.\n\nUna clave que se repite introduce periodicidad, por lo que textos extensos pueden revelar estructura. Las convenciones sobre caracteres y avance de la clave importan para interpretar un sistema, pero conocerlas no resuelve una instancia concreta sin estudiar sus datos. Estos diseños clásicos no sustituyen criptografía moderna autenticada.",
      },
      {
        title: "Clásicos y verificadores modernos",
        body: "Los cifrados clásicos permiten estudiar patrones, sustituciones y secuencias. Un verificador moderno de contraseñas sigue otro propósito: comprobar una conjetura sin conservar una contraseña legible como resultado directo.\n\nUn análisis debe identificar la construcción y sus parámetros antes de aplicar una técnica. Ni una codificación pública ni varias capas de representación sustituyen una derivación resistente con sal y un secreto de suficiente entropía. La complejidad aparente no determina el coste de comprobar candidatos.",
      },
      {
        title: "El texto también es una representación",
        body: "Un archivo contiene bytes; una codificación de caracteres establece cómo se interpretan como texto. Una misma secuencia puede mostrarse de manera muy diferente si se usa una interpretación incorrecta.\n\nEl análisis debe distinguir el contenido original de su presentación. Una transformación reversible y pública no añade un secreto. Los límites de tamaño, la validez de los bytes y el conjunto de caracteres evitan confundir un error de lectura con información significativa.",
      },
      {
        title: "Binario y hexadecimal",
        body: "Los sistemas de numeración permiten escribir valores usando distintos conjuntos de símbolos. Un byte contiene ocho bits; su valor también puede escribirse con dos dígitos hexadecimales. Cambia la notación, no el valor representado.\n\nAgrupación, orden y codificación de caracteres son decisiones distintas. El contenido puede ser texto, una imagen u otra estructura; convertir su notación no determina automáticamente qué significa. La apariencia extraña no constituye cifrado.",
      },
      {
        title: "Transporte de datos",
        body: "Base64 representa datos binarios mediante un alfabeto apto para transporte textual. Su variante para direcciones web cambia ciertos símbolos y puede omitir relleno. La codificación porcentual permite representar caracteres en contextos de direcciones.\n\nEstas representaciones resuelven restricciones de formato. No protegen información frente a quien conoce su definición. Conviene separar la necesidad de transportar datos de la necesidad de mantenerlos confidenciales.",
      },
      {
        title: "Una operación reversible",
        body: "XOR combina bits: aplicar dos veces el mismo operando recupera el valor inicial. Esa propiedad es útil en informática, pero no convierte cualquier uso de XOR en un cifrado seguro.\n\nUna clave corta reutilizada puede conservar relaciones entre partes del contenido. La seguridad de una construcción depende de cómo se genera, distribuye y usa su material secreto. Conocer una operación matemática no demuestra que el sistema completo resista un análisis.",
      },
      {
        title: "Interpretaciones sucesivas",
        body: "Un dato puede atravesar varias representaciones durante su transporte. Cada capa tiene un formato, un tamaño y unas condiciones de validez propios. El hecho de que una transformación produzca texto legible no demuestra que ese texto sea el contenido original.\n\nEl análisis útil documenta qué interpretación se aplica y qué evidencia la respalda. Aplicar transformaciones sin verificar sus supuestos puede producir resultados engañosos. No existe un orden universal que sirva para cualquier archivo.\n\nAl reconstruir material dividido, los desplazamientos y longitudes describen posiciones de bytes; el orden alfabético de los nombres no garantiza el orden del contenido. La codificación base64 y la compresión gzip cumplen funciones distintas. La herramienta local crypto gunzip BASE64 acepta una representación base64 de un flujo gzip y limita su salida a 8192 bytes. La compresión se valida sobre el flujo completo y un resumen permite comprobar la reconstrucción frente a una referencia confiable.",
      },
      {
        title: "Confidencialidad e integridad",
        body: "Una información puede permanecer secreta y, aun así, ser modificable de forma indetectada. También puede tener procedencia verificable sin ser secreta. Son propiedades diferentes que requieren decisiones explícitas.\n\nEn sistemas reales se emplean construcciones criptográficas apropiadas y bibliotecas mantenidas. Los ejercicios de representación y cifrado clásico permiten reconocer errores de concepto; no deben trasladarse como diseños de protección a aplicaciones reales.\n\nUn resumen SHA-256 identifica una secuencia de bytes, pero no autentica por sí solo a quien la presenta. HMAC-SHA256 añade una clave compartida para comprobar un mensaje: cualquiera que posea esa clave puede producir un MAC, por lo que no equivale a una firma digital de autor exclusivo. Espacios, codificación, orden de propiedades y saltos de línea afectan a los bytes calculados; conviene conservar o acordar una representación exacta.",
      },
      {
        title: "Contenedores y capas",
        body: "Una imagen, una grabación, un archivo comprimido y un módulo ejecutable pueden contener los mismos valores de bytes con significados diferentes. Sus cabeceras, tamaños y reglas de lectura determinan dónde comienza cada estructura.\n\nLas herramientas de hexadecimal, cadenas y transformaciones ofrecen perspectivas complementarias. Antes de combinar resultados conviene registrar qué archivo y qué intervalo se examinaron. La recuperación debe respetar límites de memoria y validar el formato de salida, no limitarse a mostrar cualquier texto reconocible.",
      },
      {
        title: "Sal y coste de derivación",
        body: "Una sal distingue verificadores generados a partir de contraseñas iguales. El coste de derivación aumenta el trabajo necesario para comprobar cada candidato.\n\nNinguna de estas propiedades convierte una contraseña predecible en un secreto resistente. El análisis debe mantener sal, parámetros y verificador de la misma adquisición. Cambiar el algoritmo o interpretar un resumen como si perteneciera a otro formato invalida la prueba.\n\nPBKDF2-SHA256 deriva bytes a partir de una entrada, una sal y un coste de iteraciones; su salida depende también de la longitud solicitada. La herramienta crypto pbkdf2 TEXTO SAL_HEX ITERACIONES interpreta la sal como hexadecimal y produce una clave de 32 bytes expresada en hexadecimal. Admite entre 1 y 10000 iteraciones como límite operativo del laboratorio, no como política recomendada para almacenar contraseñas de un servicio real.",
      },
      {
        title: "Conservar sin exponer",
        body: "Un informe puede demostrar una exposición sin publicar todas las contraseñas o credenciales recuperadas. Los datos sensibles necesitan un acceso y una retención adecuados.\n\nEl laboratorio permite copiar resultados para comprobar una hipótesis, pero las credenciales de práctica permanecen separadas de la identidad de la plataforma. Los visores y registros deben mostrar lo necesario para explicar la actividad, evitando guardar secretos en eventos de auditoría que no los necesitan.\n\nPara usar crypto decrypt-gcm se representan en hexadecimal una clave de 32 bytes, un valor de inicialización de 12 bytes, una etiqueta de 16 bytes y el texto cifrado. La operación comprueba la etiqueta antes de devolver el texto. crypto sha256 recibe texto UTF-8; crypto hmac interpreta su clave como bytes hexadecimales y su mensaje como texto UTF-8. Anotar estas convenciones permite reproducir resultados sin confundir los caracteres de una clave con los bytes que representan.",
      },
    ],
  },
  {
    id: "volume-03",
    category: "OSINT",
    title: "OSINT · Investigación de fuentes",
    pages: [
      {
        title: "Procedencia y corroboración",
        body: "Una investigación de fuentes abiertas convierte observaciones publicadas en conclusiones justificadas. Conviene separar el hecho observado de su interpretación y conservar la procedencia que permite comprobarlo.\n\nDos publicaciones pueden depender de una misma fuente y no ser corroboraciones independientes. La credibilidad se evalúa según la afirmación concreta, la cercanía al hecho y el contexto. Una coincidencia llamativa es un punto de partida, no una demostración.",
      },
      {
        title: "Identidades y homónimos",
        body: "Un nombre, unas iniciales o un alias pueden corresponder a personas distintas. La atribución se fortalece mediante referencias consistentes: autorías, identificadores, afiliaciones y periodos de actividad.\n\nLas relaciones también cambian con el tiempo. Una afiliación presente no demuestra dónde trabajaba alguien al producir un documento anterior. La investigación debe minimizar datos personales innecesarios y mantener separadas las hipótesis de las identidades confirmadas.",
      },
      {
        title: "Ubicación y orientación",
        body: "Una ubicación puede estudiarse combinando elementos del entorno: arquitectura, señalización, equipamiento y disposición espacial. Varios lugares pueden compartir una característica común.\n\nLa orientación de la observación importa tanto como la presencia de un objeto. Un inventario puede describir un lugar y otra fuente confirmar su disposición. Hay que considerar reformas y cambios posteriores: una guía actual no siempre representa el entorno que existía cuando se creó el material.",
      },
      {
        title: "El tiempo de una fuente",
        body: "Publicación, edición, captura y acontecimiento son tiempos diferentes. Una copia archivada acredita lo que se conservó, pero su fecha no reemplaza automáticamente la del hecho que describe.\n\nPara comparar instantes hay que considerar zona horaria, cambios de fecha y convenciones locales. También importa distinguir una previsión de un aviso efectivo. La cronología debe explicar qué mide cada sello temporal y qué incertidumbre permanece.",
      },
      {
        title: "Versiones y vigencia",
        body: "Un documento auténtico puede haber dejado de estar vigente. Rectificaciones, cancelaciones y fechas de entrada en vigor alteran su efecto sin borrar la historia anterior.\n\nLa investigación contrasta la secuencia de publicaciones y la autoridad que las emite. La nota más reciente no es siempre la norma aplicable a un momento pasado. Preservar versiones permite explicar tanto el estado original como los cambios que condujeron a otro estado.",
      },
      {
        title: "Instituciones y canales",
        body: "Un nombre parecido, una apariencia profesional o una conexión cifrada no demuestran que un sitio represente a una institución. La autenticidad de un canal requiere referencias confiables sobre quién lo controla.\n\nLas mudanzas y los archivos históricos pueden dejar varios sitios legítimos con funciones distintas. Los anuncios de una entidad y directorios independientes ayudan a evaluar continuidad. Es importante diferenciar una asociación relacionada de una representación oficial.",
      },
      {
        title: "Identificadores que conectan registros",
        body: "Los registros públicos pueden describir un mismo objeto desde perspectivas distintas. Un identificador permite vincular publicaciones, pero debe comprobarse que su significado sea compatible entre ellas.\n\nLas excepciones temporales pueden modificar la información de un directorio general. Una cadena de referencias es tan sólida como sus eslabones: si se confunden dos códigos semejantes, la conclusión final puede resultar coherente y, sin embargo, corresponder a otro objeto.",
      },
      {
        title: "Archivos y contenido retirado",
        body: "Las copias preservadas permiten estudiar cambios y publicaciones que ya no están en su ubicación original. Conviene conservar la fecha de captura y distinguir el documento publicado de borradores o reservas internas.\n\nUna captura aislada no garantiza que se haya preservado todo el sitio. Las omisiones y los intervalos entre capturas limitan lo que puede afirmarse. Reconstruir el contexto exige explicar esas limitaciones, además de citar la copia consultada.",
      },
      {
        title: "La vida de una imagen",
        body: "Una fotografía puede circular con fechas y rótulos que pertenecen a su publicación posterior. Un recorte, una composición o un logotipo nuevo pueden ocultar su contexto inicial sin modificar la escena principal.\n\nLa procedencia puede estudiarse mediante créditos, catálogos, identificadores de originales y registros de adquisición. Los metadatos son indicios que requieren corroboración: pueden cambiar o describir una copia. La fecha de archivo no demuestra por sí sola cuándo se tomó la imagen.",
      },
      {
        title: "Cadenas de evidencia",
        body: "Las investigaciones extensas unen cambios de nombre, registros, sedes y condiciones temporales. Es útil anotar cada relación junto a la fuente que la sostiene y buscar contradicciones antes de cerrar una conclusión.\n\nLa acumulación de enlaces no reemplaza el razonamiento. Conviene comprobar si una conclusión alternativa también explica los datos y qué observación permitiría distinguirla. Un informe sólido permite a otra persona reconstruir el recorrido sin depender de la memoria del investigador.",
      },
      {
        title: "Atribución de una identidad técnica",
        body: "Un nombre de cuenta, un dominio y una dirección de red pueden sugerir relaciones sin demostrarlas. Las coincidencias deben contrastarse con su procedencia y con el intervalo en que fueron observadas.\n\nLa investigación de fuentes públicas y el análisis de un directorio requieren criterios de evidencia diferentes. Una descripción escrita por una persona puede contener errores o secretos; una identidad autenticada aporta una prueba técnica con alcance limitado. Ninguna elimina la necesidad de comprobar contexto y permisos.",
      },
    ],
  },
  {
    id: "volume-04",
    category: "Windows",
    title: "Windows · Operación y seguridad",
    pages: [
      {
        title: "Identidad y contexto de seguridad",
        body: "Un proceso de Windows actúa con un token de acceso que representa una cuenta, sus grupos y sus privilegios. La identidad visible en una sesión no basta para conocer todas las capacidades de cada proceso: el contexto puede cambiar cuando se inicia otro proceso o se utiliza un servicio.\n\nLos privilegios de respaldo y de suplantación son capacidades específicas, diferentes de los permisos ordinarios de un archivo. Su utilidad depende de la operación que los utiliza y de las condiciones del proceso. Antes de interpretar una operación conviene identificar qué cuenta la solicita y cuál la ejecuta. Autenticarse correctamente no concede acceso a todos los recursos. El resultado depende también del objeto protegido y de los permisos que se comprueban para la acción concreta.",
      },
      {
        title: "Enumeración y superficie de operación",
        body: "La enumeración organiza lo observable: identidad del equipo, cuentas, recursos, procesos y servicios. Permite formular preguntas sobre qué componentes existen y cómo se relacionan antes de modificar su estado. Los nombres, descripciones y ubicaciones orientan la inspección, pero no demuestran por sí solos confianza ni permisos.\n\nUna consulta de configuración y una prueba de ejecución aportan evidencia distinta. Conviene registrar el estado inicial, limitar cada cambio a una hipótesis y consultar de nuevo el recurso afectado. Las diferencias entre la salida esperada y la observada ayudan a detectar supuestos incorrectos.",
      },
      {
        title: "Permisos de objetos y control de acceso",
        body: "Los archivos, directorios, servicios y claves de Registro pueden estar protegidos por listas de control de acceso. Las entradas de una DACL conceden o deniegan derechos a identidades y grupos. Leer un objeto, modificarlo y cambiar sus permisos son capacidades diferentes; disponer de una no implica disponer de las otras.\n\nLa evaluación considera el token del proceso, los derechos solicitados y las entradas aplicables. Los permisos heredados también requieren atención. Ocultar un archivo o cambiarle el nombre no sustituye su protección. Una revisión distingue permisos sobre el contenedor de permisos sobre el objeto que contiene.",
      },
      {
        title: "Credenciales y alcance de las cuentas",
        body: "Una credencial permite demostrar una identidad ante un mecanismo de autenticación. Su presencia en una configuración legible puede ampliar el acceso si otra persona puede reutilizarla. El impacto depende de dónde se acepta esa identidad y de los permisos que conserva, no solo de la existencia de una contraseña.\n\nSeparar cuentas por función y reducir sus permisos limita el alcance de una exposición. Una cuenta local pertenece al equipo que la administra; su nombre no la convierte en identidad de dominio. Tras cambiar de identidad es necesario comprobar el nuevo contexto y las operaciones que realmente permite.",
      },
      {
        title: "Administración remota y límites de confianza",
        body: "La administración remota requiere conectividad con el destino y autenticación aceptada por su servicio. WinRM ofrece mecanismos de administración de Windows con controles propios sobre las conexiones y las identidades. Llegar a un equipo por la red no equivale a obtener una sesión autorizada.\n\nUna red privada define alcance de comunicación, mientras que el equipo conserva sus comprobaciones de acceso. El contexto de una sesión remota y el de una sesión local pueden diferir. Para entender una operación conviene identificar su origen, el equipo que recibe la solicitud y la cuenta bajo la que se aplica.",
      },
      {
        title: "Servicios y recursos modificables",
        body: "Un servicio tiene configuración, estado de ejecución e identidad de inicio. El control de acceso puede distinguir consultar, iniciar, detener y cambiar su configuración. La cuenta del servicio determina las capacidades del proceso que se inicia; no transforma automáticamente al usuario que solicita el arranque en esa cuenta.\n\nCuando una ruta ejecutable incluye espacios, su delimitación y las reglas de resolución importan para saber qué programa se inicia. También importan los permisos de los archivos y directorios que consume el servicio. Proteger el objeto del servicio no basta si una cuenta menos privilegiada puede alterar un recurso que aquel ejecutará con más permisos. Una revisión sigue la relación entre configuración, contenido modificable y contexto de ejecución.",
      },
      {
        title: "Programación y contexto de las tareas",
        body: "Una tarea programada relaciona condiciones de ejecución, una acción y una identidad. Consultar o modificar su definición no demuestra que la acción se haya ejecutado. El contexto configurado determina qué recursos puede utilizar cuando se inicia; las credenciales y los permisos de administración de la tarea también forman parte del análisis.\n\nEl programa ejecutado y sus dependencias pueden tener controles distintos de los de la propia tarea. Hay que distinguir quién puede cambiar la definición, quién puede iniciar la tarea y quién puede escribir el contenido que consume. Comprobar el resultado ayuda a separar configuración de efecto.",
      },
      {
        title: "Registro y configuración que produce acciones",
        body: "El Registro organiza configuración mediante claves, valores y tipos. Algunas entradas intervienen en el inicio de sesión o en el comportamiento de componentes del sistema. Las claves de inicio automático de usuario y de equipo tienen ámbitos diferentes; su presencia no garantiza una ejecución inmediata ni bajo una identidad elegida libremente.\n\nLeer una clave y escribir sus valores son operaciones sujetas a permisos. La seguridad depende también de los recursos a los que apunta la configuración. El análisis relaciona el valor, el momento en que se interpreta y el contexto del proceso que lo consume.",
      },
      {
        title: "Cambios observables y prueba del efecto",
        body: "Una operación puede ser aceptada y aun así no producir el efecto previsto: un componente puede seguir usando una configuración anterior o un proceso puede carecer del acceso necesario. La comprobación distingue el comando solicitado, el cambio registrado y el estado que quedó disponible después.\n\nConviene observar el recurso afectado desde un contexto con permisos adecuados y comprobar también una operación que deba ser rechazada. Una salida informativa no sustituye una prueba del efecto. Conservar una secuencia breve de observaciones permite explicar qué se cambió y por qué se considera suficiente la evidencia.",
      },
      {
        title: "Encadenamiento y mínimo privilegio",
        body: "Las consecuencias de una configuración insegura pueden depender de varias relaciones: una cuenta accede a un recurso, ese recurso permite modificar otro componente y una ejecución posterior utiliza una identidad con mayores permisos. Ningún paso aislado demuestra que la cadena completa sea posible.\n\nEl análisis identifica qué capacidad concede cada transición y qué condición falta por comprobar. La defensa puede interrumpir la cadena reduciendo permisos, separando identidades o protegiendo el contenido que consume un proceso privilegiado. Una prueba controlada debe mantener claro qué efectos pertenecen al entorno examinado y qué conclusiones aún necesitan verificación.",
      },
      {
        title: "Cliente y dominio",
        body: "Un equipo Windows puede utilizar cuentas locales o pertenecer a un dominio que centraliza identidades y políticas. Acceder al equipo no equivale a administrar el directorio. Una cuenta con el mismo nombre en dos ámbitos puede representar identidades distintas y tener capacidades diferentes.\n\nEl origen de una operación tampoco determina por sí solo su autoridad: una consola local y una sesión remota deben comprobar los permisos efectivos en el destino. Una VPN aporta conectividad al segmento previsto, mientras que el equipo o el dominio conserva sus controles de autenticación y autorización. Conviene distinguir estas fronteras al explicar de dónde procede una acción y qué sistema recibe sus efectos.",
      },
    ],
  },
  {
    id: "volume-05",
    category: "Redes",
    title: "Redes · Operación y protocolos",
    pages: [
      {
        title: "Nombres y respuestas",
        body: "La resolución de nombres relaciona una consulta con una respuesta y un contexto. El identificador de transacción, el emisor y los extremos del intercambio ayudan a distinguir consultas simultáneas. Una respuesta de error no aporta el mismo hecho que una respuesta válida.\n\nLos nombres también pueden transportar datos o generar patrones inesperados. La frecuencia, la estructura y la estación de origen merecen atención, sin asumir que una anomalía demuestra por sí sola una intrusión. Los cambios de caché y configuración requieren contexto temporal.",
      },
      {
        title: "Direcciones y confianza local",
        body: "En una red local, las direcciones de protocolo y las direcciones de enlace cumplen funciones distintas. ARP comunica asociaciones entre ambas; su formato original no autentica por sí mismo las afirmaciones recibidas.\n\nDos anuncios contradictorios deben contrastarse con el inventario y el estado de la red. Un conflicto puede proceder de errores, cambios legítimos o abuso. El análisis describe primero la discrepancia y sus efectos observados, antes de atribuir intención o identidad a una dirección.",
      },
      {
        title: "Configuración y concesiones",
        body: "La configuración dinámica puede incluir ofertas, solicitudes y confirmaciones. Recibir una oferta no demuestra que un equipo la haya aceptado. Las negociaciones se relacionan mediante identificadores y referencias de cliente.\n\nAceptar configuración de una fuente no autorizada puede alterar direcciones, rutas o resolución. La defensa combina control de infraestructura e inventarios adecuados. La asignación observada en un momento no debe extenderse a todo el historial de una dirección, porque las concesiones cambian.",
      },
      {
        title: "Conexiones y estado",
        body: "TCP mantiene estado entre extremos y usa señales de control para establecer, cerrar o restablecer comunicaciones. Las banderas y la dirección de un paquete deben interpretarse junto a los demás segmentos de su flujo.\n\nUn restablecimiento y una ausencia de respuesta son observaciones diferentes. Ninguna explica por sí sola todas las causas posibles de un fallo. Las retransmisiones y la pérdida también afectan al contenido observado. Reconstruir una conversación requiere distinguir conexiones simultáneas y mantener su orden.",
      },
      {
        title: "Contenido sin una envoltura segura",
        body: "Los protocolos de aplicación pueden transportar texto sin aportar confidencialidad. Una captura que incluya ese contenido permite observar mensajes y ciertos metadatos. En HTTP, peticiones y respuestas describen operaciones relacionadas; un nombre solicitado no demuestra una entrega satisfactoria.\n\nEn FTP, el canal de control y el de datos cumplen funciones distintas. Una transferencia iniciada puede terminar o abortarse, por lo que los estados importan. Las medidas de protección incluyen canales apropiados y restricciones de acceso; una herramienta de análisis no añade seguridad al tráfico original.",
      },
      {
        title: "Ecos y medidas de tiempo",
        body: "ICMP permite comunicar información de control y diagnóstico. En los mensajes de eco, ciertos campos ayudan a asociar una respuesta con una solicitud. Dos paquetes próximos en el tiempo no forman necesariamente una pareja.\n\nUna medida de ida y vuelta depende de las marcas observadas y de su precisión. No equivale al tiempo en una sola dirección ni demuestra por sí sola la causa de un retraso. Las comparaciones requieren relojes, identificadores y condiciones de captura coherentes.",
      },
      {
        title: "Lo visible de una conexión cifrada",
        body: "El cifrado protege contenido, pero no implica que desaparezcan todos los metadatos de una comunicación. Extremos, tiempos y algunos campos de negociación pueden seguir siendo observables según la versión y las extensiones utilizadas.\n\nEl nombre de servidor de una negociación y los datos de aplicación son elementos distintos. Una negociación también puede terminar con una alerta antes de transportar contenido útil. No es correcto presentar bytes cifrados como texto recuperado sin disponer de un mecanismo legítimo que permita descifrarlos.",
      },
      {
        title: "Reconstruir un enlace",
        body: "Una atribución de red puede necesitar concesiones, direcciones de enlace, inventarios y operaciones de aplicación. La misma dirección puede haber pertenecido a equipos distintos, y una captura parcial puede dejar fuera parte de su historia.\n\nCorrelacionar no consiste únicamente en buscar una coincidencia. Es necesario comprobar que las relaciones se mantienen durante el intervalo estudiado y que las fuentes sostienen la conclusión. Las representaciones exportadas facilitan el estudio, pero su alcance y sus limitaciones deben quedar documentados.",
      },
      {
        title: "Segmentos y enlaces",
        body: "Un enlace activo no demuestra que dos equipos compartan el segmento correcto. Las VLAN y las rutas determinan qué tráfico puede alcanzar cada destino.\n\nLa investigación combina estado físico, configuración lógica y pruebas desde los extremos pertinentes. Cambiar varios elementos a la vez dificulta explicar qué corrección resolvió el problema y puede abrir comunicación entre zonas que debían permanecer separadas.",
      },
      {
        title: "Resolución y asignación",
        body: "DNS relaciona nombres con información de servicio; DHCP entrega parámetros de configuración a clientes. Sus respuestas tienen identidades, ámbitos y periodos de validez.\n\nUn nombre que no resuelve y una dirección mal asignada pueden producir síntomas similares con causas distintas. La corrección debe comprobar la fuente de la respuesta y preservar la configuración legítima. La presencia de una oferta no demuestra que sea la que el cliente utilizó.",
      },
      {
        title: "Servicios y cifrado",
        body: "Abrir un puerto permite intentar una comunicación, pero no garantiza que la aplicación entregue el resultado esperado. Una política de tráfico y la configuración del servicio cumplen funciones diferentes.\n\nTLS requiere versiones y validación de identidad coherentes. Aceptar cualquier certificado o desactivar controles puede ocultar el síntoma sin corregir la causa. La comprobación final debe realizar una operación de aplicación y conservar sus condiciones.",
      },
      {
        title: "Tamaño de los paquetes",
        body: "La MTU limita el tamaño transportable en un enlace. El camino completo puede tener un límite menor que el de un equipo aislado.\n\nLas pruebas deben indicar el tamaño y las condiciones de fragmentación. Que una solicitud pequeña funcione no demuestra que todas las transferencias sean posibles. La corrección debe mantener la segmentación y las restricciones necesarias, en vez de deshabilitar indiscriminadamente controles de red.",
      },
      {
        title: "Control y datos",
        body: "Algunos protocolos utilizan conexiones separadas para control y transferencia. Las políticas de traducción de direcciones o filtrado pueden permitir una y bloquear la otra.\n\nEl diagnóstico debe seguir el estado de ambas conexiones y comprobar una entrega completa. Una autenticación correcta no demuestra que un archivo haya llegado. Los estados intermedios y las respuestas negativas forman parte de la evidencia del problema.",
      },
      {
        title: "Tiempo y persistencia",
        body: "La sincronización de tiempo influye en registros y autenticación distribuida. Una fuente de tiempo debe ser autorizada y alcanzable por el equipo que la utiliza.\n\nUna configuración puede funcionar hasta el siguiente reinicio si no quedó guardada de forma persistente. La validación operativa incluye aplicar, guardar, reiniciar cuando corresponda y repetir la prueba. El resultado debe mantenerse sin sacrificar controles que no causaban la incidencia.",
      },
    ],
  },
  {
    id: "volume-06",
    category: "Móvil",
    title: "Móvil · Evidencia digital",
    pages: [
      {
        title: "El alcance de una exportación",
        body: "Una exportación representa una selección de registros. Su ausencia no demuestra que un evento nunca existió. El estado eliminado, el contenido preservado y el momento de adquisición describen hechos diferentes. Conviene mantener el identificador de cada registro y distinguir datos observados de inferencias.",
      },
      {
        title: "La historia de una imagen",
        body: "Captura, importación y edición son operaciones distintas. Una copia puede conservar algunos metadatos y cambiar otros. Los campos declarados no garantizan por sí solos autenticidad ni presencia física; deben interpretarse junto con la procedencia y las transformaciones conocidas.",
      },
      {
        title: "Trayectorias incompletas",
        body: "Una secuencia de posiciones tiene intervalos sin observación. Permanecer en varias muestras cercanas permite formular una hipótesis de permanencia, limitada por la precisión y la frecuencia del registro. La localización de un equipo no identifica automáticamente a la persona que lo llevaba.",
      },
      {
        title: "Permisos con contexto",
        body: "Un permiso solicitado no equivale a uno concedido. Para evaluar una aplicación se comparan finalidad declarada, política autorizada y estado efectivo. Un permiso potente no demuestra abuso por sí solo; las excepciones, revocaciones y cambios requieren contexto.",
      },
      {
        title: "Relojes y avisos",
        body: "Emisión, publicación, recepción y lectura son momentos distintos. Los desplazamientos de zona horaria deben normalizarse antes de ordenar eventos. Un borrador no acredita una publicación y una recepción no demuestra que alguien haya leído el contenido.",
      },
      {
        title: "Destinos detrás de una etiqueta",
        body: "El texto visible de una invitación y el destino codificado son datos diferentes. La comparación de nombres exige distinguir el hostname completo de palabras parecidas incluidas en él. Analizar un destino preservado no necesita abrirlo ni iniciar una conexión.",
      },
      {
        title: "Copias y transferencias",
        body: "El nombre de un archivo no identifica su contenido ni demuestra que una descarga terminó. Un respaldo conserva el estado incluido en su captura; restaurarlo más tarde no actualiza los registros que contenía. La procedencia, el resultado y los identificadores permiten comparar versiones.",
      },
      {
        title: "Sesiones y atribución",
        body: "Una cuenta puede mantener varias sesiones en dispositivos distintos. El estado activo, la revocación y el inventario autorizado deben revisarse juntos. Relacionar eventos por identificadores estables ofrece más apoyo que coincidir únicamente en una hora o un alias, aunque no elimina las limitaciones de la fuente.",
      },
    ],
  },
  {
    id: "volume-07",
    category: "Infraestructura",
    title: "Infraestructura · Linux y servidores",
    pages: [
      {
        title: "Rutas y contexto",
        body: "Una ruta se interpreta desde un directorio y dentro de un sistema de archivos concreto. Una consola remota puede mostrar una estructura distinta de la estación desde la que se abrió.\n\nAntes de operar conviene reconocer la identidad efectiva y el directorio actual. Las comillas conservan argumentos con espacios; una ruta relativa cambia de significado al cambiar el contexto. El nombre de un archivo no concede permiso sobre su contenido.",
      },
      {
        title: "Usuarios y permisos",
        body: "La lectura, escritura y ejecución son capacidades diferentes. El propietario de un archivo y sus grupos influyen en la decisión de acceso, al igual que las políticas del sistema.\n\nUna identidad con privilegios elevados debe tener un alcance definido. El análisis de permisos combina el objeto, sus directorios superiores y la cuenta efectiva. No basta con observar un nombre atractivo o una marca de lectura en una copia de un listado.",
      },
      {
        title: "Tuberías y transformaciones",
        body: "Una tubería lleva la salida de una operación a la entrada de otra. Cada herramienta tiene supuestos sobre texto, codificación y orden de sus registros.\n\nOrdenar, filtrar o decodificar produce una representación nueva y debe documentarse. Los datos binarios no se convierten en texto fiable por enviarlos a una consola. Mantener el original permite revisar interpretaciones y distinguir una transformación correcta de una pérdida de información.",
      },
      {
        title: "Sesiones de red",
        body: "Un túnel proporciona una ruta autorizada; el servicio de destino todavía debe comprobar identidad y permisos. Una conexión SSH mantiene su propio contexto de usuario, archivos y directorio.\n\nCerrar la sesión remota devuelve el control al cliente, pero no implica desconectar el túnel. Las pruebas deben identificar desde qué equipo se ejecuta cada operación y qué límites siguen aplicándose. La separación evita atribuir al cliente privilegios que solo existen dentro de una sesión remota.",
      },
      {
        title: "El alcance de una herramienta",
        body: "Un manual explica qué entradas admite un programa y cómo interpretar sus resultados. Los parámetros deben corresponder a la versión utilizada y al objetivo autorizado.\n\nLas herramientas del entorno de entrenamiento operan sobre recursos virtuales definidos. La ayuda de la consola permite conocer su sintaxis sin asumir que existe un intérprete ilimitado. No se deben extrapolar sus resultados a sistemas externos que no hayan formado parte de la prueba.\n\nLa terminal local documenta estas operaciones con crypto help. Sintaxis: crypto gunzip BASE64; crypto sha256 TEXTO; crypto pbkdf2 TEXTO SAL_HEX ITERACIONES; crypto decrypt-gcm CLAVE_HEX IV_HEX TAG_HEX CIFRADO_HEX; crypto hmac CLAVE_HEX TEXTO. Los datos con espacios o separadores se mantienen entre comillas. Son operaciones sobre los argumentos facilitados: no ejecutan programas ni consultan archivos o servidores del anfitrión.",
      },
      {
        title: "Trabajo reproducible",
        body: "Una investigación útil conserva comandos relevantes, parámetros y archivos de origen. Los resultados intermedios necesitan nombres claros y una relación verificable con la evidencia.\n\nRestaurar un entorno de práctica debe distinguirse de borrar el historial de una competición o una auditoría. La reproducción exige reconocer qué cambios afectaron al sistema y cuáles pertenecen solo a una visualización. El mínimo privilegio limita efectos y facilita explicar lo sucedido.",
      },
    ],
  },
  {
    id: "volume-08",
    category: "Esteganografía",
    title: "Esteganografía · Contenedores y señales",
    pages: [
      {
        title: "Contenedor y contenido",
        body: "Un visor muestra una interpretación del archivo, no todos sus bytes. Los formatos pueden contener metadatos, comentarios y datos que no forman parte de la imagen mostrada.\n\nLa inspección comienza por firma, estructura y límites. Una extensión conocida no garantiza que el contenido corresponda a ese formato. Las cadenas imprimibles y el editor hexadecimal ayudan a examinar información que el visor habitual omite sin modificar el original.",
      },
      {
        title: "Píxeles y planos",
        body: "Los canales de una imagen representan componentes de color o transparencia. Cada componente puede examinarse como un conjunto de bits.\n\nModificar bits de menor peso puede alterar poco la apariencia, pero conservar una estructura recuperable. La interpretación debe especificar canal, orden y profundidad del bit. Abrir una imagen con una conversión destructiva puede cambiar precisamente la información que se pretende estudiar.",
      },
      {
        title: "Combinar dos observaciones",
        body: "Dos imágenes del mismo tamaño pueden contener relaciones entre sus píxeles. Una operación lógica puede revelar una estructura que ninguna muestra por separado.\n\nLas dimensiones, canales y transparencia forman parte del procedimiento. No toda diferencia implica un mensaje oculto, y un patrón visible necesita una interpretación verificable. La recuperación debe conservar el vínculo con ambos originales y describir la transformación aplicada.",
      },
      {
        title: "Muestras de sonido",
        body: "Una grabación digital contiene muestras, canales y parámetros de codificación. Escuchar el resultado no sustituye examinar su estructura numérica.\n\nLa mezcla de canales y su diferencia pueden destacar componentes distintos. El espectro aporta información sobre energía en frecuencias, pero no transcribe automáticamente un mensaje. Las técnicas de demodulación requieren conocer o estimar el reloj, los símbolos y la construcción de la señal.",
      },
      {
        title: "Texto que no se imprime",
        body: "Un documento puede conservar caracteres invisibles o capas con poca visibilidad. La copia impresa y el archivo digital no contienen necesariamente la misma evidencia.\n\nLa inspección debe distinguir puntos de código, representación visual y estructura del documento. Encontrar caracteres extraños no demuestra una intención oculta; hay que comprobar una regla de lectura consistente. Los resultados deben presentarse sin ejecutar elementos activos del archivo.",
      },
      {
        title: "Validar una extracción",
        body: "Una extracción necesita límites y una comprobación de su formato de salida. En archivos comprimidos conviene verificar tamaños y sumas de integridad antes de interpretar el contenido.\n\nUn código gráfico recuperado debe leerse desde los píxeles observados, y no desde una respuesta asociada al nombre del archivo. Mantener separadas la herramienta de análisis y la hipótesis evita que la interfaz fabrique la conclusión que se intenta demostrar.",
      },
    ],
  },
  {
    id: "volume-09",
    category: "Ingeniería inversa",
    title: "Ingeniería inversa · Lectura de programas",
    pages: [
      {
        title: "El formato de un módulo",
        body: "Un programa tiene una estructura binaria con tipos, funciones, datos y referencias. Antes de analizar su lógica hay que identificar qué formato y versión se han preservado.\n\nUn desensamblador traduce instrucciones, pero no recupera automáticamente el propósito original. La lectura debe respetar límites y rechazar construcciones que no conoce. Mostrar una interpretación parcial como si fuera completa produce conclusiones que el archivo no sostiene.",
      },
      {
        title: "Una máquina de pila",
        body: "En una máquina de pila las instrucciones consumen y producen valores. El orden de los operandos determina el significado de operaciones que parecen sencillas.\n\nParámetros, variables locales y memoria son espacios distintos. Seguir un valor exige reconocer cuándo se copia, se almacena o se utiliza como dirección. Una constante visible puede ser un límite, un índice o una parte de una comparación; su apariencia no establece por sí sola cuál es su función.",
      },
      {
        title: "Decisiones y repeticiones",
        body: "Los bloques, condiciones y bucles organizan el control de flujo. Una llamada puede distribuir una comprobación entre varias funciones.\n\nLa investigación necesita seguir tanto los caminos aceptados como los rechazados. Una cadena llamativa puede permanecer sin uso o pertenecer a un señuelo. Reconstruir las condiciones de una decisión aporta más evidencia que escoger el texto más legible del módulo.",
      },
      {
        title: "Memoria y orden de bytes",
        body: "Una dirección indica dónde se lee o escribe un valor. El tamaño de la operación y el orden de bytes determinan cómo se interpreta su contenido.\n\nUna secuencia puede representar texto, una tabla, una clave transformada o un estado numérico. Comparar memoria antes y después de ejecutar ayuda a reconocer efectos. No se debe confundir la región de entrada con el resultado ni reutilizar memoria anterior como si procediera de un intento nuevo.",
      },
      {
        title: "Operaciones reversibles",
        body: "Desplazamientos, rotaciones, XOR y aritmética modular pueden transformar valores sin eliminar toda su estructura. La posibilidad de invertir una operación depende del tamaño y de sus restricciones.\n\nConservar un estado entre posiciones cambia la relación entre entrada y salida. El análisis debe reconstruir la secuencia completa y comprobar candidatos. Conocer una operación aislada no demuestra que una entrada satisfaga todas las condiciones del verificador.\n\nAl leer código, diferencia un entero de ancho fijo del número usado para representarlo en el lenguaje. Los desplazamientos lógicos y aritméticos se comportan de forma distinta cuando interviene el bit de signo. Las conversiones a un entero sin signo y el orden de las operaciones pueden cambiar el resultado; analiza esas reglas antes de reproducir un cálculo. Una representación decimal también puede necesitar conservar ceros iniciales.",
      },
      {
        title: "Ejecutar con límites",
        body: "La observación dinámica permite comprobar una hipótesis sobre el programa. Esa comprobación debe hacerse en un entorno que limite memoria, tiempo y acceso al anfitrión.\n\nUn bucle que no termina no debe bloquear la interfaz de investigación. Cada intento necesita un estado inicial conocido y un registro de parámetros. El resultado útil relaciona la entrada, las decisiones del programa y el cambio observado, en lugar de aceptar cualquier salida legible como prueba.",
      },
    ],
  },
  {
    id: "volume-10",
    category: "Active Directory",
    title: "Active Directory · Identidades y permisos",
    pages: [
      {
        title: "Directorio y estación",
        body: "Un dominio organiza identidades, equipos y políticas en un directorio. Un cliente Windows unido al dominio consume esos servicios; no se convierte por ello en un controlador.\n\nLa estación de análisis puede utilizar otra plataforma y consultar los protocolos publicados. La procedencia de una operación y el sistema que recibe sus efectos deben identificarse por separado. Una red privada establece alcance, mientras que el servicio conserva sus controles de autenticación y autorización.",
      },
      {
        title: "Descubrir un servicio",
        body: "DNS puede publicar registros que ayudan a localizar servicios del dominio. Las direcciones y los nombres deben interpretarse dentro de un ámbito y un momento determinados.\n\nUn inventario relaciona la función del servidor con sus protocolos. Ver un puerto accesible no prueba que exista permiso para leer sus datos. La investigación comienza por operaciones de consulta acotadas y conserva las respuestas antes de probar cambios.",
      },
      {
        title: "Consultar LDAP",
        body: "LDAP permite consultar objetos y atributos de un directorio. La base de búsqueda, el filtro y la identidad del solicitante influyen en el resultado.\n\nLas descripciones y otros atributos escritos por personas pueden contener información que nunca debió almacenarse allí. La defensa limita exposición, evita secretos en campos de uso general y verifica qué puede leer una identidad con permisos mínimos. Que un atributo sea legible no lo convierte en una fuente segura de autenticación.",
      },
      {
        title: "Recursos SMB",
        body: "SMB organiza accesos a recursos compartidos y aplica permisos sobre sus contenidos. La autenticación de una cuenta no garantiza acceso a todos los recursos del mismo equipo.\n\nLa revisión considera el recurso, el archivo y los permisos efectivos. Un acceso de invitado debe tener un alcance deliberado y limitado. Leer un documento y modificarlo son acciones diferentes que requieren evidencia y decisiones de autorización distintas.",
      },
      {
        title: "Las etapas de Kerberos",
        body: "Kerberos utiliza un centro de distribución de claves y credenciales con alcances diferentes. Una respuesta inicial de autenticación y un ticket para un servicio no cumplen la misma función.\n\nEl análisis debe reconocer la cuenta, el servicio y las condiciones de emisión. La preautenticación evita ciertos modos de solicitar material antes de demostrar posesión de un secreto. Su presencia no elimina la necesidad de contraseñas adecuadas y permisos mínimos.",
      },
      {
        title: "Cuentas que prestan servicios",
        body: "Los servicios pueden tener identidades registradas para recibir autenticación. Esas cuentas necesitan permisos y un ciclo de vida apropiados para su función.\n\nUna contraseña débil puede permitir comprobar candidatos sobre material obtenido de forma legítima por otra identidad. La defensa combina secretos resistentes, gestión de cuentas y revisión de privilegios. Obtener un ticket no demuestra por sí solo que se haya recuperado la contraseña del servicio.",
      },
      {
        title: "Autenticación remota",
        body: "Un servicio de administración remota debe comprobar identidad y autorización sobre cada operación. La sesión de la aplicación, el túnel y la cuenta remota conservan ámbitos diferentes.\n\nEl cliente debe indicar qué cuenta utiliza y qué recurso solicita. Los registros del equipo de destino permiten comprobar el acceso efectivo. El análisis evita atribuir al sistema anfitrión acciones que solo ocurrieron dentro de un entorno aislado de entrenamiento.",
      },
      {
        title: "Orientarse desde otra plataforma",
        body: "Las herramientas de consulta de directorios, recursos compartidos y credenciales pueden utilizarse desde una estación Linux. La sintaxis depende de la herramienta y de su versión.\n\nEn el laboratorio, la ayuda del comando domain documenta las operaciones admitidas, y el explorador conserva por separado identidad, operación y resultado. La VPN habilita la ruta y no proporciona una identidad de dominio. Los ejemplos genéricos de un manual no sustituyen investigar los datos y permisos de un entorno concreto.",
      },
      {
        title: "Representación y autenticidad",
        body: "Una credencial contiene afirmaciones que un servicio decide aceptar tras verificarlas. Poder leer sus campos no demuestra su autenticidad ni su vigencia.\n\nLa validación debe comprobar emisor, alcance y relación con el recurso solicitado. Un formato didáctico puede representar esas propiedades sin ser un ticket nativo. El analizador debe reconocer el formato antes de escoger una herramienta, y no tratar una exportación textual como si fuera tráfico autenticado de un sistema real.",
      },
      {
        title: "Comprobar candidatos offline",
        body: "Un análisis offline compara candidatos con un verificador o con una construcción criptográfica preservada. No equivale a intentar iniciar sesión contra un servidor en cada comprobación.\n\nLa viabilidad depende de la entropía del secreto, el coste de cada prueba y la información disponible. Una coincidencia necesita verificarse y relacionarse con la identidad correcta. Los límites del diccionario y del algoritmo deben documentarse para no convertir la ausencia de coincidencia en una conclusión absoluta.",
      },
      {
        title: "Preferencias heredadas",
        body: "Algunas preferencias históricas distribuyeron contraseñas cifradas con una clave pública y compartida por el mecanismo. El cifrado reversible no proporcionaba un secreto exclusivo a cada instalación.\n\nLas actualizaciones que impiden crear nuevas preferencias de ese tipo no eliminan automáticamente documentos antiguos. La defensa exige inventariar, retirar el material distribuido y cambiar las contraseñas afectadas. Recuperar una preferencia histórica no demuestra que su credencial siga siendo aceptada por un servicio.",
      },
      {
        title: "Una plantilla de certificado",
        body: "Una plantilla controla propiedades de emisión, identidad y usos permitidos de un certificado. Los permisos de inscripción y la posibilidad de aportar datos del sujeto influyen en su seguridad.\n\nLa revisión debe combinar todos esos elementos. Una plantilla destinada a autenticar identidades necesita una política coherente de asignación y aprobación. No cualquier certificado ni cualquier nombre alternativo permite representar a otra persona: también importan las reglas vigentes del servicio que lo acepta.",
      },
      {
        title: "Asignación fuerte de identidad",
        body: "Los servicios de autenticación pueden exigir relaciones fuertes entre una credencial y el objeto de identidad correspondiente. Las condiciones heredadas no deben asumirse universales.\n\nUna práctica que modela una política vulnerable necesita distinguir ese perfil de la configuración segura de sistemas actuales. La defensa revisa plantillas, permisos, aprobación, usos y reglas de asignación. La apariencia correcta de un certificado no sustituye comprobar la identidad que el servicio termina aceptando.",
      },
      {
        title: "Tickets con alcance limitado",
        body: "Una credencial para un servicio concreto no autoriza automáticamente todos los protocolos o equipos. El nombre del servicio y las restricciones de delegación forman parte de la decisión.\n\nAl conservar una credencial hay que proteger también su procedencia y sus condiciones de uso. La recuperación de un archivo desde un recurso autorizado demuestra una capacidad delimitada; no debe presentarse como control total de otros equipos sin pruebas adicionales.",
      },
      {
        title: "La decisión sobre un objeto",
        body: "Una lista de control de acceso relaciona identidades con capacidades sobre un objeto. Los derechos pueden heredarse o concederse de forma explícita.\n\nLeer la lista permite formular hipótesis, pero la capacidad efectiva depende del objeto y de la operación. La revisión debe comprobar también restricciones y alcance. Un permiso de escritura genérico no equivale siempre a cambiar todos los atributos o a administrar todo un dominio.",
      },
      {
        title: "Membresía y acceso efectivo",
        body: "La pertenencia a un grupo puede aportar permisos sobre otros recursos. Poder modificar esa pertenencia crea una relación de confianza indirecta.\n\nEl análisis debe identificar quién puede agregar miembros y qué accesos concede realmente el grupo. La defensa limita esas delegaciones, revisa su herencia y audita cambios. El resultado de una modificación necesita comprobarse en el servicio que utiliza la pertenencia para autorizar.",
      },
      {
        title: "Cambiar la contraseña de otro",
        body: "El derecho a restablecer una contraseña permite actuar sobre una identidad sin conocer su secreto anterior. Debe separarse del cambio realizado por su propietario.\n\nLa revisión considera qué cuentas están afectadas y qué permisos podrán utilizar después. Una política de longitud de contraseña no corrige una delegación excesiva de restablecimiento. El registro de la operación y el acceso posterior aportan evidencia de etapas diferentes.",
      },
      {
        title: "Directivas y ejecución",
        body: "Las directivas relacionan configuración central y comportamiento de los equipos que las reciben. Permitir editar contenido que después se ejecuta con una identidad privilegiada crea una frontera sensible.\n\nGuardar una versión no demuestra que ya se haya aplicado. El análisis necesita observar actualización y efecto en el equipo de destino. La defensa protege tanto el objeto de política como sus archivos, vínculos y mecanismos de distribución.",
      },
      {
        title: "Registrar un equipo",
        body: "Las cuentas de equipo son identidades con secretos y permisos propios. La capacidad de crear una cuenta no concede automáticamente el control de otra.\n\nEs necesario revisar quién puede registrarlas, cuántas puede crear y qué objetos puede modificar. Las cuotas y la propiedad influyen en las relaciones posteriores. Un análisis útil distingue la creación de la cuenta de los derechos que harán posible utilizarla para una operación concreta.",
      },
      {
        title: "Delegación desde el recurso",
        body: "En la delegación restringida basada en recursos, el servicio de destino participa en decidir qué identidades pueden actuar por cuenta de otras. La configuración pertenece al objeto del recurso.\n\nControlar quién modifica esa relación es esencial. La defensa limita escritura sobre equipos y servicios, revisa identidades delegadas y protege cuentas que no deben ser representadas. Una credencial delegada conserva un destino y no debe aceptarse como permiso universal.",
      },
      {
        title: "Eventos que explican el cambio",
        body: "Un cambio de grupo, un restablecimiento y una modificación del directorio dejan categorías de eventos distintas cuando existe auditoría adecuada. El registro debe relacionar actor, objeto y operación.\n\nLa observación del equipo afectado ayuda a comprobar el impacto de una operación realizada desde otra estación. El contenido de una exportación didáctica debe identificarse como tal; no reemplaza una adquisición nativa ni demuestra actividad fuera del entorno que produjo los registros.",
      },
      {
        title: "Demostrar y reducir el alcance",
        body: "Una evidencia de acceso debe indicar qué identidad llegó a qué recurso y qué condiciones lo permitieron. Los cambios de configuración y el resultado final deben poder relacionarse.\n\nLa corrección reduce el permiso excesivo y comprueba que la operación no autorizada deje de funcionar sin romper el servicio legítimo. Restaurar un entorno de práctica no debe borrar los puntos ya acreditados ni confundirse con eliminar la evidencia necesaria para una investigación real.",
      },
    ],
  },
  {
    id: "volume-11",
    category: "Investigación",
    title: "Investigación · Evidencia y cronología",
    pages: [
      {
        title: "Conservar antes de interpretar",
        body: "El análisis forense digital estudia artefactos con atención a su origen, integridad y contexto. Una copia de trabajo permite examinar información sin alterar innecesariamente el material preservado.\n\nLa cadena de custodia documenta quién recibió un elemento, qué operaciones se realizaron y cómo se conservó. Un resumen criptográfico ayuda a detectar diferencias respecto a una referencia, pero no explica por sí solo quién creó el contenido ni si la referencia era confiable.",
      },
      {
        title: "Archivos, registros y cronologías",
        body: "Los nombres de archivo y sus ubicaciones son contexto, no garantías sobre su contenido. Los registros y metadatos pueden reflejar operaciones distintas y deben interpretarse según el sistema que los produjo.\n\nRelacionar identificadores y tiempos ayuda a reconstruir hechos. Las ausencias, las copias y los relojes desajustados introducen incertidumbre. Una conclusión debe distinguir lo demostrado, lo compatible con la evidencia y lo que todavía falta por comprobar.",
      },
      {
        title: "Cuentas y sesiones",
        body: "Un identificador de cuenta vincula una identidad con sus registros. Un identificador de sesión distingue actividades de una misma cuenta en momentos diferentes. Coincidir en el nombre visible no basta para demostrar que dos acciones pertenecen a la misma sesión.\n\nLos eventos de autenticación pueden describir éxitos, fallos y formas de acceso diferentes. Una conexión de red no equivale necesariamente a una sesión interactiva. La investigación debe conservar la descripción del evento, su tiempo y los campos de contexto antes de atribuir acciones.",
      },
      {
        title: "Borrado y residuos",
        body: "Eliminar un archivo de una vista no garantiza que todos sus rastros desaparezcan. Una papelera puede conservar contenido y metadatos con referencias que permiten asociarlos, mientras que otra copia del mismo nombre puede pertenecer a una ubicación diferente.\n\nUna recuperación forense identifica qué representa cada artefacto y conserva su contexto. Restaurar un nombre no demuestra haber recuperado el archivo buscado. El análisis de copias, rutas y tiempos reduce confusiones sin necesidad de modificar el material preservado.",
      },
      {
        title: "Correlación y pérdida de registros",
        body: "Una cronología sólida relaciona cuentas, sesiones, operaciones y objetos. Ordenar por fecha ayuda a organizar observaciones, pero el último registro no identifica necesariamente al responsable del conjunto de acciones investigadas.\n\nEl vaciado de un registro puede dejar constancia en otra fuente o coexistir con copias preservadas. La evidencia restante necesita evaluarse sin suponer que es completa. Mantener referencias de sesión y distinguir colectores de fuentes originales permite explicar qué relaciones se demostraron y cuáles siguen abiertas.",
      },
      {
        title: "Evidencia operativa y formatos didácticos",
        body: "La observación de un equipo puede incluir archivos preservados y cambios producidos durante una prueba. Conviene separar la evidencia histórica del estado actual y explicar qué herramienta leyó o modificó cada elemento.\n\nUna exportación de registros no es necesariamente un archivo nativo de eventos. Del mismo modo, una representación didáctica de una credencial puede modelar sus permisos sin ser un ticket utilizable por un sistema real. Las conclusiones deben mantenerse dentro de lo que el formato y la adquisición permiten demostrar.",
      },
    ],
  },
  IOT_REFERENCE_BOOK,
  OT_REFERENCE_BOOK,
  FILE_REFERENCE_BOOK,
  ...SPECIALIST_BOOKS,
  ...ADVANCED_BOOKS,
  ...DATA_CONTRACT_BOOKS,
];
