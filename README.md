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
# Instalación y desarrollo local
npm install
npm run dev

# Verificación y pruebas
npm run lint
npm test
npm run build
```

## Despliegue con Docker

NEXO UNT incluye soporte nativo para despliegue en contenedores optimizados con Node.js 22 Alpine, arquitectura multi-etapa y usuario no privilegiado (`node`).

### Usando Docker Compose (Recomendado)

```bash
# 1. Configurar variables de entorno (opcional)
cp .env.example .env

# 2. Construir e iniciar el contenedor en segundo plano
docker compose up -d --build

# 3. Ver logs y estado
docker compose logs -f
docker compose ps

# 4. Detener el servicio
docker compose down
```

### Usando Docker CLI

```bash
# Construir imagen
docker build -t nexo-unt .

# Ejecutar contenedor
docker run -d \
  --name nexo-unt \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e GEMINI_API_KEY="tu-api-key" \
  nexo-unt
```

El servicio estará disponible en `http://localhost:3000` con healthcheck automático en `/api/health`.

