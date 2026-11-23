export const FILE_REFERENCE_BOOK = {
  id: "volume-14",
  category: "Archivos",
  title: "Archivos · Preservación y análisis forense",
  pages: [
    {
      title: "Adquirir antes de interpretar",
      body: "La investigación comienza por conservar los bytes originales y registrar su procedencia. Se trabaja sobre copias y se documentan la herramienta, fecha, alcance y limitaciones de la adquisición. Leer un archivo puede cambiar metadatos en algunos sistemas; la protección contra escritura y las copias verificadas reducen ese riesgo.\n\nUna exportación textual puede facilitar el análisis, pero conserva únicamente los campos que incluyó. No equivale a una imagen completa del medio ni permite recuperar información que nunca fue adquirida.",
    },
    {
      title: "Nombre, firma y estructura",
      body: "Una extensión es una convención de nombres. Una firma inicial ayuda a reconocer un formato, pero no valida por sí sola todo su contenido. Los contenedores pueden compartir cabeceras y un archivo puede estar truncado o contener estructuras contradictorias.\n\nEl análisis combina bytes iniciales, estructura interna, tamaño y validadores apropiados. Abrir un documento no exige ejecutarlo; una vista hexadecimal permite examinar información sin confiar en el programa asociado a su extensión.",
    },
    {
      title: "Integridad y representación",
      body: "Un resumen criptográfico depende de los bytes exactos: codificación, salto final, orden y contenido. Dos textos visualmente iguales pueden tener hashes diferentes. Un hash confirma coincidencia con una referencia; la autenticidad depende también de cómo se obtuvo y protegió esa referencia.\n\nHexadecimal y Base64 representan bytes. Antes de comparar o resumir, hay que distinguir los bytes originales del texto que los representa y registrar cualquier transformación.",
    },
    {
      title: "Entradas que la interfaz omite",
      body: "La vista de una carpeta puede excluir entradas por convenciones de nombre, atributos o configuración. Una ausencia en pantalla no demuestra ausencia en el medio. La enumeración y el registro de metadatos deben indicar qué filtros se aplicaron.\n\nLos nombres tampoco son identificadores duraderos: pueden cambiar, reutilizarse o referenciar un mismo objeto. Relacionar identificadores internos y atributos evita atribuir la historia de una entrada a otro objeto con el mismo nombre.",
    },
    {
      title: "Eliminación y reutilización",
      body: "Eliminar una entrada no siempre borra inmediatamente sus datos. La recuperabilidad depende del sistema de archivos, reasignaciones, cifrado, TRIM y adquisición. Una entrada eliminada puede conservar referencias que ya no apuntan al contenido original.\n\nLa conclusión debe separar lo recuperado de lo inferido y documentar posibles reutilizaciones. La recuperación sobre el dispositivo original puede sobrescribir evidencia; se realiza sobre copias controladas.",
    },
    {
      title: "Flujos y atributos",
      body: "Un objeto puede tener información fuera de su flujo principal: flujos con nombre, atributos extendidos, permisos y otros metadatos. Las herramientas de copia y los formatos de destino pueden omitirlos.\n\nNTFS permite flujos de datos alternativos; su presencia no implica por sí sola una intrusión. El analista registra tipo, nombre y contenido de cada flujo y distingue metadatos de procedencia de datos de aplicación.",
    },
    {
      title: "Referencias, revisiones y rutas",
      body: "Un documento con actualizaciones incrementales puede conservar objetos anteriores. No todo texto encontrado está vigente o es alcanzable desde el catálogo de una revisión. Las firmas necesitan validarse dentro de su alcance y de las transformaciones posteriores.\n\nLos enlaces relativos se interpretan desde la carpeta que contiene cada enlace. Normalizar una ruta no autoriza a seguirla fuera del ámbito adquirido. Hay que detectar ciclos, límites y referencias ausentes antes de atribuir un destino.",
    },
    {
      title: "Reconstrucción y tamaño lógico",
      body: "Los fragmentos físicos no siempre están en orden lógico. Una cadena o mapa de asignación determina cómo reconstruirlos. Hay que detectar referencias duplicadas, ciclos y finales inesperados.\n\nEl tamaño lógico delimita los bytes del archivo. El espacio sobrante del último bloque puede contener residuos ajenos: incorporarlo cambia tanto el contenido como su resumen. Una exportación parcial exige expresar qué regiones faltan.",
    },
    {
      title: "Archivos dispersos y generaciones",
      body: "Un archivo disperso representa regiones sin bloques físicos asignados. Su lectura lógica devuelve ceros en los huecos; ese comportamiento difiere de eliminar las regiones o rellenarlas con caracteres. El hash lógico incluye esos bytes.\n\nLos sistemas con revisiones pueden conservar extents de generaciones anteriores o transacciones pendientes. Reconstruir una versión exige aplicar el estado comprometido correspondiente y conservar offsets y longitud.",
    },
    {
      title: "Manifiestos y pruebas de inclusión",
      body: "Un árbol de hashes permite comprobar pertenencia a un conjunto sin recibir todos sus elementos. El formato define cómo calcular hojas, concatenar nodos y distinguir izquierda de derecha. Concatenar hashes binarios produce un resultado distinto de concatenar sus caracteres hexadecimales.\n\nUna prueba solo tiene valor frente a una raíz obtenida por un canal confiable. Verifica pertenencia respecto de esa raíz; no acredita por sí sola que el contenido sea verdadero ni que su adquisición haya sido legítima.",
    },
  ],
};
