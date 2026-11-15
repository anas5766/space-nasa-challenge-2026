# Valmed: correcciones y reproducción de los hallazgos de QA

Base: c8881fc. Rama: fix/qa-health-flows. Las pruebas usan datos sintéticos y un perfil nuevo; no modifican el historial de la persona que usa la aplicación.

| ID | Cómo se reproducía antes | Resultado comprobado después |
|---|---|---|
| P01 | Health → Log readings, guardar la demo con Sleep = 5.8. El navegador rechazaba el incremento. | Permite décimas de hora y guarda 5.8 sin cambiarlo. |
| P02 | Guardar Sleep = 6; comparar Health, Overview y Anatomy. Se veía ATTENTION en Health y CRITICAL en las otras. | Las tres muestran CRITICAL. Comparten el cálculo y las etiquetas. Health explica la escala ilustrativa y sus límites. |
| P03 | Cargar la demo lunar del día 150 y abrir Overview. La navegación anunciaba órbita, día 128 y una estación a 408 km. | Ya no se presenta una ubicación, altitud ni día fijo como dato del perfil. El reloj muestra UTC; Health conserva el contexto de misión. |
| P04 | Cambiar una métrica y abrir Overview: aparecía un porcentaje de bienestar sin escala validada. | Overview muestra NOT SCORED y el número de señales que revisar. |
| P05 | Escribir en el chat y recargar. Los mensajes seguían ahí aunque README decía que sólo vivían en memoria. | Se verificó la persistencia tras recargar; README describe localStorage y el control para borrar el chat. |
| P06 | Revisar un protocolo, navegar a Overview y volver a Health. El caso quedaba sin editor para retomarlo. | Review / update outcome recupera el mismo caso, sus respuestas, mediciones, acción y estado. |
| N01 | Enviar «Prueba sintética de QA: tengo dolor en el pecho 2/10». Se registraba como dolor muscular. | Se registra como dolor torácico. |
| N02 | Enviar el mismo mensaje. La prioridad sobrescribía el 2 declarado con 8. | Conserva 2/10 y trata la alerta por separado. |
| N03 | Registrar dolor torácico, añadir más de cinco notas y preparar el informe. Desaparecía la observación inicial. | Se comprobó el texto destinado al portapapeles: incluye la entrada torácica y las siete notas siguientes. |
| N04 | Dejar un protocolo torácico con respuestas Yes y resolver otro muscular posterior. Abrir Assistant. | La emergencia anterior sigue visible. Al seleccionar el caso prioritario se consideran todos los casos guardados; la prueba unitaria distingue resolución y traspaso. |
| N05 | Enviar un valor JSON nulo al endpoint de chat de una instancia aislada. Antes terminaba el proceso. | Devuelve HTTP 400; una petición posterior a Health en el mismo proceso devuelve 200. |
| N06 | Abrir dos pestañas Health, restablecer el perfil en A y editar humedad en B. Volvía el día 150. | B borra el día; al guardar 46 % en B, A recibe 46 % y el día sigue vacío. |
| N07 | Abrir Log readings con un número inválido y pulsar Cancel o ×. El formulario impedía cerrar. | Ambos cierran incluso con Sleep = 99; Save sigue validando. |
| N08 | Introducir humedad 150 %, presión −20 o calidad del sueño 9 y recargar. Quedaban guardados. | Los tres se rechazan. Tras cada recarga se conserva el último perfil válido. No se corrigen silenciosamente registros antiguos. |
| N09 | Guardar una acción, cambiar el estado del mismo protocolo y volver a guardar. El botón permanecía deshabilitado. | El segundo guardado actualiza el caso existente y persiste el estado nuevo. |
| N10 | Revisar un caso y cambiar el síntoma primario: se seguía viendo la decisión anterior. | Al editar las entradas se retira el resultado hasta revisar de nuevo. |
| N11 | Añadir más de cinco síntomas: el contador incluía entradas sin fila ni control para eliminarlas. | Cada entrada conservada tiene fila y control de eliminación. Se mantiene el límite existente de almacenamiento del diario. |
| N12 | Enviar «I have no chest pain, but my leg hurts 3/10». La negación descartaba todo el mensaje. | Se guarda la pierna con 3/10; el pecho negado no se registra. La prueba cubre esta construcción, no comprensión general de lenguaje natural. |
| N13 | Desde la demo lunar, cambiar a Earth sin registrar nuevas lecturas y ver Sleep. Se dibujaba la curva lunar. | Sin datos del mismo lugar y gravedad no hay curva ni valor de tendencia. |
| N14 | Con ese mismo cambio y sin referencia comparable, consultar los hallazgos por métrica. Aparecían NORMAL. | Se muestra UNKNOWN cuando faltan referencias o historia suficiente y no hay otra regla que determine un estado. |
| N15 | Guardar una nota y abrir Add symptom otra vez. Se heredaban texto e intensidad. | Cada nota nueva abre con texto vacío e intensidad inicial 3. |
| N16 | Desde una alerta automática por dolor torácico de 3/10, una respuesta del modelo condicionó la escalada a superar 4/10. La frase era variable. | El flujo de alerta prioritaria usa el texto fijo del protocolo. La prueba comprueba el texto de checklist y cero peticiones al modelo; no depende de que Ollama repita una frase concreta. |

## Repetir la verificación

- Desde la raíz: `node --test tests/*.test.mjs`. Incluye una prueba HTTP de proceso real en un puerto local libre.
- Con Playwright y Chromium disponibles: `node tests/qa-browser.cjs`. Si se usa una instalación externa, definir `NODE_PATH` para Playwright y `CHROMIUM_PATH` para el ejecutable.
- La prueba de navegador carga los HTML y módulos de esta rama en Chromium, maneja formularios, navega, recarga y abre dos pestañas. Intercepta sólo como entorno de prueba el transporte (archivos locales, portapapeles y API del modelo); los formularios, la validación del navegador, el motor y localStorage son reales. No evalúa la calidad general de Ollama, el render 3D del CDN ni procedimientos médicos.
