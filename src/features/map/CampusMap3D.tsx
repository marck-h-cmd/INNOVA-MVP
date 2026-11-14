import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  Activity,
  AlertTriangle,
  Building2,
  Compass as CompassIcon,
  Droplets,
  Eye,
  EyeOff,
  Maximize2,
  RotateCcw,
  ShieldCheck,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const compassCanvasRef = useRef<HTMLCanvasElement>(null);

  const { activeScenario, dependencyGraph } = useDerivedNexo();
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const scenarios = useNexoStore((s) => s.scenarios);

  const [selectedBuilding, setSelectedBuilding] = useState<Building3DDefinition | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<Building3DDefinition | null>(null);
  const [hourOfDay, setHourOfDay] = useState<number>(10.5);
  const [layers, setLayers] = useState<LayerState>({
    buildings: true,
    greenAreas: true,
    trees: true,
    paths: true,
    labels: true,
    floodWater: true,
  });

  // Reference to 3D scene elements to update on state change
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const layerGroupsRef = useRef<Record<string, THREE.Group>>({});
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
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
      if (key === 'floodWater' && waterMeshRef.current) {
        waterMeshRef.current.visible = next[key];
      }
      return next;
    });
  };

  // Reset Camera View
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(360, 420, -140);
      controlsRef.current.target.set(360, 0, 240);
      controlsRef.current.update();
    }
  };

  // Top-down Zenith View
  const setTopDownView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(360, 750, 240);
      controlsRef.current.target.set(360, 0, 240);
      controlsRef.current.update();
    }
  };

  // Update water elevation based on rain intensity and toggle
  useEffect(() => {
    if (waterMeshRef.current) {
      if (rainIntensity >= 25 && layers.floodWater) {
        waterMeshRef.current.visible = true;
        // Height from 0.05m to 2.2m depending on rain intensity (25% to 100%)
        const targetY = 0.05 + ((rainIntensity - 25) / 75) * 1.8;
        waterMeshRef.current.position.y = targetY;
      } else {
        waterMeshRef.current.visible = false;
      }
    }
    if (skyUpdateFnRef.current) {
      skyUpdateFnRef.current(hourOfDay, rainIntensity);
    }
  }, [rainIntensity, layers.floodWater, hourOfDay]);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderers
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 650;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3500);
    camera.position.set(360, 420, -140);
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
    controls.target.set(360, 0, 240);
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
    };
    Object.values(layerGroups).forEach((grp) => scene.add(grp));
    layerGroupsRef.current = layerGroups;

    // 4. Lighting & Environment
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.4);
    sunLight.position.set(480, 450, 160);
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

      // Storm/Overcast weather if rain is significant
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

      const sunX = 360 + Math.cos((hour / 24) * Math.PI * 2) * 550;
      const sunY = Math.max(30, sunHeight * 480);
      const sunZ = 240 + Math.sin((hour / 24) * Math.PI * 2) * 380;
      sunLight.position.set(sunX, sunY, sunZ);
    }
    skyUpdateFnRef.current = updateSkyAndLighting;
    updateSkyAndLighting(hourOfDay, rainIntensity);

    // 5. Build Campus Elements
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(950, 750);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xdfd7c2, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(360, -0.15, 230);
    ground.receiveShadow = true;
    scene.add(ground);

    // Exterior city plane
    const cityGeo = new THREE.PlaneGeometry(1800, 1600);
    const cityMat = new THREE.MeshStandardMaterial({ color: 0xbdb59f, roughness: 0.95 });
    const city = new THREE.Mesh(cityGeo, cityMat);
    city.rotation.x = -Math.PI / 2;
    city.position.set(360, -0.3, 230);
    city.receiveShadow = true;
    scene.add(city);

    // Perimeter boundary wall
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

    // Dynamic flood water plane
    const waterGeo = new THREE.PlaneGeometry(760, 500, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1565c0,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.65,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(360, 0.2, 230);
    waterMesh.receiveShadow = true;
    waterMesh.visible = rainIntensity >= 25;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // Oval at Southwest
    const ovalGeo = new THREE.CircleGeometry(26, 32);
    ovalGeo.rotateX(-Math.PI / 2);
    const ovalIsland = new THREE.Mesh(
      ovalGeo,
      new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.8 }),
    );
    ovalIsland.position.set(30, 0.1, 24);
    ovalIsland.receiveShadow = true;
    layerGroups.paths.add(ovalIsland);

    // Oval Monument
    const ovalPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.8, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
    );
    ovalPillar.position.set(30, 4.1, 24);
    ovalPillar.castShadow = true;
    layerGroups.paths.add(ovalPillar);

    // 6. Buildings
    const buildingMeshes: THREE.Mesh[] = [];

    buildings.forEach((b) => {
      let mesh: THREE.Mesh;

      if (b.isOctagon && b.center && b.outerRadius && b.innerRadius) {
        // Octagonal building (Biología)
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

        const gardenGeo = new THREE.CircleGeometry(b.innerRadius - 0.5, 8);
        gardenGeo.rotateX(-Math.PI / 2);
        const courtyardGarden = new THREE.Mesh(
          gardenGeo,
          new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.9 }),
        );
        courtyardGarden.position.set(cx, 0.05, cz);
        layerGroups.greenAreas.add(courtyardGarden);
      } else if (b.polygon && b.polygon.length > 0) {
        // Polygonal building
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

        // Pyramid roof (Auditorio Central)
        if (b.hasPyramidRoof && b.polygon.length >= 4) {
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
          const pyrMesh = new THREE.Mesh(pyrGeo, pyrMat);
          pyrMesh.castShadow = true;
          pyrMesh.receiveShadow = true;
          layerGroups.buildings.add(pyrMesh);

          const pinGeo = new THREE.CylinderGeometry(0.3, 0.6, 2.5, 8);
          const pinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
          const pin = new THREE.Mesh(pinGeo, pinMat);
          pin.position.set(cx, apexH + 1.25, cz);
          pin.castShadow = true;
          layerGroups.buildings.add(pin);
        } else {
          // Flat roof slab
          const roofShape = new THREE.Shape();
          b.polygon.forEach((p, i) => {
            if (i === 0) roofShape.moveTo(p[0], -p[1]);
            else roofShape.lineTo(p[0], -p[1]);
          });
          roofShape.closePath();

          const roofGeo = new THREE.ShapeGeometry(roofShape);
          roofGeo.rotateX(-Math.PI / 2);
          const roofMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(b.roofColor || b.color).multiplyScalar(0.85),
            roughness: 0.8,
          });
          const roofMesh = new THREE.Mesh(roofGeo, roofMat);
          roofMesh.position.set(0, b.height + 0.38, 0);
          roofMesh.receiveShadow = true;
          layerGroups.buildings.add(roofMesh);

          // AC units on tall buildings
          if (b.height >= 11) {
            const cx = b.polygon.reduce((sum, p) => sum + p[0], 0) / b.polygon.length;
            const cz = b.polygon.reduce((sum, p) => sum + p[1], 0) / b.polygon.length;
            const acGeo = new THREE.BoxGeometry(6, 2.4, 5);
            const acMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.5 });
            const acMesh = new THREE.Mesh(acGeo, acMat);
            acMesh.position.set(cx, b.height + 1.6, cz);
            acMesh.castShadow = true;
            layerGroups.buildings.add(acMesh);
          }
        }
      } else {
        return;
      }

      mesh.position.set(0, 0, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { ...b, layerType: 'building' };

      layerGroups.buildings.add(mesh);
      buildingMeshes.push(mesh);
    });

    buildingMeshesRef.current = buildingMeshes;

    // 7. Sports Complex
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

    // Football Pitch
    const pitchGeo = new THREE.PlaneGeometry(pitch.width, pitch.depth);
    pitchGeo.rotateX(-Math.PI / 2);
    const pitchMesh = new THREE.Mesh(pitchGeo, new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 }));
    pitchMesh.position.set(cxS, 0.1, czS);
    pitchMesh.rotation.y = -angleRad;
    pitchMesh.receiveShadow = true;
    layerGroups.sports.add(pitchMesh);

    // Grandstands
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
      standMesh.userData = { id: g.id, name: g.name, category: 'Deportes', type: 'sports', height: g.height };
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

    // Pool
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

    // 8. Rotonda Plaza
    const { center: rCenter, outerRadius, innerRadius, hubRadius, spokes } = rotonda;
    const rCircleGeo = new THREE.CircleGeometry(outerRadius, 48);
    rCircleGeo.rotateX(-Math.PI / 2);
    const rPlazaMesh = new THREE.Mesh(
      rCircleGeo,
      new THREE.MeshStandardMaterial({ color: 0xded8c6, roughness: 0.7 }),
    );
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

    // 9. Parking Lots
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

    // 10. Green Areas
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

    // 11. Paths
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

    // 12. Procedural Trees
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

    // 13. CSS2D Floating Labels
    labels.forEach((lbl) => {
      const el = document.createElement('div');
      el.className = 'campus-label-3d';
      el.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
        background: rgba(16, 28, 39, 0.9);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(117, 213, 196, 0.4);
        border-radius: 6px;
        padding: 3px 8px;
        color: #ffffff;
        font-family: inherit;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        pointer-events: auto;
        cursor: pointer;
        transition: transform 0.2s, background 0.2s;
        white-space: nowrap;
      `;

      let icon = '🏛️';
      if (lbl.type === 'academic') icon = '🎓';
      else if (lbl.type === 'lab') icon = '🔬';
      else if (lbl.type === 'admin') icon = '🏢';
      else if (lbl.type === 'library') icon = '📚';
      else if (lbl.type === 'sports') icon = '⚽';

      el.innerHTML = `
        <span style="font-size: 11px;">${icon}</span>
        <div>
          <div style="font-size: 10px; font-weight: 600; line-height: 1.1;">${lbl.name}</div>
          <div style="font-size: 8px; opacity: 0.7; color: #75d5c4; text-transform: uppercase;">${lbl.category || lbl.type}</div>
        </div>
      `;

      el.addEventListener('click', () => {
        const found = buildings.find((b) => b.id === lbl.id);
        if (found) setSelectedBuilding(found);
      });

      const labelObj = new CSS2DObject(el);
      labelObj.position.set(lbl.x, lbl.y, lbl.z);
      layerGroups.labels.add(labelObj);
    });

    // 14. Raycaster & Interactivity
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

    // 15. Compass rendering
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
      const angle = Math.atan2(dir.x, dir.z);

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

      // North needle
      ctx.beginPath();
      ctx.moveTo(0, -r + 2);
      ctx.lineTo(-5, 4);
      ctx.lineTo(5, 4);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // South needle
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

    // 16. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Subtle water wave animation
      if (waterMeshRef.current && waterMeshRef.current.visible) {
        const time = clock.getElapsedTime();
        waterMeshRef.current.position.y += Math.sin(time * 2) * 0.0012;
      }

      drawCompass();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    animate();

    // 17. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || 650;
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

  // Determine linked NEXO UNT facility for selected 3D building
  const mappedFacilityId = selectedBuilding ? FACILITY_3D_MAPPING[selectedBuilding.id] : null;
  const linkedFacility = mappedFacilityId
    ? FACILITIES.find((f) => f.id === mappedFacilityId)
    : null;

  // Activities related to the selected building
  const linkedActivities = useMemo(() => {
    if (!linkedFacility) return [];
    return CONTINUITY_ACTIVITIES.filter((a) => a.facilityId === linkedFacility.id);
  }, [linkedFacility]);

  return (
    <div className="relative w-full h-[720px] rounded-2xl overflow-hidden border border-subtle bg-sidebar shadow-lg">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top Floating Control Bar (GovTech Style) */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sidebar/90 border border-white/10 text-white backdrop-blur-md shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse" />
          <span className="text-xs font-semibold tracking-wide">MODO 3D • CIUDAD UNIVERSITARIA UNT</span>
        </div>

        {/* Scenario Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/90 border border-subtle text-xs font-medium text-primary backdrop-blur-md shadow-md">
          <span className="text-muted">Escenario:</span>
          <select
            value={activeScenario.id}
            onChange={(e) => selectScenario(e.target.value)}
            className="bg-transparent font-semibold text-primary outline-none cursor-pointer"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id} className="text-primary bg-surface">
                {s.title} ({s.inputs.rainIntensity}% lluvia)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top-Right Control Palette */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 max-w-[240px]">
        {/* Layer Toggles Card */}
        <div className="p-3 rounded-xl bg-sidebar/90 border border-white/10 text-white backdrop-blur-md shadow-xl text-xs space-y-2">
          <div className="flex items-center justify-between font-semibold text-[11px] uppercase tracking-wider text-accent-primary border-b border-white/10 pb-1.5">
            <span>Capas 3D</span>
            <Building2 className="w-3.5 h-3.5" />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => toggleLayer('buildings')}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-between ${
                layers.buildings
                  ? 'bg-accent-primary/25 border-accent-primary text-white'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <span>Edificios</span>
              {layers.buildings ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>

            <button
              onClick={() => toggleLayer('floodWater')}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-between ${
                layers.floodWater
                  ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <span>Inundación</span>
              <Droplets className="w-3 h-3" />
            </button>

            <button
              onClick={() => toggleLayer('greenAreas')}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-between ${
                layers.greenAreas
                  ? 'bg-green-600/30 border-green-400 text-green-200'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <span>Áreas verdes</span>
              {layers.greenAreas ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>

            <button
              onClick={() => toggleLayer('trees')}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-between ${
                layers.trees
                  ? 'bg-green-700/30 border-green-500 text-green-300'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <span>Árboles</span>
              {layers.trees ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>

            <button
              onClick={() => toggleLayer('paths')}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-between ${
                layers.paths
                  ? 'bg-amber-600/30 border-amber-400 text-amber-200'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <span>Vías y rutas</span>
              {layers.paths ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>

            <button
              onClick={() => toggleLayer('labels')}
              className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center justify-between ${
                layers.labels
                  ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <span>Etiquetas</span>
              {layers.labels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </div>

          {/* Time of Day Slider */}
          <div className="pt-2 border-t border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-white/70">
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400" /> Iluminación solar
              </span>
              <span className="font-mono text-accent-primary">{Math.floor(hourOfDay)}:00h</span>
            </div>
            <input
              type="range"
              min="5"
              max="21"
              step="0.5"
              value={hourOfDay}
              onChange={(e) => setHourOfDay(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-primary"
            />
          </div>

          {/* Quick Camera Views */}
          <div className="pt-2 border-t border-white/10 flex gap-1.5">
            <button
              onClick={resetCamera}
              className="flex-1 py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[10px] font-medium text-white flex items-center justify-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Isométrica
            </button>
            <button
              onClick={setTopDownView}
              className="flex-1 py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[10px] font-medium text-white flex items-center justify-center gap-1 transition-colors"
            >
              <Maximize2 className="w-3 h-3" /> Cenital
            </button>
          </div>
        </div>

        {/* Flood Alert Indicator Pill */}
        {rainIntensity >= 30 && layers.floodWater && (
          <div className="p-2.5 rounded-xl bg-blue-950/90 border border-blue-500/40 text-blue-100 backdrop-blur-md shadow-lg flex items-start gap-2">
            <Droplets className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-[11px] leading-tight">
              <span className="font-semibold block text-blue-300">Anegamiento Pluvial 3D</span>
              Lluvia {rainIntensity}%: cotas bajas inundadas (+{((rainIntensity - 25) / 75 * 1.8).toFixed(1)}m).
            </div>
          </div>
        )}
      </div>

      {/* Hover Tooltip Preview */}
      {hoveredBuilding && !selectedBuilding && (
        <div className="absolute bottom-6 left-6 z-10 px-3 py-2 rounded-xl bg-sidebar/95 border border-accent-primary/40 text-white backdrop-blur-md shadow-2xl pointer-events-none flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent-primary" />
          <div>
            <div className="text-xs font-semibold">{hoveredBuilding.name}</div>
            <div className="text-[10px] text-white/60">
              {hoveredBuilding.category || hoveredBuilding.type} • Altura: {hoveredBuilding.height}m
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Compass Widget */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <canvas ref={compassCanvasRef} className="w-[70px] h-[70px]" />
      </div>

      {/* Selected Building Detail Drawer / Modal */}
      {selectedBuilding && (
        <div className="absolute top-4 right-4 bottom-4 z-20 w-80 max-w-[calc(100vw-32px)] bg-surface border border-subtle rounded-2xl shadow-2xl p-4 flex flex-col text-primary animate-in fade-in slide-in-from-right duration-200 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-subtle">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">
                {selectedBuilding.category || selectedBuilding.type}
              </span>
              <h3 className="font-display font-semibold text-sm leading-snug">{selectedBuilding.name}</h3>
            </div>
            <button
              onClick={() => setSelectedBuilding(null)}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Building Physical Stats */}
          <div className="py-3 border-b border-subtle grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-surface-2">
              <span className="text-[10px] text-muted block">Altura estructural</span>
              <span className="font-semibold text-primary">{selectedBuilding.height} metros</span>
            </div>
            <div className="p-2 rounded-lg bg-surface-2">
              <span className="text-[10px] text-muted block">ID CAD Geoespacial</span>
              <span className="font-mono text-[11px] text-primary">{selectedBuilding.id}</span>
            </div>
          </div>

          {/* Linked NEXO UNT Operational State */}
          {linkedFacility ? (
            <div className="py-3 space-y-3 flex-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  Instalación Lógica Asociada
                </span>
                <div className="p-2.5 rounded-xl border border-subtle bg-surface-2/60 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-primary">{linkedFacility.name}</div>
                    <div className="text-[10px] text-muted">{linkedFacility.zone}</div>
                  </div>
                  <span className="text-xs font-mono font-bold text-accent-primary">{linkedFacility.code}</span>
                </div>
              </div>

              {/* Services in this facility */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  Estado de Servicios en Instalación
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
                          <span className="font-medium">{srv.name}</span>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Academic Continuity in this facility */}
              {linkedActivities.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                    Actividades de Continuidad ({linkedActivities.length})
                  </span>
                  <div className="space-y-1.5">
                    {linkedActivities.map((act) => (
                      <div key={act.id} className="p-2 rounded-lg border border-subtle bg-surface text-xs space-y-1">
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
          <div className="pt-3 border-t border-subtle text-[10px] text-muted flex items-center justify-between">
            <span>Escenario simulado</span>
            <span className="text-accent-primary font-medium">UNT 3D Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
