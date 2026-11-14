# SPACE NASA CHALLENGE 2026

## Objetivo

Desarrollar una herramienta visual para ayudar a los astronautas a evaluar su propia salud durante misiones espaciales, identificar riesgos potenciales y recibir recomendaciones rápidas para mejorar su bienestar o solicitar atención médica especializada.

La solución debe combinar:
- entrada de datos del usuario (texto, clics, cámara o mediciones)
- análisis de indicadores clave de salud
- visualización clara con colores, gráficos y referencias rápidas
- recomendaciones de acción según el riesgo detectado

## Idea central del producto

Una aplicación web de dashboard para astronautas que:
- permite registrar métricas de salud básicas y síntomas
- presenta el estado general del cuerpo con un diagrama visual interactivo
- compara valores actuales con rangos de referencia
- identifica señales de alerta y prioriza recomendaciones
- sugiere acciones preventivas o avisos para la tripulación o médicos de tierra

## Contexto científico y uso

El sistema puede apoyarse en conocimientos de la NASA Human Research Program y otras fuentes públicas sobre riesgos de la exploración espacial, por ejemplo:
- microgravedad
- radiación
- sueño insuficiente
- estrés psicológico
- exposición a ambientes cerrados
- cambios metabólicos y cardiovasculares
- deshidratación y pérdida muscular

## MVP propuesto

### 1. Registro cotidiano de salud
- peso, presión arterial, frecuencia cardíaca
- glucosa en sangre
- hidratación
- sueño y fatiga
- dolor o molestias por región corporal
- síntomas de mareo, náusea, visión borrosa, debilidad

### 2. Evaluación visual interactiva
- figura humana con partes del cuerpo clicables
- cada zona muestra estado, riesgos y recomendaciones
- color coding: normal / atención / crítico

### 3. Recomendaciones
- descansos, hidratación, actividad física, alimentación
- pasos inmediatos para evitar condiciones graves
- enlace a protocolos de soporte o contacto con médico

### 4. Evolución temporal
- historial de métricas durante la misión
- gráficos de tendencia por indicador
- alertas cuando un valor empeora

## Stack sugerido para el MVP

Se recomienda una base simple y rápida de desarrollar:
- HTML5 + CSS3 + JavaScript (frontend web)
- sin framework pesado para arrancar rápido
- estructura modular por componentes y servicios
- posibilidad de escalar a React en una segunda etapa si el proyecto crece

## Estructura del proyecto

```text
space-nasa-challenge-2026/
├── README.md
├── .gitignore
├── index.html
├── assets/
│   └── README.md
├── docs/
│   └── roadmap.md
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── components/
│   │   └── HealthPanel.js
│   ├── data/
│   │   └── health-metrics.js
│   ├── services/
│   │   └── assessment.js
│   └── utils/
│       └── formatters.js
├── tests/
│   └── assessment.test.js
└── .vscode/
    └── settings.json
```

## Plan inicial de trabajo

### Fase 1: Investigación y definición del alcance
- Definir 5 a 8 indicadores clave para el MVP.
- Revisar riesgos y rangos de referencia fiables para el entorno espacial.
- Establecer qué datos se pueden tomar en una misión realista.
- Documentar qué señales ameritan alerta y qué pasos recomienda la herramienta.

### Fase 2: Diseño de UX y modelo de datos
- Diseñar una interfaz clara para astronautas con pocas distracciones.
- Definir estados visuales: normal, advertencia, crítico.
- Crear un modelo de datos para métricas, síntomas y recomendaciones.
- Validar que las pantallas sean legibles en entorno táctil y con tiempos de reacción bajos.

### Fase 3: Primer prototipo funcional
- Crear un dashboard con panel principal de salud.
- Añadir registro manual de métricas.
- Implementar lógica de evaluación simple por indicador.
- Mostrar resumen de estado general con secciones por riesgo.

### Fase 4: Visualización y seguimiento temporal
- Añadir gráficos históricos por indicador.
- Presentar tendencia durante varios días.
- Mostrar marcas de alerta y cambios de comportamiento.

### Fase 5: Recomendaciones y gamificación
- Introducir checklist y recordatorios para hábitos saludables.
- Añadir sistema de puntos, logros o streaks motivacionales.
- Hacer que la herramienta sea útil como parte de la rutina de la misión.

### Fase 6: Validación y refinamiento
- Probar con usuarios ficticios y escenarios de estrés.
- Revisar claridad de mensajes y prioridad de alertas.
- Mejorar la accesibilidad visual y la simplicidad del uso.
- Preparar la versión final para presentación.

## Reglas de diseño para la solución

- Priorizar legibilidad sobre complejidad.
- Mantener la información condensada en paneles rápidos.
- Usar indicadores de color con lógica clara y mensajes no ambiguos.
- Evitar mensajes de alarmas excesivamente técnicos para el usuario final.
- Diseñar para que el astronauta pueda entender "qué está pasando" y "qué debe hacer ahora".

## Criterios de éxito del proyecto

La solución será exitosa si:
- permite evaluar rápidamente el estado de salud del astronauta
- identifica riesgos importantes con un lenguaje claro
- ofrece recomendaciones concretas y accionables
- presenta la información con una experiencia visual clara
- tiene una base extensible para futuras mediciones y validaciones científicas

## Roadmap sugerido

### Sprint 1 - Fundamentos
- definir objetivos y métricas
- crear estructura inicial del proyecto
- construir dashboard básico
- documentar reglas de evaluación

### Sprint 2 - Funcionalidad central
- registro de indicadores
- scoring de salud
- panel corporal interactivo
- recomendaciones por riesgo

### Sprint 3 - Interacción y visualización
- charts temporales
- animaciones suaves
- diseño final de la interfaz
- pruebas de uso

### Sprint 4 - Preparación para presentación
- refinamiento visual
- documentación del proyecto
- demo narrativa
- resumen técnico y científico

## Próximos pasos

1. Elegir las métricas principales del MVP.
2. Diseñar las pantallas del dashboard.
3. Implementar la lógica de análisis básico.
4. Añadir historial y alertas.
5. Preparar una demostración clara para la presentación del reto.

## Nota

Este repositorio se usará como punto de partida para la primera versión del proyecto. La estructura está preparada para crecer con nuevas métricas, módulos de análisis y visualizaciones. 

---

Este documento puede revisarse y ampliarse según el enfoque final del equipo, pero sirve como base sólida para empezar el desarrollo.




































































































































