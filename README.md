# NEXO UNT — Preparación y continuidad conectadas

Prototipo académico GovTech desarrollado para la **Hackathon Innova Norte 3G 2026** (Desafío: Gestión de riesgos y desastres ante el Fenómeno El Niño — Universidad Nacional de Trujillo).

> **Aviso importante:** Prototipo académico. Escenario simulado. No reemplaza las alertas oficiales ni constituye un sistema institucional de emergencias.

## Propuesta de valor

**"Del aviso oficial a una acción verificable."**

NEXO UNT conecta de manera determinista y trazable:
`FUENTE → ESCENARIO → REGLA → DEPENDENCIA → ACCIÓN → CONTINUIDAD → COMUNICACIÓN → BITÁCORA`

## Motores deterministas (`src/lib/engines/`)

- **Motor de Dependencias (`dependencyEngine.ts`)**: Grafo dirigido con prevención y detección de ciclos (`detectDependencyCycles`). Una dependencia solicita verificación técnica, pero nunca asume automáticamente que el servicio dependiente haya fallado.
- **Índice de Atención Operativa (`operationalIndex.ts`)**: Fórmula matemática transparente `redondear(100 * (0.30 * lluvia + 0.30 * servicios + 0.25 * accesos + 0.15 * continuidad))`.
- **Motor de Reglas (`ruleEngine.ts`)**: Evalúa condiciones versionadas y sincroniza acciones sin duplicaciones.
- **Motor de Continuidad (`continuityEngine.ts`)**: Evalúa actividades ficticias y propone alternativas sin garantizar virtualidad cuando `Conectividad` está comprometida ni declarar ambientes físicos como seguros.
- **Comparador "¿Qué pasaría si...?" (`whatIfEngine.ts`)**: Simulación comparativa sin alterar el escenario activo hasta confirmación explícita.
- **Explicabilidad (`aiExplainer.ts`)**: Plantilla determinista local 100% funcional sin internet, más endpoint opcional servidor-a-servidor (`/api/explain`) con `@google/genai` bajo revisión humana obligatoria.

## Ejecución y pruebas

```bash
npm install
npm run dev
npm run build
npm run lint
npx --yes tsx --test src/tests/engines.test.ts
```
