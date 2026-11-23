import type { EvidenceCase } from "../casework/types";
export const DEVOPS_CASES: EvidenceCase[] = [
  {
    title: "El secreto del build",
    question:
      "Inspecciona el historial preservado de la imagen. Recupera el token que se pasó por ARG, no el nombre de la variable. Entrega CTF{token}.",
    answer: "lab-reg-74-C",
    files: {
      "history.txt":
        "IMAGE history preservado\nARG REGISTRY_TOKEN\nRUN REGISTRY_TOKEN=lab-reg-74-C build-helper\nRUN rm -f /tmp/token\n",
      "alcance.txt":
        "Exportación didáctica del historial. No ejecuta Docker ni contiene credenciales de un registro real.",
    },
  },
  {
    title: "El usuario efectivo",
    question:
      "La política prohíbe UID 0. Identifica el servicio cuya configuración final sobrescribe el usuario no privilegiado de la imagen. Entrega CTF{servicio}.",
    answer: "builder",
    files: {
      "image.json": '{"Config":{"User":"1001"}}',
      "compose.json":
        '{"services":{"frontend":{"user":"1001"},"builder":{"user":"0"},"metrics":{}}}',
    },
  },
  {
    title: "El secreto publicado",
    question:
      "El objeto Secret conserva datos codificados, no cifrados. Decodifica data.deployKey y entrega CTF{valor_UTF8}.",
    answer: "deploy-lab-29",
    files: {
      "secret.json":
        '{"apiVersion":"v1","kind":"Secret","metadata":{"name":"ci-demo"},"data":{"deployKey":"ZGVwbG95LWxhYi0yOQ=="}}',
    },
  },
  {
    title: "El evento equivocado",
    question:
      "El despliegue solo debe ejecutarse en push sobre main. Identifica el job cuyo filtro también permite pull_request de un fork. Entrega CTF{job}.",
    answer: "publish-prod",
    files: {
      "workflow.json":
        '{"jobs":{"lint":{"events":["push","pull_request"],"deploy":false},"publish-prod":{"events":["push","pull_request"],"branches":["main"],"deploy":true},"preview":{"events":["pull_request"],"deploy":false}}}',
      "evento.json": '{"event":"pull_request","base":"main","fork":true}',
    },
  },
  {
    title: "La capa que no desapareció",
    question:
      "El archivo ya no existe en la vista final, pero su capa inferior permanece. Verifica el digest del blob, lee la versión previa a su whiteout y entrega CTF{valor_de_TOKEN}.",
    answer: "layer-lab-83",
    files: {
      "manifest.json":
        '{"layers":[{"digest":"sha256:e06cc653d0e3a7660d8a1bfd74f002c9561ee9634237247f0f58de16ec1ab1f0","blob":"layer1.json"},{"digest":"sha256:59e3a1d890c0df2f7866fe96b2e464a806ed806133cd2018a15b297b3dfd8c24","blob":"layer2.json"}]}',
      "layer1.json": '{"files":{"/run/build.env":"TOKEN=layer-lab-83\\n"}}',
      "layer2.json": '{"whiteouts":["/run/build.env"]}',
      "formato.txt":
        "Representación didáctica de capas y whiteouts en JSON; no es un tar OCI nativo. El digest corresponde a los bytes UTF8 exactos del blob, sin salto final.",
    },
  },
  {
    title: "La etiqueta se movió",
    question:
      "Compara el digest aprobado con la resolución de la etiqueta usada en el despliegue. Encuentra la imagen que se ejecutó sin aprobación y entrega CTF{digest_hex_sin_prefijo}.",
    answer: "91bc3f2e2dcf88562bb2f16499c20a9f107043c21520b3cffc869ccd0c1ffcd0",
    files: {
      "approved.json":
        '{"repository":"app/web","digest":"4b7ee2cb26471f9cd024f68f8a5c7ab1d3b22d95937fd7afea4e88a2ebacd998"}',
      "deploy.json": '{"image":"app/web:stable"}',
      "registry.json":
        '{"app/web:stable":"91bc3f2e2dcf88562bb2f16499c20a9f107043c21520b3cffc869ccd0c1ffcd0","app/web:v1":"4b7ee2cb26471f9cd024f68f8a5c7ab1d3b22d95937fd7afea4e88a2ebacd998"}',
    },
  },
  {
    title: "Una procedencia verificable",
    question:
      "Verifica HMAC-SHA256 de los bytes decodificados de cada statement. Conserva solo repository=team/app y builder=ci-main. Entrega CTF{digest_del_artefacto_validado}.",
    answer: "3924ff949cc0bf35f0ddf40acda49112d7e2f0b5b1065b4604605bdbaee0c647",
    files: {
      "key.hex": "63692d6c61622d7369676e696e672d6b6579",
      "attestations.json":
        '[{"statement":"eyJyZXBvc2l0b3J5Ijoib3RoZXIvcmVwbyIsImRpZ2VzdCI6ImY3NTI1OWVkODVlMzc0ZmNlMGZjNmQwODg5NWYyYjg5MzE1YjFmZmQ5ZmZhYjI5MTg4MTg0ZDBjMjM0NjA4NTMiLCJidWlsZGVyIjoiY2ktbWFpbiJ9","hmac":"e8b6242610ff52fd48e0dc091fd4c574b7a9fdbf3aa34dca55e9e51cb1dee5c6"},{"statement":"eyJyZXBvc2l0b3J5IjoidGVhbS9hcHAiLCJkaWdlc3QiOiIzOTI0ZmY5NDljYzBiZjM1ZjBkZGY0MGFjZGE0OTExMmQ3ZTJmMGI1YjEwNjViNDYwNDYwNWJkYmFlZTBjNjQ3IiwiYnVpbGRlciI6ImNpLW1haW4ifQ==","hmac":"871f87f0a61c337435c74c74d0279e0d96ec024300bd1b3fe92e2aa2d8f3a2ee"},{"statement":"eyJyZXBvc2l0b3J5IjoidGVhbS9hcHAiLCJkaWdlc3QiOiJlNTc1MGQ0MjVmMzA1ZjU1YjkxNDI5MTc4N2NmODM2OTllMDA5NTdmMmY1Y2ZkOTZhMDY5Nzg2Njc4ZTAwZmFkIiwiYnVpbGRlciI6ImNpLW1haW4ifQ==","hmac":"0000000000000000000000000000000000000000000000000000000000000000"}]',
      "formato.txt":
        "Atestación didáctica HMAC, no una firma Sigstore real. Base64 conserva los bytes exactos firmados.",
    },
  },
  {
    title: "El secreto cruzó de etapa",
    question:
      "Resuelve el COPY de la etapa final, incluye únicamente archivos bajo su origen y localiza el secreto copiado por error. Verifica su resumen y entrega CTF{valor_de_DEPLOY_TOKEN}.",
    answer: "stage-token-41",
    files: {
      Dockerfile:
        "FROM builder AS build\nWORKDIR /workspace\nRUN build\nFROM runtime\nCOPY --from=build /workspace/dist/ /app/\nUSER 1001\n",
      "build-stage.json":
        '{"/workspace/.env":"DEPLOY_TOKEN=decoy","/workspace/dist/index.js":"console.log(\\"ok\\")","/workspace/dist/.env":"DEPLOY_TOKEN=stage-token-41\\n"}',
      "preserved.sha256":
        "6090044fde3f2d5ccb628a2a7321ea818519e72d78fea9a177d7eca259fc536a",
    },
  },
  {
    title: "La cuenta del runner",
    question:
      "Cruza bindings y reglas RBAC del namespace prod. Las autorizaciones son aditivas; encuentra el serviceAccount de ci que alcanza get sobre secrets en prod mediante ClusterRoleBinding. Forma cuenta|rol|recurso y entrega CTF{sha256_del_texto_sin_salto}.",
    answer: "da5aaf0fe5c103522f9595b9dc9e6f928482264c6691cd72a9c83a78d342d2c8",
    files: {
      "bindings.json":
        '[{"kind":"RoleBinding","namespace":"dev","subject":"ci/dev-runner","role":"secret-reader"},{"kind":"ClusterRoleBinding","subject":"ci/build-runner","role":"secret-reader"},{"kind":"ClusterRoleBinding","subject":"ci/metrics","role":"pod-reader"}]',
      "roles.json":
        '{"secret-reader":{"verbs":["get"],"resources":["secrets"]},"pod-reader":{"verbs":["get"],"resources":["pods"]}}',
    },
  },
  {
    title: "La caché de otra revisión",
    question:
      "Reconstruye la clave declarada del caché como os|toolchain. Identifica el hit de esa clave cuyo lockHash difiere del lock actual, pero fue consumido por el job de release. Forma entry|runner|artifact y entrega CTF{sha256_del_texto_sin_salto}.",
    answer: "379d17ef03b02da1e6e2bd96df1385889703a3d9a4a3b94fce7b29f7fcb7cc4a",
    files: {
      "release.json":
        '{"os":"linux","toolchain":"node22","lockHash":"e13bbeea99fdd21f6991523e74cda51dc41ac0ea7c49c1e84db1a2e052a767d1","job":"release"}',
      "cache.csv":
        "entry,key,lockHash,artifact\nCACHE-7,linux|node20,04418ba18bce0f7ad5c9b9f2e31c4d174f06999bc199f1f04f56b88bb115461c,6e1278dbb2ad15211df89fb1189ffec8bd27900d71d7c122983ed2aef09e2a6a\nCACHE-8,linux|node22,04418ba18bce0f7ad5c9b9f2e31c4d174f06999bc199f1f04f56b88bb115461c,7bc8a334df7db1ee33b0309a3dc7ab7aa02fdb28ae7fb98d2e62a8e5edce5f05\nCACHE-9,linux|node22,e13bbeea99fdd21f6991523e74cda51dc41ac0ea7c49c1e84db1a2e052a767d1,ec62c998177761fb5b525aa6b70daef6a5bc3b7810a921f891532750b18c5bb9\n",
      "jobs.csv":
        "job,runner,cacheEntry\nrelease,runner-22,CACHE-8\nlint,runner-30,CACHE-9\n",
      "key.txt": "Clave heredada: os|toolchain. No incluye lockHash.",
    },
  },
];
