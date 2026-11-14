import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  Activity,
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  Compass as CompassIcon,
  Droplets,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import {
  CONTINUITY_ACTIVITIES,
  FACILITIES,
  SERVICES,
} from '../../data/seedData';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ServiceStatus } from '../../types/domain';
import {
  buildings,
  sportsComplex,
  rotonda,
  parkingLots,
  greenAreas,
  paths,
  trees,
  labels,
  campusBoundary,
  FACILITY_3D_MAPPING,
  getBuildingCode,
  FLOOD_RISK_ZONES,
  CAMPUS_NODES_3D,
  Building3DDefinition,
} from './data/campus3dData';

interface LayerState {
  buildings: boolean;
  greenAreas: boolean;
  trees: boolean;
  paths: boolean;
  labels: boolean;
  floodWater: boolean;
}

export function CampusMap3D() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const compassCanvasRef = useRef<HTMLCanvasElement>(null);

  const { activeScenario, dependencyGraph } = useDerivedNexo();
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const scenarios = useNexoStore((s) => s.scenarios);

  const [selectedBuilding, setSelectedBuilding] = useState<Building3DDefinition | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<Building3DDefinition | null>(null);
  const [hourOfDay, setHourOfDay] = useState<number>(10.5);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [scenarioDropdownOpen, setScenarioDropdownOpen] = useState<boolean>(false);
  const scenarioMenuRef = useRef<HTMLDivElement>(null);

  // Fullscreen and UI Visibility State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hideAllMenus, setHideAllMenus] = useState<boolean>(false);

  // Toggle Fullscreen handler
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (wrapperRef.current) {
          const el = wrapperRef.current as unknown as {
            requestFullscreen?: () => Promise<void>;
            webkitRequestFullscreen?: () => Promise<void>;
          };
          if (el.requestFullscreen) {
            await el.requestFullscreen();
          } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
          }
        }
      } else {
        const doc = document as unknown as {
          exitFullscreen?: () => Promise<void>;
          webkitExitFullscreen?: () => Promise<void>;
        };
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // Sync fullscreen state with document events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Close scenario menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (scenarioMenuRef.current && !scenarioMenuRef.current.contains(event.target as Node)) {
        setScenarioDropdownOpen(false);
      }
    }
    if (scenarioDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [scenarioDropdownOpen]);

  const [layers, setLayers] = useState<LayerState>({
    buildings: true,
    greenAreas: true,
    trees: true,
    paths: true,
    labels: true,
    floodWater: true,
  });

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const layerGroupsRef = useRef<Record<string, THREE.Group>>({});
  const floodPuddlesGroupRef = useRef<THREE.Group | null>(null);
  const roofMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; baseColor: THREE.Color }>>(new Map());
  const buildingBodyMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; baseColor: THREE.Color }>>(new Map());
  const labelBadgesRef = useRef<Map<string, HTMLElement>>(new Map());
  const skyUpdateFnRef = useRef<((h: number, rain: number) => void) | null>(null);
  const buildingMeshesRef = useRef<THREE.Mesh[]>([]);

  // Rain intensity from active scenario (0 to 100)
  const rainIntensity = activeScenario.inputs.rainIntensity;

  // Toggle individual layers
  const toggleLayer = (key: keyof LayerState) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const group = layerGroupsRef.current[key];
      if (group) group.visible = next[key];
      if (key === 'floodWater' && floodPuddlesGroupRef.current) {
        floodPuddlesGroupRef.current.visible = next[key];
      }
      return next;
    });
  };

  // Reset Camera View (Perspectiva Isométrica natural alineada al Campus UNT)
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.up.set(0, 1, 0);
      cameraRef.current.position.set(-80, 520, 234);
      controlsRef.current.target.set(380, 0, 234);
      controlsRef.current.update();
    }
  };

  // Top-down Zenith View (Cenital con Norte hacia arriba)
  const setTopDownView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(380, 850, 234.01);
      cameraRef.current.up.set(1, 0, 0); // Eje +X (Norte hacia arriba)
      controlsRef.current.target.set(380, 0, 234);
      controlsRef.current.update();
    }
  };

  // Calculate facility risk status & color identical to DidacticCampusPlan (Plano Didáctico 2D)
  const getBuildingRiskInfo = (buildingId: string) => {
    const facId = FACILITY_3D_MAPPING[buildingId];
    if (!facId) {
      return {
        status: 'OPERATIVO' as ServiceStatus,
        color: '#178353',
        label: 'Operativo',
        isCritical: false,
      };
    }
    const fac = FACILITIES.find((f) => f.id === facId);
    if (!fac) {
      return {
        status: 'OPERATIVO' as ServiceStatus,
        color: '#178353',
        label: 'Operativo',
        isCritical: false,
      };
    }

    const statuses = fac.serviceIds.map(
      (id) => activeScenario.serviceOverrides[id] ?? dependencyGraph.nodes[id]?.effectiveStatus ?? 'OPERATIVO',
    );

    if (statuses.includes('NO_DISPONIBLE')) {
      return {
        status: 'NO_DISPONIBLE' as ServiceStatus,
        color: '#B62C49', // Red / Critical
        label: 'No disponible (Riesgo alto)',
        isCritical: true,
      };
    }
    if (statuses.includes('LIMITADO')) {
      return {
        status: 'LIMITADO' as ServiceStatus,
        color: '#C25B2B', // Orange / Moderate-high
        label: 'Limitado',
        isCritical: false,
      };
    }
    if (
      statuses.includes('EN_OBSERVACION') ||
      statuses.includes('SIN_CONFIRMAR') ||
      fac.serviceIds.some((id) => dependencyGraph.nodes[id]?.requiresVerification)
    ) {
      return {
        status: 'EN_OBSERVACION' as ServiceStatus,
        color: '#A96A00', // Amber / Verification
        label: 'Requiere verificación',
        isCritical: false,
      };
    }
    return {
      status: 'OPERATIVO' as ServiceStatus,
      color: '#178353', // Green / Operativo
      label: 'Operativo',
      isCritical: false,
    };
  };

  // Dynamically update building roof colors & labels when scenario changes
  useEffect(() => {
    roofMeshesRef.current.forEach(({ mesh, baseColor }, buildingId) => {
      const risk = getBuildingRiskInfo(buildingId);
      const mat = mesh.material as THREE.MeshStandardMaterial;

      if (risk.status === 'NO_DISPONIBLE') {
        mat.color.set(0xb62c49);
        mat.emissive.set(0x801020);
        mat.emissiveIntensity = 0.45;
      } else if (risk.status === 'LIMITADO') {
        mat.color.set(0xc25b2b);
        mat.emissive.set(0x602008);
        mat.emissiveIntensity = 0.3;
      } else if (risk.status === 'EN_OBSERVACION') {
        mat.color.set(0xa96a00);
        mat.emissive.set(0x4a2a00);
        mat.emissiveIntensity = 0.25;
      } else {
        // Normal base color with green hint if operational
        mat.color.copy(baseColor);
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
      }
    });

    // Update building body tint and emission based on risk
    buildingBodyMeshesRef.current.forEach(({ mesh }, buildingId) => {
      const risk = getBuildingRiskInfo(buildingId);
      const mat = mesh.material as THREE.MeshStandardMaterial;

      if (risk.status === 'NO_DISPONIBLE') {
        mat.emissive.set(0x801020);
        mat.emissiveIntensity = 0.35;
      } else if (risk.status === 'LIMITADO') {
        mat.emissive.set(0x602008);
        mat.emissiveIntensity = 0.25;
      } else if (risk.status === 'EN_OBSERVACION') {
        mat.emissive.set(0x4a2a00);
        mat.emissiveIntensity = 0.18;
      } else {
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
      }
    });

    // Update label badges color
    labelBadgesRef.current.forEach((badgeEl, buildingId) => {
      const risk = getBuildingRiskInfo(buildingId);
      badgeEl.style.backgroundColor = risk.color;
      if (risk.isCritical) {
        badgeEl.style.boxShadow = '0 0 10px rgba(182, 44, 73, 0.8)';
      } else {
        badgeEl.style.boxShadow = 'none';
      }
    });

    // Update localized flood pools visibility and size
    if (floodPuddlesGroupRef.current) {
      floodPuddlesGroupRef.current.visible = layers.floodWater;
      floodPuddlesGroupRef.current.children.forEach((child) => {
        const zoneData = child.userData as { minRain: number };
        if (zoneData) {
          const isFlooded = rainIntensity >= zoneData.minRain && layers.floodWater;
          child.visible = isFlooded;
          if (isFlooded) {
            // Expansion scale based on rain
            const factor = 0.8 + ((rainIntensity - zoneData.minRain) / 50) * 0.4;
            child.scale.set(Math.min(1.4, factor), 1, Math.min(1.4, factor));
          }
        }
      });
    }

    if (skyUpdateFnRef.current) {
      skyUpdateFnRef.current(hourOfDay, rainIntensity);
    }
  }, [activeScenario, dependencyGraph, rainIntensity, layers.floodWater, hourOfDay]);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderers
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 700;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3500);
    camera.position.set(-80, 520, 234);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.style.overflow = 'hidden';
    container.appendChild(labelRenderer.domElement);

    // 2. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 30;
    controls.maxDistance = 1450;
    controls.target.set(380, 0, 234);
    controls.update();
    controlsRef.current = controls;

    // 3. Layer Groups
    const layerGroups: Record<string, THREE.Group> = {
      buildings: new THREE.Group(),
      sports: new THREE.Group(),
      greenAreas: new THREE.Group(),
      paths: new THREE.Group(),
      trees: new THREE.Group(),
      labels: new THREE.Group(),
      floodZones: new THREE.Group(),
      nodes: new THREE.Group(),
    };
    Object.values(layerGroups).forEach((grp) => scene.add(grp));
    layerGroupsRef.current = layerGroups;
    floodPuddlesGroupRef.current = layerGroups.floodZones;

    // 4. Lighting & Environment
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.4);
    sunLight.position.set(200, 480, 380);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 1600;
    sunLight.shadow.camera.left = -500;
    sunLight.shadow.camera.right = 500;
    sunLight.shadow.camera.top = 500;
    sunLight.shadow.camera.bottom = -500;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xd7ccc8, 0.38);
    scene.add(hemiLight);

    function updateSkyAndLighting(hour: number, rain: number) {
      let skyColor: THREE.Color;
      let fogColor: THREE.Color;
      let ambInt: number;
      let sunInt: number;
      let sunHeight: number;

      if (rain >= 60) {
        skyColor = new THREE.Color(0x334155);
        fogColor = new THREE.Color(0x1e293b);
        ambInt = 0.45;
        sunInt = 0.55;
        sunHeight = 0.4;
      } else if (hour < 5.5 || hour > 20.5) {
        skyColor = new THREE.Color(0x0f172a);
        fogColor = new THREE.Color(0x0f172a);
        ambInt = 0.2;
        sunInt = 0.05;
        sunHeight = 0.1;
      } else if (hour < 7.5) {
        const f = (hour - 5.5) / 2;
        skyColor = new THREE.Color(0x1e293b).lerp(new THREE.Color(0xfb923c), f);
        fogColor = skyColor.clone();
        ambInt = 0.25 + f * 0.4;
        sunInt = f * 0.9;
        sunHeight = f * 0.5;
      } else if (hour < 17.5) {
        skyColor = new THREE.Color(0x7dd3fc);
        fogColor = new THREE.Color(0xbae6fd);
        ambInt = 0.7;
        sunInt = 1.4;
        sunHeight = Math.sin(((hour - 6) / 12) * Math.PI);
      } else {
        const f = (hour - 17.5) / 3;
        skyColor = new THREE.Color(0xfb923c).lerp(new THREE.Color(0x0f172a), f);
        fogColor = skyColor.clone();
        ambInt = 0.65 - f * 0.4;
        sunInt = (1 - f) * 0.9;
        sunHeight = (1 - f) * 0.4;
      }

      scene.background = skyColor;
      scene.fog = new THREE.FogExp2(fogColor, rain >= 60 ? 0.0012 : 0.00065);
      ambientLight.intensity = ambInt;
      sunLight.intensity = sunInt;

      const sunX = 380 + Math.cos((hour / 24) * Math.PI * 2) * 550;
      const sunY = Math.max(30, sunHeight * 480);
      const sunZ = 234 + Math.sin((hour / 24) * Math.PI * 2) * 380;
      sunLight.position.set(sunX, sunY, sunZ);
    }
    skyUpdateFnRef.current = updateSkyAndLighting;
    updateSkyAndLighting(hourOfDay, rainIntensity);

    // 5. Suelo Base del Campus (Terreno Seco)
    const groundGeo = new THREE.PlaneGeometry(950, 750);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xdfd7c2, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(380, -0.15, 234);
    ground.receiveShadow = true;
    scene.add(ground);

    const cityGeo = new THREE.PlaneGeometry(1800, 1600);
    const cityMat = new THREE.MeshStandardMaterial({ color: 0xbdb59f, roughness: 0.95 });
    const city = new THREE.Mesh(cityGeo, cityMat);
    city.rotation.x = -Math.PI / 2;
    city.position.set(380, -0.3, 234);
    city.receiveShadow = true;
    scene.add(city);

    // Muro perimetral
    for (let i = 0; i < campusBoundary.length - 1; i++) {
      const p1 = campusBoundary[i];
      const p2 = campusBoundary[i + 1];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const wallGeo = new THREE.BoxGeometry(len, 3.2, 0.8);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set((p1[0] + p2[0]) / 2, 1.6, (p1[1] + p2[1]) / 2);
      wall.rotation.y = -angle;
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
    }

    // 6. CANALES Y ZONAS DELIMITADAS DE ANÉGAMIENTO (NO TAPAN TODO EL MAPA)
    const puddleWaterMat = new THREE.MeshStandardMaterial({
      color: 0x1565c0,
      roughness: 0.08,
      metalness: 0.4,
      transparent: true,
      opacity: 0.8,
    });

    FLOOD_RISK_ZONES.forEach((zone) => {
      let mesh: THREE.Mesh;
      if (zone.type === 'canal') {
        const canalGeo = new THREE.PlaneGeometry(zone.width, zone.depth);
        canalGeo.rotateX(-Math.PI / 2);
        mesh = new THREE.Mesh(canalGeo, puddleWaterMat);
      } else {
        // Charco ovalado de empozamiento
        const puddleGeo = new THREE.CircleGeometry(zone.width / 2, 24);
        puddleGeo.rotateX(-Math.PI / 2);
        puddleGeo.scale(1, 1, zone.depth / zone.width);
        mesh = new THREE.Mesh(puddleGeo, puddleWaterMat);
      }

      mesh.position.set(zone.center[0], 0.14, zone.center[1]);
      if (zone.angleDeg) {
        mesh.rotation.y = -(zone.angleDeg * Math.PI) / 180;
      }
      mesh.receiveShadow = true;
      mesh.userData = { minRain: zone.minRain, zoneId: zone.id, name: zone.name };
      mesh.visible = rainIntensity >= zone.minRain;

      layerGroups.floodZones.add(mesh);

      // Warning marker over severe flood puddle
      const alertDiv = document.createElement('div');
      alertDiv.className = 'flood-alert-badge';
      alertDiv.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(182, 44, 73, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          padding: 2px 6px;
          color: white;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        ">
          <span>⚠️</span>
          <span>${zone.code}: ANEGADO</span>
        </div>
      `;
      const alertObj = new CSS2DObject(alertDiv);
      alertObj.position.set(zone.center[0], 2.2, zone.center[1]);
      layerGroups.floodZones.add(alertObj);
    });

    // 7. PUNTOS DE ACCESO Y ENCUENTRO 3D (NODOS CLAVE DEL PLANO)
    CAMPUS_NODES_3D.forEach((node) => {
      const isAccess = node.type === 'access';
      const nodeGeo = new THREE.CylinderGeometry(isAccess ? 1.4 : 2.2, isAccess ? 1.8 : 2.6, 2.5, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: isAccess ? 0xd97706 : 0x126a64,
        roughness: 0.4,
        metalness: 0.3,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(node.x, 1.25, node.z);
      nodeMesh.castShadow = true;
      nodeMesh.receiveShadow = true;
      layerGroups.nodes.add(nodeMesh);

      // HTML Badge for Node
      const nodeLabel = document.createElement('div');
      nodeLabel.style.cssText = `
        background: ${isAccess ? 'rgba(217, 119, 6, 0.95)' : 'rgba(18, 106, 100, 0.95)'};
        color: white;
        border: 1px solid rgba(255,255,255,0.4);
        border-radius: 6px;
        padding: 2px 6px;
        font-family: inherit;
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      `;
      nodeLabel.innerHTML = `<span>${node.code}</span>`;
      const nodeLabelObj = new CSS2DObject(nodeLabel);
      nodeLabelObj.position.set(node.x, node.y + 2.5, node.z);
      layerGroups.nodes.add(nodeLabelObj);
    });

    // 8. EDIFICIOS 3D CON IDENTIFICADORES Y COLORES DE ESTADO OPERATIVO
    const buildingMeshes: THREE.Mesh[] = [];

    buildings.forEach((b) => {
      const code = getBuildingCode(b);
      let mesh: THREE.Mesh;
      let roofMesh: THREE.Mesh | null = null;
      const baseColor = new THREE.Color(b.roofColor || b.color);

      if (b.isOctagon && b.center && b.outerRadius && b.innerRadius) {
        // Octogonal: Facultad de Biología
        const cx = b.center[0], cz = b.center[1];
        const octShape = new THREE.Shape();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const x = Math.cos(a) * b.outerRadius + cx;
          const z = -(Math.sin(a) * b.outerRadius + cz);
          if (i === 0) octShape.moveTo(x, z);
          else octShape.lineTo(x, z);
        }
        octShape.closePath();

        const hole = new THREE.Path();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const x = Math.cos(a) * b.innerRadius + cx;
          const z = -(Math.sin(a) * b.innerRadius + cz);
          if (i === 0) hole.moveTo(x, z);
          else hole.lineTo(x, z);
        }
        hole.closePath();
        octShape.holes.push(hole);

        const geo = new THREE.ExtrudeGeometry(octShape, {
          depth: b.height,
          bevelEnabled: true,
          bevelThickness: 0.35,
          bevelSize: 0.35,
          bevelSegments: 2,
        });
        geo.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(b.color),
          roughness: 0.6,
          metalness: 0.1,
        });
        mesh = new THREE.Mesh(geo, mat);
        roofMesh = mesh; // Octagon itself serves as roof target
      } else if (b.polygon && b.polygon.length > 0) {
        const shape = new THREE.Shape();
        b.polygon.forEach((p, i) => {
          if (i === 0) shape.moveTo(p[0], -p[1]);
          else shape.lineTo(p[0], -p[1]);
        });
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: b.height,
          bevelEnabled: true,
          bevelThickness: 0.35,
          bevelSize: 0.35,
          bevelSegments: 2,
        });
        geo.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(b.color),
          roughness: 0.6,
          metalness: 0.1,
        });
        mesh = new THREE.Mesh(geo, mat);

        if (b.hasPyramidRoof && b.polygon.length >= 4) {
          // Techo piramidal Auditorio Central
          const poly = b.polygon;
          const cx = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
          const cz = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
          const baseH = b.height;
          const apexH = baseH + 7.5;

          const vertices = [
            poly[0][0], baseH, poly[0][1], poly[1][0], baseH, poly[1][1], cx, apexH, cz,
            poly[1][0], baseH, poly[1][1], poly[2][0], baseH, poly[2][1], cx, apexH, cz,
            poly[2][0], baseH, poly[2][1], poly[3][0], baseH, poly[3][1], cx, apexH, cz,
            poly[3][0], baseH, poly[3][1], poly[0][0], baseH, poly[0][1], cx, apexH, cz,
          ];

          const pyrGeo = new THREE.BufferGeometry();
          pyrGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          pyrGeo.computeVertexNormals();

          const pyrMat = new THREE.MeshStandardMaterial({
            color: 0xd4ac0d,
            roughness: 0.35,
            metalness: 0.45,
            side: THREE.DoubleSide,
          });
          roofMesh = new THREE.Mesh(pyrGeo, pyrMat);
          roofMesh.castShadow = true;
          roofMesh.receiveShadow = true;
          layerGroups.buildings.add(roofMesh);
        } else {
          // Losa plana de techo para tintar con el color de riesgo
          const roofShape = new THREE.Shape();
          b.polygon.forEach((p, i) => {
            if (i === 0) roofShape.moveTo(p[0], -p[1]);
            else roofShape.lineTo(p[0], -p[1]);
          });
          roofShape.closePath();

          const roofGeo = new THREE.ShapeGeometry(roofShape);
          roofGeo.rotateX(-Math.PI / 2);
          const roofMat = new THREE.MeshStandardMaterial({
            color: baseColor.clone(),
            roughness: 0.75,
          });
          roofMesh = new THREE.Mesh(roofGeo, roofMat);
          roofMesh.position.set(0, b.height + 0.38, 0);
          roofMesh.receiveShadow = true;
          layerGroups.buildings.add(roofMesh);
        }
      } else {
        return;
      }

      mesh.position.set(0, 0, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { ...b, code, layerType: 'building' };

      layerGroups.buildings.add(mesh);
      buildingMeshes.push(mesh);
      buildingBodyMeshesRef.current.set(b.id, { mesh, baseColor: new THREE.Color(b.color) });

      if (roofMesh) {
        roofMeshesRef.current.set(b.id, { mesh: roofMesh, baseColor });
      }

      // 9. Floating CSS2D Labels with Prominent ID Badge
      const isImportant =
        FACILITY_3D_MAPPING[b.id] ||
        b.id === 'auditorio-central' ||
        b.id === 'ciencias-biologicas' ||
        b.id === 'comedor-universitario' ||
        b.id === 'estadio-unt';

      const labelData = labels.find((l) => l.id === b.id);
      if (labelData) {
        const el = document.createElement('div');
        el.className = 'campus-label-3d';
        el.style.cssText = `
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 28, 39, 0.92);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          padding: 3px 7px;
          color: #ffffff;
          font-family: inherit;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
          pointer-events: auto;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.2s;
        `;

        const badgeSpan = document.createElement('span');
        badgeSpan.style.cssText = `
          font-size: 10px;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: 4px;
          background: #178353;
          color: white;
          letter-spacing: 0.5px;
          border: 1px solid rgba(255,255,255,0.3);
        `;
        badgeSpan.textContent = code;
        labelBadgesRef.current.set(b.id, badgeSpan);

        el.appendChild(badgeSpan);
        const textDiv = document.createElement('div');
        textDiv.innerHTML = `
          <div style="font-size: 10px; font-weight: 600; line-height: 1.1;">${b.name}</div>
          <div style="font-size: 8px; opacity: 0.7; color: #75d5c4; text-transform: uppercase;">${b.category || b.type}</div>
        `;
        el.appendChild(textDiv);

        el.addEventListener('click', () => {
          setSelectedBuilding(b);
        });

        const labelObj = new CSS2DObject(el);
        labelObj.position.set(labelData.x, labelData.y, labelData.z);
        layerGroups.labels.add(labelObj);
      }
    });

    buildingMeshesRef.current = buildingMeshes;

    // 10. Complejo Deportivo, Rotonda, Vías y Áreas Verdes
    const { stadium, pitch, grandstandNW, grandstandSE, courts, pool } = sportsComplex;
    const angleRad = (stadium.angleDeg * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const cxS = stadium.center[0], czS = stadium.center[1];

    const outerCurve = new THREE.EllipseCurve(0, 0, stadium.radiusX, stadium.radiusZ, 0, Math.PI * 2, false, 0);
    const outerPts = outerCurve.getPoints(64);
    const trackShape = new THREE.Shape();
    outerPts.forEach((p, i) => {
      const rx = p.x * cosA - p.y * sinA + cxS;
      const rz = -(p.x * sinA + p.y * cosA + czS);
      if (i === 0) trackShape.moveTo(rx, rz);
      else trackShape.lineTo(rx, rz);
    });
    trackShape.closePath();

    const innerCurve = new THREE.EllipseCurve(0, 0, stadium.radiusX - 10, stadium.radiusZ - 8, 0, Math.PI * 2, false, 0);
    const innerPts = innerCurve.getPoints(64);
    const trackHole = new THREE.Path();
    innerPts.forEach((p, i) => {
      const rx = p.x * cosA - p.y * sinA + cxS;
      const rz = -(p.x * sinA + p.y * cosA + czS);
      if (i === 0) trackHole.moveTo(rx, rz);
      else trackHole.lineTo(rx, rz);
    });
    trackHole.closePath();
    trackShape.holes.push(trackHole);

    const trackGeo = new THREE.ShapeGeometry(trackShape);
    trackGeo.rotateX(-Math.PI / 2);
    const trackMesh = new THREE.Mesh(trackGeo, new THREE.MeshStandardMaterial({ color: 0xd84315, roughness: 0.7 }));
    trackMesh.position.set(0, 0.08, 0);
    trackMesh.receiveShadow = true;
    layerGroups.sports.add(trackMesh);

    const pitchGeo = new THREE.PlaneGeometry(pitch.width, pitch.depth);
    pitchGeo.rotateX(-Math.PI / 2);
    const pitchMesh = new THREE.Mesh(pitchGeo, new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 }));
    pitchMesh.position.set(cxS, 0.1, czS);
    pitchMesh.rotation.y = -angleRad;
    pitchMesh.receiveShadow = true;
    layerGroups.sports.add(pitchMesh);

    // Tribunas
    [grandstandNW, grandstandSE].forEach((g) => {
      const shape = new THREE.Shape();
      g.polygon.forEach((p, i) => {
        if (i === 0) shape.moveTo(p[0], -p[1]);
        else shape.lineTo(p[0], -p[1]);
      });
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: g.height,
        bevelEnabled: true,
        bevelThickness: 0.3,
        bevelSize: 0.3,
      });
      geo.rotateX(-Math.PI / 2);
      const standMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: g.color, roughness: 0.7 }));
      standMesh.castShadow = true;
      standMesh.receiveShadow = true;
      standMesh.userData = { id: g.id, code: g.id.toUpperCase(), name: g.name, category: 'Deportes', type: 'sports', height: g.height };
      layerGroups.sports.add(standMesh);
      buildingMeshes.push(standMesh);
    });

    // Courts
    courts.forEach((court) => {
      const shape = new THREE.Shape();
      court.polygon.forEach((p, i) => {
        if (i === 0) shape.moveTo(p[0], -p[1]);
        else shape.lineTo(p[0], -p[1]);
      });
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const courtMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: court.color, roughness: 0.5 }));
      courtMesh.position.set(0, 0.1, 0);
      courtMesh.receiveShadow = true;
      layerGroups.sports.add(courtMesh);
    });

    // Piscina
    const poolShape = new THREE.Shape();
    pool.polygon.forEach((p, i) => {
      if (i === 0) poolShape.moveTo(p[0], -p[1]);
      else poolShape.lineTo(p[0], -p[1]);
    });
    poolShape.closePath();
    const poolGeo = new THREE.ShapeGeometry(poolShape);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMesh = new THREE.Mesh(
      poolGeo,
      new THREE.MeshStandardMaterial({ color: pool.color, roughness: 0.1, metalness: 0.7 }),
    );
    poolMesh.position.set(0, 0.12, 0);
    layerGroups.sports.add(poolMesh);

    // Rotonda
    const { center: rCenter, outerRadius, innerRadius, hubRadius, spokes } = rotonda;
    const rCircleGeo = new THREE.CircleGeometry(outerRadius, 48);
    rCircleGeo.rotateX(-Math.PI / 2);
    const rPlazaMesh = new THREE.Mesh(rCircleGeo, new THREE.MeshStandardMaterial({ color: 0xded8c6, roughness: 0.7 }));
    rPlazaMesh.position.set(rCenter[0], 0.1, rCenter[1]);
    rPlazaMesh.receiveShadow = true;
    layerGroups.paths.add(rPlazaMesh);

    const rRingGeo = new THREE.RingGeometry(innerRadius - 0.8, innerRadius + 0.8, 36);
    rRingGeo.rotateX(-Math.PI / 2);
    const rRing = new THREE.Mesh(rRingGeo, new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.6 }));
    rRing.position.set(rCenter[0], 0.12, rCenter[1]);
    layerGroups.paths.add(rRing);

    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2;
      const len = outerRadius * 0.95;
      const rayGeo = new THREE.PlaneGeometry(1.6, len);
      rayGeo.rotateX(-Math.PI / 2);
      const ray = new THREE.Mesh(rayGeo, new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
      ray.position.set(rCenter[0] + Math.cos(angle) * (len / 2), 0.14, rCenter[1] + Math.sin(angle) * (len / 2));
      ray.rotation.y = -angle + Math.PI / 2;
      layerGroups.paths.add(ray);
    }

    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(hubRadius, hubRadius + 0.6, 1.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.3 }),
    );
    fountain.position.set(rCenter[0], 0.7, rCenter[1]);
    fountain.castShadow = true;
    layerGroups.paths.add(fountain);

    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 7.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 }),
    );
    spire.position.set(rCenter[0], 4.8, rCenter[1]);
    spire.castShadow = true;
    layerGroups.paths.add(spire);

    // Parking Lots
    parkingLots.forEach((lot) => {
      const shape = new THREE.Shape();
      lot.polygon.forEach((p, i) => {
        if (i === 0) shape.moveTo(p[0], -p[1]);
        else shape.lineTo(p[0], -p[1]);
      });
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x424242, roughness: 0.9 }));
      mesh.position.set(0, 0.08, 0);
      mesh.receiveShadow = true;
      layerGroups.paths.add(mesh);
    });

    // Green Areas
    const colorMap: Record<string, number> = { park: 0x43a047, garden: 0x4caf50, lawn: 0x66bb6a };
    greenAreas.forEach((area) => {
      const shape = new THREE.Shape();
      area.polygon.forEach((p, i) => {
        if (i === 0) shape.moveTo(p[0], -p[1]);
        else shape.lineTo(p[0], -p[1]);
      });
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: colorMap[area.type] || 0x4caf50, roughness: 0.9 }),
      );
      mesh.position.set(0, 0.04, 0);
      mesh.receiveShadow = true;
      layerGroups.greenAreas.add(mesh);
    });

    // Paths
    paths.forEach((p) => {
      for (let i = 0; i < p.points.length - 1; i++) {
        const p1 = p.points[i];
        const p2 = p.points[i + 1];
        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        const pathGeo = new THREE.PlaneGeometry(len, p.width);
        pathGeo.rotateX(-Math.PI / 2);
        const pathMesh = new THREE.Mesh(pathGeo, new THREE.MeshStandardMaterial({ color: 0xedebe4, roughness: 0.85 }));
        pathMesh.position.set((p1[0] + p2[0]) / 2, 0.06, (p1[1] + p2[1]) / 2);
        pathMesh.rotation.y = -angle;
        pathMesh.receiveShadow = true;
        layerGroups.paths.add(pathMesh);
      }
    });

    // Trees
    const treeConfig: Record<string, { trunkH: number; trunkR: number; crownR: number; crownH: number }> = {
      small: { trunkH: 1.8, trunkR: 0.22, crownR: 2.2, crownH: 3.2 },
      medium: { trunkH: 2.6, trunkR: 0.32, crownR: 3.4, crownH: 4.5 },
      large: { trunkH: 3.6, trunkR: 0.42, crownR: 4.8, crownH: 5.8 },
      palm: { trunkH: 6.2, trunkR: 0.25, crownR: 3.6, crownH: 2.2 },
    };

    trees.forEach((t) => {
      const cfg = treeConfig[t.type] || treeConfig.medium;
      const trunkGeo = new THREE.CylinderGeometry(cfg.trunkR * 0.7, cfg.trunkR, cfg.trunkH, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(t.x, cfg.trunkH / 2, t.z);
      trunk.castShadow = true;
      layerGroups.trees.add(trunk);

      let crownGeo: THREE.BufferGeometry;
      if (t.type === 'palm') {
        crownGeo = new THREE.SphereGeometry(cfg.crownR, 8, 4);
        crownGeo.scale(1, 0.35, 1);
      } else {
        crownGeo = new THREE.ConeGeometry(cfg.crownR, cfg.crownH, 7);
      }
      const crownMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(t.x, cfg.trunkH + cfg.crownH * 0.45, t.z);
      crown.castShadow = true;
      layerGroups.trees.add(crown);
    });

    // 11. Raycaster & Interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let currentHovered: THREE.Mesh | null = null;
    let originalColor: THREE.Color | null = null;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(buildingMeshes, false);

      if (intersects.length > 0) {
        const obj = intersects[0].object as THREE.Mesh;
        const data = obj.userData as Building3DDefinition;
        if (data && data.name) {
          setHoveredBuilding(data);
          if (currentHovered !== obj) {
            if (currentHovered && originalColor) {
              (currentHovered.material as THREE.MeshStandardMaterial).color.copy(originalColor);
              (currentHovered.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            }
            currentHovered = obj;
            originalColor = (obj.material as THREE.MeshStandardMaterial).color.clone();
            (obj.material as THREE.MeshStandardMaterial).emissive.setHex(0x126a64);
            container.style.cursor = 'pointer';
          }
        }
      } else {
        setHoveredBuilding(null);
        if (currentHovered && originalColor) {
          (currentHovered.material as THREE.MeshStandardMaterial).color.copy(originalColor);
          (currentHovered.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          currentHovered = null;
          originalColor = null;
          container.style.cursor = 'default';
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(buildingMeshes, false);
      if (intersects.length > 0) {
        const obj = intersects[0].object as THREE.Mesh;
        const data = obj.userData as Building3DDefinition;
        if (data) {
          setSelectedBuilding(data);
        }
      }
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('click', onClick);

    // 12. Compass rendering
    const drawCompass = () => {
      const canvas = compassCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 120;
      canvas.height = 120;

      const cx = 60, cy = 60, r = 24;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const angle = Math.atan2(dir.z, dir.x);

      ctx.clearRect(0, 0, 120, 120);

      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 28, 39, 0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(117, 213, 196, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle);

      ctx.beginPath();
      ctx.moveTo(0, -r + 2);
      ctx.lineTo(-5, 4);
      ctx.lineTo(5, 4);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, r - 2);
      ctx.lineTo(-4, -3);
      ctx.lineTo(4, -3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', 0, -r - 7);

      ctx.restore();
    };

    // 13. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Subtle water ripple animation on localized pools
      if (floodPuddlesGroupRef.current && floodPuddlesGroupRef.current.visible) {
        const time = clock.getElapsedTime();
        floodPuddlesGroupRef.current.children.forEach((mesh, idx) => {
          if (mesh instanceof THREE.Mesh) {
            mesh.position.y = 0.14 + Math.sin(time * 2.5 + idx) * 0.003;
          }
        });
      }

      drawCompass();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    animate();

    // 14. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || 700;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
      labelRenderer.setSize(newW, newH);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('click', onClick);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (container.contains(labelRenderer.domElement)) {
        container.removeChild(labelRenderer.domElement);
      }

      renderer.dispose();
    };
  }, []);

  const mappedFacilityId = selectedBuilding ? FACILITY_3D_MAPPING[selectedBuilding.id] : null;
  const linkedFacility = mappedFacilityId
    ? FACILITIES.find((f) => f.id === mappedFacilityId)
    : null;

  const linkedActivities = useMemo(() => {
    if (!linkedFacility) return [];
    return CONTINUITY_ACTIVITIES.filter((a) => a.facilityId === linkedFacility.id);
  }, [linkedFacility]);

  const selectedBuildingRisk = selectedBuilding
    ? getBuildingRiskInfo(selectedBuilding.id)
    : null;

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full overflow-hidden bg-sidebar shadow-2xl transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none'
          : 'h-[740px] rounded-2xl border border-subtle'
      }`}
    >
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Action Controls - Semi-transparent (Top Right) */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        {/* Toggle UI Menus Button */}
        <button
          type="button"
          onClick={() => setHideAllMenus(!hideAllMenus)}
          className={`px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer ${
            hideAllMenus
              ? 'bg-[#126A64]/85 hover:bg-[#126A64] border-[#4AD196] text-white ring-2 ring-[#4AD196]/50 animate-pulse'
              : 'bg-black/45 hover:bg-black/70 border-white/25 hover:border-white/50 text-white/95 hover:text-white'
          }`}
          title={hideAllMenus ? 'Mostrar menús de control' : 'Ocultar menús (Vista limpia 3D)'}
          aria-label={hideAllMenus ? 'Mostrar menús de control' : 'Ocultar menús (Vista limpia 3D)'}
        >
          {hideAllMenus ? (
            <>
              <Eye className="w-3.5 h-3.5 text-white" />
              <span>Mostrar menús</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-white/80" />
              <span>Ocultar menús</span>
            </>
          )}
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="px-3 py-1.5 rounded-xl bg-black/45 hover:bg-black/70 backdrop-blur-md border border-white/25 hover:border-white/50 text-white/95 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer"
          title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ver en pantalla completa'}
          aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-amber-300">Salir</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-white/90" />
              <span>Pantalla completa</span>
            </>
          )}
        </button>
      </div>

      {/* Top Floating Control Bar - LEFT SIDE (Hidden when hideAllMenus is true) */}
      {!hideAllMenus && (
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5 w-[350px] max-w-[calc(100vw-32px)] animate-in fade-in duration-150">
          {/* Title & Scenario Selector Card */}
        <div ref={scenarioMenuRef} className="relative rounded-xl bg-[#0A121A] border-2 border-[#1E344A] text-white shadow-[0_12px_36px_rgba(0,0,0,0.7)] p-2.5 space-y-2">
          {/* Header row: Badge + Toggle Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#126A64]/30 border border-[#126A64] text-[#4AD196] font-extrabold text-[11px] tracking-wider">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>3D UNT • DIGITAL TWIN</span>
            </div>
            <button
              type="button"
              onClick={() => setShowControls(!showControls)}
              className="px-2 py-1 rounded-md bg-[#142332] hover:bg-[#1E354C] border border-[#2B435C] text-xs font-semibold text-white/90 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Mostrar u ocultar panel de capas"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent-primary" />
              <span>{showControls ? 'Ocultar' : 'Capas'}</span>
            </button>
          </div>

          {/* Custom Scenario Dropdown Trigger (Replaces buggy native select) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setScenarioDropdownOpen(!scenarioDropdownOpen)}
              className="w-full px-3 py-2 rounded-lg bg-[#111F2D] hover:bg-[#172A3D] border border-[#2B435C] hover:border-[#126A64] text-white flex items-center justify-between gap-2 transition-all cursor-pointer shadow-inner text-left focus:outline-none focus:ring-2 focus:ring-[#126A64]"
              aria-expanded={scenarioDropdownOpen}
              aria-label="Seleccionar escenario de simulación"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Escenario Activo</div>
                  <div className="text-xs font-bold text-white truncate max-w-[190px]">{activeScenario.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/50 text-blue-300 font-mono text-[10px] font-bold">
                  {activeScenario.inputs.rainIntensity}% lluvia
                </span>
                <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${scenarioDropdownOpen ? 'rotate-180 text-white' : ''}`} />
              </div>
            </button>

            {/* Custom Dropdown Popover */}
            {scenarioDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-[#090F15] border-2 border-[#1E3A52] text-white shadow-[0_16px_40px_rgba(0,0,0,0.85)] p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[320px] overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-primary border-b border-white/10 flex items-center justify-between">
                  <span>Seleccionar Escenario de Riesgo</span>
                  <span className="text-[9px] text-white/40">{scenarios.length} disponibles</span>
                </div>
                {scenarios.map((s) => {
                  const isSelected = s.id === activeScenario.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        selectScenario(s.id);
                        setScenarioDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#126A64] text-white font-bold shadow-md'
                          : 'bg-[#101C27] hover:bg-[#1A2E42] text-[#E2E8F0] border border-[#1E344A] hover:border-[#3B5B7D]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold leading-tight">{s.title}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                        </div>
                        <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-white/60'}`}>
                          {s.description}
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          isSelected
                            ? 'bg-black/30 text-white border border-white/20'
                            : 'bg-blue-950/70 border border-blue-500/40 text-blue-300'
                        }`}
                      >
                        {s.inputs.rainIntensity}% lluvia
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Layer Controls Card */}
        {showControls && (
          <div className="p-3 rounded-xl bg-[#0A121A] border-2 border-[#1E344A] text-white shadow-2xl text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between font-extrabold text-[11px] uppercase tracking-wider text-accent-primary border-b border-[#1E344A] pb-1.5">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Capas del Gemelo Digital
              </span>
              <span className="text-[10px] text-white/60 font-semibold">CAD UNT</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleLayer('buildings')}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                  layers.buildings
                    ? 'bg-[#126A64] border-[#2CD9B5] text-white shadow-md'
                    : 'bg-[#101D2B] border-[#243A50] text-[#94A3B8] hover:bg-[#182C40] hover:text-white'
                }`}
              >
                <span>Edificios</span>
                {layers.buildings ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-60" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('floodWater')}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                  layers.floodWater
                    ? 'bg-[#1D4ED8] border-[#60A5FA] text-white shadow-md'
                    : 'bg-[#101D2B] border-[#243A50] text-[#94A3B8] hover:bg-[#182C40] hover:text-white'
                }`}
              >
                <span>Canales & Pozas</span>
                <Droplets className="w-3.5 h-3.5 text-blue-200" />
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('greenAreas')}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                  layers.greenAreas
                    ? 'bg-[#15803D] border-[#4ADE80] text-white shadow-md'
                    : 'bg-[#101D2B] border-[#243A50] text-[#94A3B8] hover:bg-[#182C40] hover:text-white'
                }`}
              >
                <span>Áreas verdes</span>
                {layers.greenAreas ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-60" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('paths')}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                  layers.paths
                    ? 'bg-[#C25B2B] border-[#F97316] text-white shadow-md'
                    : 'bg-[#101D2B] border-[#243A50] text-[#94A3B8] hover:bg-[#182C40] hover:text-white'
                }`}
              >
                <span>Vías internas</span>
                {layers.paths ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-60" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLayer('labels')}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-between col-span-2 cursor-pointer ${
                  layers.labels
                    ? 'bg-[#6D28D9] border-[#C084FC] text-white shadow-md'
                    : 'bg-[#101D2B] border-[#243A50] text-[#94A3B8] hover:bg-[#182C40] hover:text-white'
                }`}
              >
                <span>IDs y Rótulos de Edificios</span>
                {layers.labels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-60" />}
              </button>
            </div>

            {/* Time Slider */}
            <div className="pt-2.5 border-t border-[#1E344A] space-y-1.5">
              <div className="flex items-center justify-between text-xs text-white">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Iluminación solar
                </span>
                <span className="font-mono font-bold text-amber-300 text-xs px-2 py-0.5 rounded bg-[#17283B] border border-[#2A4460]">
                  {Math.floor(hourOfDay)}:{Math.round((hourOfDay % 1) * 60).toString().padStart(2, '0')} hrs
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="21"
                step="0.5"
                value={hourOfDay}
                onChange={(e) => setHourOfDay(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#1E344A] rounded-lg appearance-none cursor-pointer accent-[#126A64]"
              />
            </div>

            {/* View Reset Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={resetCamera}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#142332] hover:bg-[#1E354C] border border-[#2B435C] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-accent-primary" /> Isométrica
              </button>
              <button
                type="button"
                onClick={setTopDownView}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#142332] hover:bg-[#1E354C] border border-[#2B435C] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5 text-accent-primary" /> Cenital
              </button>
            </div>
          </div>
        )}

        {/* Legend Panel Matching Plano Didáctico 2D */}
        <div className="p-3 rounded-xl bg-[#0A121A] border-2 border-[#1E344A] text-white shadow-2xl text-xs space-y-2">
          <div className="font-extrabold text-white uppercase tracking-wider text-[10px] border-b border-[#1E344A] pb-1 flex items-center justify-between">
            <span>Convenciones de Riesgo</span>
            <span className="text-[9px] text-[#4AD196] font-mono">PLANO UNT</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 font-medium">
              <div className="w-3 h-3 rounded-full bg-[#B62C49] border-2 border-white/60 shrink-0 shadow-sm" />
              <span className="text-white">No disponible (Crítico)</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <div className="w-3 h-3 rounded-full bg-[#C25B2B] border-2 border-white/60 shrink-0 shadow-sm" />
              <span className="text-white">Limitado</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <div className="w-3 h-3 rounded-full bg-[#A96A00] border-2 border-white/60 shrink-0 shadow-sm" />
              <span className="text-white">Verificación requerida</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <div className="w-3 h-3 rounded-full bg-[#178353] border-2 border-white/60 shrink-0 shadow-sm" />
              <span className="text-white">Operativo</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1.5 border-t border-[#1E344A] text-blue-300 font-semibold text-[11px]">
            <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Canales y pozas activas ({rainIntensity}% lluvia)</span>
          </div>
        </div>
      </div>
      )}

      {/* Hover Tooltip Preview */}
      {!hideAllMenus && hoveredBuilding && !selectedBuilding && (
        <div className="absolute bottom-6 left-6 z-10 px-3.5 py-2.5 rounded-xl bg-[#0A121A] border-2 border-accent-primary text-white shadow-2xl pointer-events-none flex items-center gap-2.5">
          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-accent-primary/40 border border-accent-primary">
            {getBuildingCode(hoveredBuilding)}
          </span>
          <div>
            <div className="text-xs font-bold text-white">{hoveredBuilding.name}</div>
            <div className="text-[10px] text-white/70">
              {hoveredBuilding.category || hoveredBuilding.type} • {hoveredBuilding.height}m altura
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Compass Widget */}
      {!hideAllMenus && (
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
          <canvas ref={compassCanvasRef} className="w-[70px] h-[70px]" />
        </div>
      )}

      {/* Selected Building Detail Drawer - RIGHT SIDE (Clean slide-in) */}
      {!hideAllMenus && selectedBuilding && (
        <div className="absolute top-16 right-4 bottom-4 z-30 w-84 max-w-[calc(100vw-32px)] bg-surface border-2 border-subtle dark:border-[#2C4863] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-4 flex flex-col text-primary animate-in fade-in slide-in-from-right duration-200 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-subtle">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="font-mono font-extrabold text-xs px-2 py-0.5 rounded text-white shadow-sm"
                  style={{ backgroundColor: selectedBuildingRisk?.color || '#126A64' }}
                >
                  {getBuildingCode(selectedBuilding)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  {selectedBuilding.category || selectedBuilding.type}
                </span>
              </div>
              <h3 className="font-display font-semibold text-sm leading-snug pt-1">{selectedBuilding.name}</h3>
            </div>
            <button
              onClick={() => setSelectedBuilding(null)}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer border border-transparent hover:border-subtle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Operational Status Pill */}
          <div className="py-2.5 border-b border-subtle">
            <div
              className="p-2 rounded-lg text-xs font-semibold flex items-center justify-between"
              style={{
                backgroundColor: `${selectedBuildingRisk?.color}18`,
                color: selectedBuildingRisk?.color,
                border: `1px solid ${selectedBuildingRisk?.color}40`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>{selectedBuildingRisk?.label}</span>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase">
                {selectedBuildingRisk?.status}
              </span>
            </div>
          </div>

          {/* Building Physical Stats */}
          <div className="py-2.5 border-b border-subtle grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-surface-2">
              <span className="text-[10px] text-muted block">Altura estructural</span>
              <span className="font-semibold text-primary">{selectedBuilding.height} metros</span>
            </div>
            <div className="p-2 rounded-lg bg-surface-2">
              <span className="text-[10px] text-muted block">ID Plano CAD</span>
              <span className="font-mono text-[11px] text-primary">{selectedBuilding.id}</span>
            </div>
          </div>

          {/* Linked NEXO UNT Operational State */}
          {linkedFacility ? (
            <div className="py-2.5 space-y-3 flex-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                  Instalación Lógica Vinculada
                </span>
                <div className="p-2 rounded-xl border border-subtle bg-surface-2/60 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-primary">{linkedFacility.name}</div>
                    <div className="text-[10px] text-muted">{linkedFacility.zone}</div>
                  </div>
                  <span className="text-xs font-mono font-bold text-accent-primary">{linkedFacility.code}</span>
                </div>
              </div>

              {/* Services in this facility */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                  Servicios Evaluados en Escenario
                </span>
                <div className="space-y-1.5">
                  {linkedFacility.serviceIds.map((sId) => {
                    const srv = SERVICES.find((s) => s.id === sId);
                    if (!srv) return null;
                    const status = activeScenario.serviceOverrides[sId] ?? srv.status;
                    return (
                      <div
                        key={sId}
                        className="flex items-center justify-between p-2 rounded-lg border border-subtle text-xs bg-surface"
                      >
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-accent-primary" />
                          <span className="font-medium text-[11px]">{srv.name}</span>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Continuity Activities */}
              {linkedActivities.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Actividades de Continuidad ({linkedActivities.length})
                  </span>
                  <div className="space-y-1.5">
                    {linkedActivities.map((act) => (
                      <div key={act.id} className="p-2 rounded-lg border border-subtle bg-surface text-xs space-y-0.5">
                        <div className="font-medium text-primary text-[11px]">{act.title}</div>
                        <div className="flex items-center justify-between text-[10px] text-muted">
                          <span>{act.category}</span>
                          <span className="font-semibold text-accent-primary">{act.operatingMode}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-muted flex-1 flex flex-col items-center justify-center space-y-2">
              <ShieldCheck className="w-6 h-6 text-accent-primary opacity-60" />
              <p>Pabellón de campus UNT modelado en 3D bajo plano CAD.</p>
              <p className="text-[10px] text-muted/70">
                Operatividad estándar bajo supervisión de brigada.
              </p>
            </div>
          )}

          {/* Footer Notice */}
          <div className="pt-2 border-t border-subtle text-[10px] text-muted flex items-center justify-between">
            <span>Escenario simulado</span>
            <span className="text-accent-primary font-medium">NEXO UNT 3D</span>
          </div>
        </div>
      )}
    </div>
  );
}
