import { pointsFor } from "../scoring/policy";
export type OsintCase = {
  id: string;
  title: string;
  points: number;
  question: string;
  answer: string;
  pages: {
    media?: { src: string; alt: string; caption: string };
    path: string;
    title: string;
    publisher: string;
    date: string;
    body: string;
  }[];
};

export const OSINT_CASES: OsintCase[] = [
  {
    id: "osint-01",
    title: "La firma al pie",
    points: pointsFor("osint-01"),
    question:
      "El programa de la muestra Niebla solo conserva unas iniciales. Identifica el alias público de quien firmó el cartel seleccionado para la edición de octubre. Entrega CTF{alias}, respetando los guiones bajos.",
    answer: "nube_de_tinta",
    pages: [
      {
        path: "/cultura/programa",
        title: "Programa de octubre",
        publisher: "Casa del Puerto",
        date: "2025-10-02",
        body: "Muestra Niebla / edición de octubre. Cartel seleccionado: pieza N-17, firmada M. R. El jurado eligió la propuesta de la convocatoria de septiembre. La pieza N-12 obtuvo una mención, pero no se usó como cartel.",
      },
      {
        path: "/revista/convocatoria",
        title: "Cuaderno de la convocatoria",
        publisher: "Revista La Dársena",
        date: "2025-09-21",
        body: "N-17: M. R. / serie Cuadernos del Este. N-12: M. R. / serie Ventanas. El cuaderno reproduce las iniciales de las obras, no los nombres de sus autores.",
      },
      {
        path: "/comunidad/perfiles",
        title: "Perfiles de la comunidad",
        publisher: "Directorio creativo local",
        date: "2025-09-28",
        body: "nube_de_tinta — Mara Ríos. Portafolio: Cuadernos del Este, Pasajes.\nmar_de_papel — Mario Rivas. Portafolio: Ventanas, Faroles.\nniebla_azul — Marina Ruiz. Portafolio: Mapas del Sur. Los nombres y perfiles de este directorio son ficticios.",
      },
      {
        path: "/archivo/cartel-anterior",
        title: "Cartel de la edición anterior",
        publisher: "Casa del Puerto / archivo",
        date: "2024-10-04",
        body: "Niebla, edición 2024. Cartel de Mario Rivas, mar_de_papel. Esta ficha pertenece al programa de 2024 y permanece en el archivo histórico.",
      },
    ],
  },
  {
    id: "osint-02",
    title: "Donde termina la lluvia",
    points: pointsFor("osint-02"),
    question:
      "La foto del sobre perdió su ubicación. Determina en qué plaza del municipio ficticio de Puerto Lumbre fue tomada. Entrega CTF{nombre_de_la_plaza}, en minúsculas, sin tildes y con guiones bajos.",
    answer: "plaza_del_olmo",
    pages: [
      {
        path: "/fototeca/sobre-8",
        media: {
          src: "/assets/evidence/osint-plaza.jpg",
          alt: "Torre baja con reloj cuadrado, fuente de tres peces y acceso de biblioteca a la derecha",
          caption: "Fototeca municipal · Sobre 8",
        },
        title: "Ficha del sobre 8",
        publisher: "Fototeca municipal",
        date: "2025-06-10",
        body: "Descripción de la imagen conservada: reloj cuadrado sobre una torre baja; fuente de tres peces; a la derecha, acceso de una biblioteca. No se ve el nombre de la plaza. La toma está orientada al norte. La ficha conserva la orientación declarada de la toma.",
      },
      {
        path: "/patrimonio/plazas",
        title: "Inventario de plazas",
        publisher: "Patrimonio de Puerto Lumbre",
        date: "2025-01-11",
        body: "Plaza del Olmo: torre de reloj cuadrado, fuente restaurada en 2023.\nPlaza del Faro: torre de reloj redondo, fuente de tres peces.\nPlaza de la Estación: reloj cuadrado, fuente de una garza. La plaza del Faro no alberga una biblioteca.",
      },
      {
        path: "/obras/fuentes",
        title: "Acta de restauración de fuentes",
        publisher: "Oficina de Obras",
        date: "2023-08-19",
        body: "Fuente de tres peces: restaurada en la plaza del Olmo y en la plaza del Faro. Fuente de una garza: plaza de la Estación. La obra del Olmo concluyó antes de abrir el nuevo acceso a la biblioteca.",
      },
      {
        path: "/biblioteca/accesos",
        title: "Guía de accesos",
        publisher: "Biblioteca del Este",
        date: "2024-02-02",
        body: "El acceso público de la biblioteca ocupa el lado oriental de la plaza del Olmo. Desde el extremo sur de la plaza, mirando al norte, queda a mano derecha. La sede antigua, junto a la estación, cerró en 2019.",
      },
    ],
  },
  {
    id: "osint-03",
    title: "La noche del recibo azul",
    points: pointsFor("osint-03"),
    question:
      "Identifica el instante UTC del primer aviso público sobre el cierre del puente, entre las fuentes preservadas. Entrega CTF{AAAAMMDD_HHMM}. Las fechas de captura y las ediciones no son avisos nuevos.",
    answer: "20251018_0235",
    pages: [
      {
        path: "/radio/aviso",
        title: "Boletín de Radio Marea",
        publisher: "Radio Marea",
        date: "2025-10-17",
        body: "Publicado: 17/10/2025, 21:35, hora local de Puerto Lumbre. Aviso: el puente del Este queda cerrado desde esta noche. Editado a las 22:10 para corregir el teléfono de la oficina.",
      },
      {
        path: "/agencia/cable",
        title: "Cable de la agencia",
        publisher: "Agencia del Litoral",
        date: "2025-10-18",
        body: "Publicado: 18/10/2025, 02:50 UTC. El cierre del puente del Este fue comunicado por las emisoras locales. Captura de hemeroteca: 19/10/2025, 08:00 UTC.",
      },
      {
        path: "/municipio/reloj",
        title: "Relojes del municipio",
        publisher: "Puerto Lumbre / información local",
        date: "2025-01-01",
        body: "Durante todo 2025, Puerto Lumbre utiliza UTC−05:00. No cambia sus relojes por temporada. Las publicaciones municipales y la radio local usan esta hora salvo indicación expresa.",
      },
      {
        path: "/archivo/nota",
        title: "Nota de mantenimiento",
        publisher: "Archivo del puente",
        date: "2025-10-17",
        body: "21:20, hora local: se anuncia una inspección para la semana siguiente. La nota no anuncia ni ordena un cierre. Sello de digitalización: 18/10/2025, 02:20 UTC.",
      },
    ],
  },
  {
    id: "osint-04",
    title: "Un nombre bajo la pintura",
    points: pointsFor("osint-04"),
    question:
      "¿Qué taller figuraba como adjudicatario vigente de la restauración del mural el 12 de septiembre de 2025? Entrega CTF{nombre_del_taller}, en minúsculas, sin tildes y con guiones bajos.",
    answer: "taller_ambar",
    pages: [
      {
        path: "/boletin/resolucion-31",
        title: "Resolución 31",
        publisher: "Boletín de Patrimonio",
        date: "2025-08-22",
        body: "Expediente MU-31. Restauración del mural de la estación. Adjudicación inicial: Taller Bruma. Esta resolución queda sujeta a las rectificaciones publicadas antes de la firma de contrato.",
      },
      {
        path: "/boletin/rectificacion",
        title: "Rectificación de septiembre",
        publisher: "Boletín de Patrimonio",
        date: "2025-09-06",
        body: "MU-31: se deja sin efecto la adjudicación de agosto. Nueva adjudicación: Taller Ámbar, registro TA-08. Entra en vigor el 8 de septiembre de 2025.",
      },
      {
        path: "/contratos/firma",
        title: "Registro de firma",
        publisher: "Mesa de contratación",
        date: "2025-09-10",
        body: "Contrato MU-31 firmado con el titular del registro TA-08. Objeto: mural de la estación. Inicio previsto: 15 de septiembre. No constan posteriores cambios de contratista durante septiembre.",
      },
      {
        path: "/prensa/recorte",
        title: "Recorte del festival",
        publisher: "Semanario del Puerto",
        date: "2025-08-24",
        body: "Taller Bruma celebró su selección para el mural. Copia de la noticia original, conservada sin actualizar. Una nota editorial remite al boletín oficial para el estado contractual.",
      },
    ],
  },
  {
    id: "osint-05",
    title: "La otra ventanilla",
    points: pointsFor("osint-05"),
    question:
      "Determina el dominio anunciado como canal oficial del Archivo de Lumbre después de la mudanza de octubre. Entrega CTF{dominio_con_puntos_y_guiones_cambiados_por_guiones_bajos}. Investiga las fuentes preservadas, sin visitar servicios externos.",
    answer: "archivo_lumbre_example",
    pages: [
      {
        path: "/directorio/archivo",
        title: "Entrada del directorio cívico",
        publisher: "Directorio cívico municipal",
        date: "2025-10-01",
        body: "Archivo de Lumbre / institución AL-11. Referencia de sede digital: aviso de traslado TR-19. Este directorio no certifica páginas de agrupaciones privadas que usen nombres semejantes.",
      },
      {
        path: "/avisos/traslado",
        title: "Aviso TR-19",
        publisher: "Secretaría de instituciones",
        date: "2025-10-03",
        body: "La institución AL-11 utiliza archivo-lumbre.example desde el 5 de octubre de 2025. El antiguo archivo-puerto.example mantiene una copia histórica hasta fin de mes. Los dominios .example de este ejercicio son ficticios.",
      },
      {
        path: "/capturas/antiguo",
        title: "Captura de la sede antigua",
        publisher: "Hemeroteca web",
        date: "2025-10-07",
        body: "archivo-puerto.example / aviso visible en portada: nos hemos trasladado. Referencia: TR-19. Esta copia no acepta nuevas solicitudes de consulta.",
      },
      {
        path: "/comunidad/amigos",
        title: "Página de los amigos del archivo",
        publisher: "Asociación Amigos del Patrimonio",
        date: "2025-10-08",
        body: "archivo-lumbre-amigos.example es una iniciativa independiente de voluntarios. Publicamos noticias y horarios, pero no representamos a AL-11 ni gestionamos sus solicitudes.",
      },
    ],
  },
  {
    id: "osint-06",
    title: "El último vagón",
    points: pointsFor("osint-06"),
    question:
      "Localiza el andén de llegada del bulto LL-48 en su trayecto vigente del 22 de octubre. Entrega CTF{anden_N}, sustituyendo N por el número.",
    answer: "anden_4",
    pages: [
      {
        path: "/manifiestos/ll48",
        title: "Manifiesto LL-48",
        publisher: "Archivo público de carga",
        date: "2025-10-22",
        body: "Bulto LL-48 / sello azul / matrícula de vagón V-208. Destino: estación Lumbre. Viaje autorizado: servicio R-73 de las 18:00. La etiqueta del bulto no indica andén.",
      },
      {
        path: "/horarios/servicios",
        title: "Hoja de servicios",
        publisher: "Ferrocarril del Este",
        date: "2025-10-22",
        body: "R-73 / 18:00 / composición V-205, V-208, V-219. R-37 / 18:15 / composición V-108, V-118. Durante las obras se aplican los andenes del aviso O-6.",
      },
      {
        path: "/estacion/obras",
        title: "Aviso O-6",
        publisher: "Jefatura de estación",
        date: "2025-10-20",
        body: "Del 20 al 24 de octubre: R-73 llega al andén 4; R-37, al andén 2. Los horarios impresos antes del día 20 no reflejan esta modificación.",
      },
      {
        path: "/archivo/panel",
        title: "Panel fotografiado antes de las obras",
        publisher: "Colección ferroviaria",
        date: "2025-10-18",
        body: "R-73: andén 1. R-37: andén 4. Fotografía del panel tomada el 18 de octubre. No se ha sustituido el texto para conservar la imagen original.",
      },
    ],
  },
  {
    id: "osint-07",
    title: "La invitación que desapareció",
    points: pointsFor("osint-07"),
    question:
      "Recupera la sala que figuraba en la primera invitación pública de la jornada Archivo Vivo. Entrega CTF{nombre_de_la_sala}, en minúsculas, sin tildes y con guiones bajos. La reserva interna no equivale a una invitación publicada.",
    answer: "sala_de_las_mareas",
    pages: [
      {
        path: "/agenda/actual",
        title: "Agenda actual",
        publisher: "Centro Cultural de Lumbre",
        date: "2025-11-03",
        body: "Archivo Vivo / 8 de noviembre / Auditorio del Sur. Cambio de sala confirmado el 3 de noviembre. La primera invitación fue publicada el 28 de octubre; su enlace ya no funciona en el portal actual.",
      },
      {
        path: "/archivo/captura-28",
        title: "Captura del 28 de octubre",
        publisher: "Archivo web de la ciudad",
        date: "2025-10-28",
        body: "Captura: 28/10/2025, 17:40. Invitación publicada: 28/10/2025, 16:00. Archivo Vivo / 8 de noviembre / Sala de las Mareas. Página guardada antes del cambio de sede.",
      },
      {
        path: "/archivo/captura-30",
        title: "Captura del 30 de octubre",
        publisher: "Archivo web de la ciudad",
        date: "2025-10-30",
        body: "Archivo Vivo / Aula del Olmo. Publicación editada el 30/10/2025. No sustituye la fecha de publicación original del día 28.",
      },
      {
        path: "/reservas/borrador",
        title: "Hoja de reserva previa",
        publisher: "Centro Cultural / registro de salas",
        date: "2025-10-25",
        body: "Borrador interno: Aula del Olmo, pendiente de confirmar. Este documento no se envió a invitados ni fue utilizado como cartel de la jornada.",
      },
    ],
  },
  {
    id: "osint-08",
    title: "Antes de la primera foto",
    points: pointsFor("osint-08"),
    question:
      "Identifica el acontecimiento original de la fotografía reutilizada en la campaña del mercado. Entrega CTF{nombre_del_acontecimiento}, en minúsculas, sin tildes y con guiones bajos.",
    answer: "fiesta_del_agua",
    pages: [
      {
        path: "/campana/cartel",
        title: "Cartel del mercado",
        publisher: "Asociación del Mercado",
        date: "2025-07-04",
        body: "Campaña Mercado al Amanecer, 2025. Crédito de imagen: Fototeca LM-204. La fecha de la campaña corresponde al diseño del cartel, no necesariamente a la toma fotográfica.",
      },
      {
        path: "/fototeca/lm204",
        media: {
          src: "/assets/evidence/osint-boats.jpg",
          alt: "Tres barcas con banderines blancos junto a un arco de flores",
          caption: "Fototeca · LM-204",
        },
        title: "Ficha fotográfica LM-204",
        publisher: "Fototeca de Lumbre",
        date: "2022-08-16",
        body: "LM-204 / negativo original: tira F-22, fotograma 6. Descripción: tres barcas con banderines blancos junto a un arco de flores. Adquisición del negativo: 2022. Remisión de contexto: cuaderno de tomas CT-9.",
      },
      {
        path: "/cuadernos/ct9",
        title: "Cuaderno CT-9",
        publisher: "Colección de la fotógrafa Eva Salas",
        date: "2018-06-12",
        body: "Tira F-22, fotogramas 1 a 9: Fiesta del Agua, 12 de junio de 2018. Fotogramas 10 a 16: desmontaje del arco, al día siguiente. La tira F-23 corresponde a la feria del mercado de julio.",
      },
      {
        path: "/prensa/republicacion",
        title: "Republicación de una imagen",
        publisher: "Boletín del Barrio",
        date: "2024-07-01",
        body: "Una copia recortada de LM-204 ilustró la Feria del Mercado de 2024. Se añadió un logotipo sobre el arco de flores. El boletín no conserva los datos del negativo original.",
      },
    ],
  },
  {
    id: "osint-09",
    title: "Dos iniciales en la libreta",
    points: pointsFor("osint-09"),
    question:
      "Determina el equipo al que pertenecía la persona que firmó como L. V. la memoria técnica del proyecto Mirador de 2024. Entrega CTF{equipo_nombre}, en minúsculas y sin tildes.",
    answer: "equipo_cedro",
    pages: [
      {
        path: "/proyectos/mirador",
        title: "Memoria del proyecto Mirador",
        publisher: "Observatorio de la Bahía",
        date: "2024-12-11",
        body: "Proyecto Mirador / memoria técnica 2024. Firma: L. V. / identificador de autora OV-217. El índice de colaboradores incluye también a L. V., OV-271, responsable de la exposición visual de 2023.",
      },
      {
        path: "/directorio/colaboradores",
        title: "Directorio de colaboradores",
        publisher: "Observatorio / directorio público",
        date: "2024-06-04",
        body: "OV-217: Lucía Vera, especialidad instrumentación. OV-271: Lucas Vidal, especialidad fotografía. OV-218: Laura Vela, especialidad cartografía. Todos son personajes ficticios del laboratorio.",
      },
      {
        path: "/memorias/equipos",
        title: "Equipos de 2024",
        publisher: "Memoria anual del Observatorio",
        date: "2025-01-20",
        body: "Equipo Cedro: instrumentación, OV-217 y OV-220. Equipo Sauce: fotografía, OV-271 y OV-230. Equipo Olmo: cartografía, OV-218. Los equipos se reorganizaron en febrero de 2025.",
      },
      {
        path: "/noticias/reorganizacion",
        title: "Nueva distribución de equipos",
        publisher: "Observatorio / noticias",
        date: "2025-02-10",
        body: "Desde febrero de 2025, OV-217 pasa al Equipo Sauce. La modificación no altera las afiliaciones de las memorias técnicas firmadas durante 2024.",
      },
    ],
  },
  {
    id: "osint-10",
    title: "El camino de regreso",
    points: pointsFor("osint-10"),
    question:
      "Reconstruye la ruta del depósito D-17 y determina la entrada autorizada para recogerlo el 6 de noviembre de 2025. Entrega CTF{nombre_de_la_entrada}, en minúsculas, sin tildes y con guiones bajos.",
    answer: "puerta_norte",
    pages: [
      {
        path: "/registro/depositos",
        title: "Registro de depósitos culturales",
        publisher: "Archivo municipal",
        date: "2025-10-29",
        body: "D-17 / colección de maquetas / custodio registral EC-06. D-71 / colección de mapas / custodio EC-09. La entrega del depósito D-17 está autorizada para el 6 de noviembre, según la agenda de retiros.",
      },
      {
        path: "/entidades/cambios",
        title: "Cambios de denominación",
        publisher: "Registro de entidades culturales",
        date: "2025-09-08",
        body: "EC-06: antes Casa de Oficios; desde septiembre, Taller del Estuario. EC-09: Casa del Estero. Son entidades distintas pese a la similitud de los nombres.",
      },
      {
        path: "/directorio/sedes",
        title: "Directorio de sedes",
        publisher: "Consejo Cultural de Lumbre",
        date: "2025-10-15",
        body: "Taller del Estuario: sede B, patio del ferrocarril. Casa del Estero: sede A, edificio del mercado. Casa de Oficios figura como denominación histórica de EC-06, sin local adicional.",
      },
      {
        path: "/agenda/retiros",
        title: "Agenda de retiros",
        publisher: "Central de depósitos",
        date: "2025-11-01",
        body: "6 de noviembre: entregas de sede B por la entrada norte; sede A por la puerta del patio. El 7 de noviembre se invierten temporalmente los accesos por mantenimiento. Denominación de la entrada de sede B: Puerta Norte.",
      },
      {
        path: "/archivo/circular",
        title: "Circular de agosto",
        publisher: "Casa de Oficios / archivo",
        date: "2025-08-20",
        body: "Acceso habitual de la colección de maquetas por Puerta del Patio. Esta circular es anterior al traslado de la colección a la sede B y a la agenda de noviembre.",
      },
    ],
  },
];
