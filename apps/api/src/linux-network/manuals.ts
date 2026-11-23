export const LINUX_MANUALS: Record<string, string> = {
  ls: "ls [-l] [-a] [ruta]\nLista entradas; -a incluye nombres que empiezan por punto; -l muestra permisos, propietario y bytes.",
  cd: "cd [ruta]\nCambia el directorio de la sesión. Sin ruta o con ~ vuelve a la carpeta personal; .. sube un nivel.",
  pwd: "pwd\nMuestra la ruta del directorio actual.",
  cat: "cat archivo [archivo...]\nLee y concatena archivos con tus permisos. Usa comillas para nombres con espacios.",
  find: "find [ruta] [-type f|d] [-name patrón] [-user usuario] [-size Nc] [-readable]\nBusca entradas por tipo, nombre (* y ?), propietario, tamaño exacto en bytes o lectura permitida.",
  grep: "grep [-n] [-i] [-v] texto [archivo...]\nBusca texto literal (no expresiones regulares). -n añade número de línea; -i ignora mayúsculas; -v invierte la selección. Sin archivo recibe una tubería.",
  sort: "sort [archivo...]\nOrdena líneas. Sin archivo recibe una tubería.",
  uniq: "uniq [-u|-c] [archivo]\nAgrupa líneas consecutivas iguales. -u muestra las que aparecen una sola vez; -c añade el conteo. No ordena la entrada.",
  strings:
    "strings [archivo]\nExtrae secuencias ASCII imprimibles de al menos cuatro caracteres.",
  base64:
    "base64 [-d|--decode] [archivo]\nCodifica bytes como Base64 o recupera los bytes originales con -d.",
  xxd: "xxd [-p] [archivo]\nxxd -r -p [archivo]\nMuestra bytes en hexadecimal continuo o convierte ese hexadecimal en bytes.",
  gzip: "gzip -dc archivo.gz\nDescomprime a la salida estándar sin modificar el archivo. zcat archivo.gz es equivalente.",
  zcat: "zcat archivo.gz\nDescomprime un archivo gzip a la salida estándar.",
  file: "file archivo...\nIdentifica texto ASCII, datos binarios o un contenedor gzip a partir del contenido.",
  stat: "stat archivo...\nMuestra tamaño, propietario y permisos de las entradas.",
  head: "head [-n cantidad] [archivo]\nMuestra las primeras líneas (10 por defecto).",
  tail: "tail [-n cantidad] [archivo]\nMuestra las últimas líneas (10 por defecto).",
  wc: "wc [-l|-w|-c] [archivo]\nCuenta saltos de línea, palabras o bytes.",
  chmod:
    "chmod modo archivo\nCambia permisos de un archivo propio usando tres dígitos octales. Cada dígito combina lectura 4, escritura 2 y ejecución 1: propietario, grupo y otros.",
  sudo: "sudo -l\nsudo -u usuario comando argumento\nConsulta y utiliza las autorizaciones limitadas configuradas para tu cuenta. No concede permisos generales.",
  ssh: "ssh usuario@servidor\nAbre un prompt de contraseña sin mostrarla ni guardarla en el historial. Requiere VPN y los niveles anteriores completados. La flag del servidor anterior sirve de contraseña y valida ese relevo al autenticar. Ctrl+C cancela la autenticación.",
  vpn: "vpn connect | vpn disconnect | vpn status\nGestiona el túnel de la red del juego. Desconectarlo cierra SSH y retira las rutas del segmento.",
  submit:
    "submit clave\nValida la credencial encontrada en el servidor actual. Guarda puntos una sola vez y habilita el siguiente nivel. La clave encontrada también es su contraseña SSH.",
  reset:
    "reset --confirm\nRestaura los archivos de tu servidor actual a su estado inicial. Conserva todos los puntos y niveles resueltos.",
  echo: 'echo texto\nEscribe texto en la salida. echo "una nota" > nota.txt crea o reemplaza un archivo; >> añade contenido.',
  touch:
    "touch archivo...\nCrea archivos vacíos o conserva su contenido si ya existen.",
  cp: "cp origen destino\nCopia un archivo legible a un destino donde puedes escribir.",
  mv: "mv origen destino\nMueve un archivo propio a otro nombre de tu carpeta personal o /tmp.",
  rm: "rm archivo\nElimina un archivo propio. reset --confirm permite restaurar el servidor.",
};
