// ============================================================
// UNT Campus 3D - Motor Three.js Interactivo Completo
// Universidad Nacional de Trujillo (Ciudad Universitaria)
// Verificado fielmente con el plano CAD general
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
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
} from './data/campusData.js';

// ============================================================
// CONFIGURACIÓN DE LA ESCENA Y CÁMARA
// ============================================================

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  3500
);
// Vista aérea inclinada hacia el centro del campus
camera.position.set(360, 420, -140);
camera.lookAt(360, 0, 240);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

// Renderer CSS2D para nombres de facultades y laboratorios
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

// Controles orbitales 3D
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 30;
controls.maxDistance = 1400;
controls.target.set(360, 0, 240);
controls.update();

// Grupos de capas
const layerGroups = {
  buildings: new THREE.Group(),
  sports: new THREE.Group(),
  greenAreas: new THREE.Group(),
  paths: new THREE.Group(),
  trees: new THREE.Group(),
  labels: new THREE.Group(),
};
Object.values(layerGroups).forEach(group => scene.add(group));

// ============================================================
// ILUMINACIÓN SOLAR Y CIELO DINÁMICO
// ============================================================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.4);
sunLight.position.set(480, 450, 160);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
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

function updateSkyAndLighting(hour) {
  let skyColor, fogColor, ambInt, sunInt, sunHeight;

  if (hour < 5.5 || hour > 20.5) {
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
  scene.fog = new THREE.FogExp2(fogColor, 0.00065);
  ambientLight.intensity = ambInt;
  sunLight.intensity = sunInt;

  const sunX = 360 + Math.cos((hour / 24) * Math.PI * 2) * 550;
  const sunY = Math.max(30, sunHeight * 480);
  const sunZ = 240 + Math.sin((hour / 24) * Math.PI * 2) * 380;
  sunLight.position.set(sunX, sunY, sunZ);
}

// ============================================================
// SUELO, MURO PERIMETRAL Y ÓVALO (ROUNDABOUT)
// ============================================================

function createGround() {
  // Suelo base del campus
  const groundGeo = new THREE.PlaneGeometry(950, 750);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xdfd7c2,
    roughness: 0.9,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(360, -0.15, 230);
  ground.receiveShadow = true;
  scene.add(ground);

  // Terreno exterior de la ciudad
  const cityGeo = new THREE.PlaneGeometry(1800, 1600);
  const cityMat = new THREE.MeshStandardMaterial({
    color: 0xbdb59f,
    roughness: 0.95,
  });
  const city = new THREE.Mesh(cityGeo, cityMat);
  city.rotation.x = -Math.PI / 2;
  city.position.set(360, -0.3, 230);
  city.receiveShadow = true;
  scene.add(city);

  // Muro perimetral del campus
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

  // Óvalo en la esquina suroeste (Av. América Oeste / Av. Juan Pablo II)
  const ovalGeo = new THREE.CircleGeometry(26, 32);
  ovalGeo.rotateX(-Math.PI / 2);
  const ovalMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.8 });
  const ovalIsland = new THREE.Mesh(ovalGeo, ovalMat);
  ovalIsland.position.set(30, 0.1, 24);
  ovalIsland.receiveShadow = true;
  layerGroups.paths.add(ovalIsland);

  // Monumento central en el óvalo
  const ovalPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.8, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  ovalPillar.position.set(30, 4.1, 24);
  ovalPillar.castShadow = true;
  layerGroups.paths.add(ovalPillar);
}

// ============================================================
// EDIFICIOS SÓLIDOS 3D (FACULTADES, PIRÁMIDE, OCTÓGONO, LABS)
// ============================================================

const buildingMeshes = [];

function createBuildings() {
  buildings.forEach(b => {
    let mesh;

    if (b.isOctagon) {
      // 1. EDIFICIO OCTOGONAL (Facultad de Ciencias Biológicas)
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

      // Patio interior abierto octogonal
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

      // Jardín central en el patio del octógono
      const gardenGeo = new THREE.CircleGeometry(b.innerRadius - 0.5, 8);
      gardenGeo.rotateX(-Math.PI / 2);
      const gardenMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.9 });
      const courtyardGarden = new THREE.Mesh(gardenGeo, gardenMat);
      courtyardGarden.position.set(cx, 0.05, cz);
      layerGroups.greenAreas.add(courtyardGarden);

    } else {
      // 2. EDIFICIO CON PLANTA POLIGONAL / RECTANGULAR
      const shape = new THREE.Shape();
      b.polygon.forEach((p, i) => {
        if (i === 0) shape.moveTo(p[0], -p[1]);
        else shape.lineTo(p[0], -p[1]);
      });
      shape.closePath();

      const extrudeSettings = {
        depth: b.height,
        bevelEnabled: true,
        bevelThickness: 0.35,
        bevelSize: 0.35,
        bevelSegments: 2,
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.rotateX(-Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.color),
        roughness: 0.6,
        metalness: 0.1,
      });

      mesh = new THREE.Mesh(geo, mat);

      // Si tiene TECHO PIRAMIDAL (Auditorio Central / Teatro UNT)
      if (b.hasPyramidRoof) {
        createPyramidRoof(b);
      } else {
        // Losa de azotea plana
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

        // Equipos de climatización y caseta de ascensor en techos altos
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

      // Ventanales acristalados en fachadas
      addBuildingWindows(b);
      // Puerta principal con marquesina
      addBuildingEntrance(b);
    }

    mesh.position.set(0, 0, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      id: b.id,
      name: b.name,
      category: b.category,
      type: b.type,
      height: b.height,
      layerType: 'building',
    };

    layerGroups.buildings.add(mesh);
    buildingMeshes.push(mesh);
  });
}

function createPyramidRoof(building) {
  const poly = building.polygon;
  const cx = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
  const cz = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
  const baseH = building.height;
  const apexH = baseH + 7.5; // Punta de la pirámide 7.5m arriba

  const vertices = [];
  const p1 = [poly[0][0], baseH, poly[0][1]];
  const p2 = [poly[1][0], baseH, poly[1][1]];
  const p3 = [poly[2][0], baseH, poly[2][1]];
  const p4 = [poly[3][0], baseH, poly[3][1]];
  const apex = [cx, apexH, cz];

  function addTri(a, b, c) {
    vertices.push(...a, ...b, ...c);
  }
  // 4 caras triangulares que forman la pirámide
  addTri(p1, p2, apex);
  addTri(p2, p3, apex);
  addTri(p3, p4, apex);
  addTri(p4, p1, apex);

  const pyrGeo = new THREE.BufferGeometry();
  pyrGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  pyrGeo.computeVertexNormals();

  const pyrMat = new THREE.MeshStandardMaterial({
    color: 0xd4ac0d, // Tono dorado/cobre icónico del auditorio
    roughness: 0.35,
    metalness: 0.45,
    side: THREE.DoubleSide,
  });

  const pyrMesh = new THREE.Mesh(pyrGeo, pyrMat);
  pyrMesh.castShadow = true;
  pyrMesh.receiveShadow = true;
  layerGroups.buildings.add(pyrMesh);

  // Pequeño pináculo decorativo en la cúspide
  const pinGeo = new THREE.CylinderGeometry(0.3, 0.6, 2.5, 8);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.set(cx, apexH + 1.25, cz);
  pin.castShadow = true;
  layerGroups.buildings.add(pin);
}

function addBuildingWindows(building) {
  const poly = building.polygon;
  const numFloors = Math.floor(building.height / 3.4);
  if (numFloors < 1) return;

  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const wallLen = Math.sqrt(dx * dx + dz * dz);
    if (wallLen < 8) continue;

    const angle = Math.atan2(dz, dx);
    const numPanels = Math.floor(wallLen / 5);
    const nx = -Math.sin(angle) * 0.25;
    const nz = Math.cos(angle) * 0.25;

    for (let p = 0; p < numPanels; p++) {
      const t = (p + 0.5) / numPanels;
      const wx = p1[0] + dx * t + nx;
      const wz = p1[1] + dz * t + nz;

      for (let f = 0; f < numFloors; f++) {
        const winGeo = new THREE.PlaneGeometry(2.6, 1.6);
        const winMat = new THREE.MeshStandardMaterial({
          color: 0x64b5f6,
          emissive: 0x0d47a1,
          emissiveIntensity: 0.15,
          roughness: 0.1,
          metalness: 0.85,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        });

        const winMesh = new THREE.Mesh(winGeo, winMat);
        winMesh.position.set(wx, 2.0 + f * 3.4, wz);
        winMesh.rotation.y = -angle;
        layerGroups.buildings.add(winMesh);
      }
    }
  }
}

function addBuildingEntrance(building) {
  const poly = building.polygon;
  const p1 = poly[0], p2 = poly[1];
  const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
  const angle = Math.atan2(dz, dx);
  const midX = (p1[0] + p2[0]) / 2 - Math.sin(angle) * 1.5;
  const midZ = (p1[1] + p2[1]) / 2 + Math.cos(angle) * 1.5;

  const canopyGeo = new THREE.BoxGeometry(6, 0.4, 3);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.5 });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(midX, 3.2, midZ);
  canopy.rotation.y = -angle;
  canopy.castShadow = true;
  layerGroups.buildings.add(canopy);

  const doorGeo = new THREE.PlaneGeometry(4, 2.8);
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.1,
    metalness: 0.9,
    side: THREE.DoubleSide,
  });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(midX, 1.4, midZ);
  door.rotation.y = -angle;
  layerGroups.buildings.add(door);
}

// ============================================================
// COMPLEJO DEPORTIVO CON ESTADIO INCLINADO A 36°
// ============================================================

function createSportsComplex() {
  const { stadium, pitch, grandstandNW, grandstandSE, courts, pool } = sportsComplex;

  // 1. PISTA ATLÉTICA INCLINADA A 36° (El estadio está de lado según el plano CAD)
  const angleRad = (stadium.angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const cx = stadium.center[0], cz = stadium.center[1];

  const outerCurve = new THREE.EllipseCurve(0, 0, stadium.radiusX, stadium.radiusZ, 0, Math.PI * 2, false, 0);
  const outerPts = outerCurve.getPoints(64);

  const trackShape = new THREE.Shape();
  outerPts.forEach((p, i) => {
    const rx = p.x * cosA - p.y * sinA + cx;
    const rz = -(p.x * sinA + p.y * cosA + cz);
    if (i === 0) trackShape.moveTo(rx, rz);
    else trackShape.lineTo(rx, rz);
  });
  trackShape.closePath();

  // Hueco interior para la cancha de fútbol
  const innerCurve = new THREE.EllipseCurve(0, 0, stadium.radiusX - 10, stadium.radiusZ - 8, 0, Math.PI * 2, false, 0);
  const innerPts = innerCurve.getPoints(64);
  const hole = new THREE.Path();
  innerPts.forEach((p, i) => {
    const rx = p.x * cosA - p.y * sinA + cx;
    const rz = -(p.x * sinA + p.y * cosA + cz);
    if (i === 0) hole.moveTo(rx, rz);
    else hole.lineTo(rx, rz);
  });
  hole.closePath();
  trackShape.holes.push(hole);

  const trackGeo = new THREE.ShapeGeometry(trackShape);
  trackGeo.rotateX(-Math.PI / 2);

  const trackMat = new THREE.MeshStandardMaterial({
    color: 0xd84315, // Pista tartán roja oficial
    roughness: 0.7,
  });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.position.set(0, 0.08, 0);
  trackMesh.receiveShadow = true;
  layerGroups.sports.add(trackMesh);

  // 2. CAMPO DE FÚTBOL INCLINADO A 36°
  const pitchGeo = new THREE.PlaneGeometry(pitch.width, pitch.depth);
  pitchGeo.rotateX(-Math.PI / 2);
  const pitchMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.85,
  });
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.position.set(cx, 0.1, cz);
  pitchMesh.rotation.y = -angleRad;
  pitchMesh.receiveShadow = true;
  layerGroups.sports.add(pitchMesh);

  // Líneas de juego reglamentarias (Círculo central y medio campo)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const circleGeo = new THREE.RingGeometry(8, 8.6, 32);
  circleGeo.rotateX(-Math.PI / 2);
  const centerCircle = new THREE.Mesh(circleGeo, lineMat);
  centerCircle.position.set(cx, 0.12, cz);
  layerGroups.sports.add(centerCircle);

  // 3. TRIBUNAS DEL ESTADIO (NOROESTE Y SURESTE)
  [grandstandNW, grandstandSE].forEach(g => {
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

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: g.color, roughness: 0.7 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id: g.id, name: g.name, category: 'Deportes', type: 'sports', height: g.height };
    layerGroups.sports.add(mesh);
    buildingMeshes.push(mesh);
  });

  // 4. CANCHAS POLIDEPORTIVAS ROTADAS (2 LOSAS)
  courts.forEach(court => {
    const shape = new THREE.Shape();
    court.polygon.forEach((p, i) => {
      if (i === 0) shape.moveTo(p[0], -p[1]);
      else shape.lineTo(p[0], -p[1]);
    });
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({ color: court.color, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0.1, 0);
    mesh.receiveShadow = true;
    layerGroups.sports.add(mesh);
  });

  // 5. PISCINA UNIVERSITARIA
  const poolShape = new THREE.Shape();
  pool.polygon.forEach((p, i) => {
    if (i === 0) poolShape.moveTo(p[0], -p[1]);
    else poolShape.lineTo(p[0], -p[1]);
  });
  poolShape.closePath();

  const poolGeo = new THREE.ShapeGeometry(poolShape);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshStandardMaterial({
    color: pool.color,
    roughness: 0.1,
    metalness: 0.7,
  });
  const poolMesh = new THREE.Mesh(poolGeo, poolMat);
  poolMesh.position.set(0, 0.12, 0);
  layerGroups.sports.add(poolMesh);
}

// ============================================================
// LA ROTONDA (PLAZA DE LA INTEGRACIÓN - WHEEL DE 8 RAYOS)
// ============================================================

function createRotondaPlaza() {
  const { center, outerRadius, innerRadius, hubRadius, spokes } = rotonda;

  // Pavimento circular exterior
  const circleGeo = new THREE.CircleGeometry(outerRadius, 48);
  circleGeo.rotateX(-Math.PI / 2);
  const circleMat = new THREE.MeshStandardMaterial({ color: 0xded8c6, roughness: 0.7 });
  const plazaMesh = new THREE.Mesh(circleGeo, circleMat);
  plazaMesh.position.set(center[0], 0.1, center[1]);
  plazaMesh.receiveShadow = true;
  layerGroups.paths.add(plazaMesh);

  // Anillo concéntrico intermedio
  const ringGeo = new THREE.RingGeometry(innerRadius - 0.8, innerRadius + 0.8, 36);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(center[0], 0.12, center[1]);
  layerGroups.paths.add(ring);

  // 8 Rayos radiales tipo rueda / compás
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * Math.PI * 2;
    const len = outerRadius * 0.95;
    const rayGeo = new THREE.PlaneGeometry(1.6, len);
    rayGeo.rotateX(-Math.PI / 2);
    const rayMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set(
      center[0] + Math.cos(angle) * (len / 2),
      0.14,
      center[1] + Math.sin(angle) * (len / 2)
    );
    ray.rotation.y = -angle + Math.PI / 2;
    layerGroups.paths.add(ray);
  }

  // Fuente monumental en el centro
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(hubRadius, hubRadius + 0.6, 1.4, 24),
    new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.3 })
  );
  fountain.position.set(center[0], 0.7, center[1]);
  fountain.castShadow = true;
  layerGroups.paths.add(fountain);

  // Espejo de agua azul
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(hubRadius - 0.4, hubRadius - 0.4, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.1, metalness: 0.6 })
  );
  water.position.set(center[0], 1.35, center[1]);
  layerGroups.paths.add(water);

  // Obelisco / Espiral dorada central
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 7.5, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 })
  );
  spire.position.set(center[0], 4.8, center[1]);
  spire.castShadow = true;
  layerGroups.paths.add(spire);
}

// ============================================================
// ZONAS DE ESTACIONAMIENTO (CON RAYAS DIAGONALES EN ESPIGA)
// ============================================================

function createParkingLots() {
  parkingLots.forEach(lot => {
    const shape = new THREE.Shape();
    lot.polygon.forEach((p, i) => {
      if (i === 0) shape.moveTo(p[0], -p[1]);
      else shape.lineTo(p[0], -p[1]);
    });
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({ color: 0x424242, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0.08, 0);
    mesh.receiveShadow = true;
    layerGroups.paths.add(mesh);

    // Líneas amarillas de estacionamiento
    const poly = lot.polygon;
    const x1 = poly[0][0], z1 = poly[0][1];
    const x2 = poly[2][0], z2 = poly[2][1];
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    const midX = (x1 + x2) / 2;

    for (let z = minZ + 3; z < maxZ - 3; z += 5) {
      const lineGeo = new THREE.PlaneGeometry(10, 0.3);
      lineGeo.rotateX(-Math.PI / 2);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xfbc02d });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(midX, 0.09, z);
      line.rotation.y = Math.PI / 6; // En espiga (30°)
      layerGroups.paths.add(line);
    }
  });
}

// ============================================================
// ZONAS VERDES Y PARQUES DEL CAMPUS
// ============================================================

function createGreenAreas() {
  const colorMap = {
    park: 0x43a047,
    garden: 0x4caf50,
    lawn: 0x66bb6a,
  };

  greenAreas.forEach(area => {
    const shape = new THREE.Shape();
    area.polygon.forEach((p, i) => {
      if (i === 0) shape.moveTo(p[0], -p[1]);
      else shape.lineTo(p[0], -p[1]);
    });
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: colorMap[area.type] || 0x4caf50,
      roughness: 0.9,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0.04, 0);
    mesh.receiveShadow = true;
    layerGroups.greenAreas.add(mesh);
  });
}

// ============================================================
// RED DE CAMINOS Y VÍAS (LÍNEAS AMARILLAS DEL PLANO CAD)
// ============================================================

function createPaths() {
  paths.forEach(p => {
    for (let i = 0; i < p.points.length - 1; i++) {
      const p1 = p.points[i];
      const p2 = p.points[i + 1];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const pathGeo = new THREE.PlaneGeometry(len, p.width);
      pathGeo.rotateX(-Math.PI / 2);

      const pathMat = new THREE.MeshStandardMaterial({
        color: 0xedebe4,
        roughness: 0.85,
      });

      const pathMesh = new THREE.Mesh(pathGeo, pathMat);
      pathMesh.position.set(
        (p1[0] + p2[0]) / 2,
        0.06,
        (p1[1] + p2[1]) / 2
      );
      pathMesh.rotation.y = -angle;
      pathMesh.receiveShadow = true;
      layerGroups.paths.add(pathMesh);
    }
  });
}

// ============================================================
// ÁRBOLES 3D REALISTAS
// ============================================================

function createTrees() {
  const treeConfig = {
    small: { trunkH: 1.8, trunkR: 0.22, crownR: 2.2, crownH: 3.2 },
    medium: { trunkH: 2.6, trunkR: 0.32, crownR: 3.4, crownH: 4.5 },
    large: { trunkH: 3.6, trunkR: 0.42, crownR: 4.8, crownH: 5.8 },
    palm: { trunkH: 6.2, trunkR: 0.25, crownR: 3.6, crownH: 2.2 },
  };

  trees.forEach(t => {
    const cfg = treeConfig[t.type] || treeConfig.medium;

    const trunkGeo = new THREE.CylinderGeometry(cfg.trunkR * 0.7, cfg.trunkR, cfg.trunkH, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(t.x, cfg.trunkH / 2, t.z);
    trunk.castShadow = true;
    layerGroups.trees.add(trunk);

    let crownGeo;
    if (t.type === 'palm') {
      crownGeo = new THREE.SphereGeometry(cfg.crownR, 8, 4);
      crownGeo.scale(1, 0.35, 1);
    } else if (Math.random() > 0.4) {
      crownGeo = new THREE.ConeGeometry(cfg.crownR, cfg.crownH, 8);
    } else {
      crownGeo = new THREE.DodecahedronGeometry(cfg.crownR, 1);
    }

    const colorVariance = 0.85 + Math.random() * 0.3;
    const leafColor = new THREE.Color(0x2e7d32).multiplyScalar(colorVariance);
    const crownMat = new THREE.MeshStandardMaterial({
      color: leafColor,
      roughness: 0.8,
      flatShading: true,
    });

    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(t.x, cfg.trunkH + cfg.crownH * 0.45, t.z);
    crown.castShadow = true;
    crown.receiveShadow = true;
    layerGroups.trees.add(crown);
  });
}

// ============================================================
// ETIQUETAS 3D FLOTANTES (CSS2D)
// ============================================================

function createLabels() {
  labels.forEach(lbl => {
    const el = document.createElement('div');
    el.className = 'campus-label-badge';

    let icon = '🏛️';
    if (lbl.type === 'academic') icon = '🎓';
    else if (lbl.type === 'lab') icon = '🔬';
    else if (lbl.type === 'admin') icon = '🏢';
    else if (lbl.type === 'library') icon = '📚';
    else if (lbl.type === 'auditorium') icon = '🎭';
    else if (lbl.type === 'sports') icon = '⚽';

    el.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 4px 10px;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        pointer-events: auto;
        cursor: pointer;
        transition: transform 0.2s, background 0.2s;
        white-space: nowrap;
      ">
        <span style="font-size: 13px;">${icon}</span>
        <div>
          <div style="font-size: 11px; font-weight: 600; line-height: 1.2;">${lbl.name}</div>
          <div style="font-size: 9px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.5px;">${lbl.category || lbl.type}</div>
        </div>
      </div>
    `;

    el.addEventListener('mouseenter', () => {
      el.firstElementChild.style.transform = 'scale(1.08)';
      el.firstElementChild.style.background = 'rgba(30, 58, 138, 0.95)';
    });
    el.addEventListener('mouseleave', () => {
      el.firstElementChild.style.transform = 'scale(1)';
      el.firstElementChild.style.background = 'rgba(15, 23, 42, 0.88)';
    });

    const labelObj = new CSS2DObject(el);
    labelObj.position.set(lbl.x, lbl.y, lbl.z);
    layerGroups.labels.add(labelObj);
  });
}

// ============================================================
// INTERACCIÓN: RAYCASTING Y RESALTADO DE EDIFICIOS
// ============================================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
let hoveredMesh = null;
let originalColor = null;

function onPointerMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(buildingMeshes, false);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const data = obj.userData;

    if (data && data.name) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${event.clientX + 16}px`;
      tooltip.style.top = `${event.clientY + 16}px`;
      tooltip.querySelector('.tt-name').textContent = data.name;
      tooltip.querySelector('.tt-type').textContent = `${data.category || data.type} • Altura: ${data.height || 12}m`;

      if (hoveredMesh !== obj) {
        if (hoveredMesh && hoveredMesh.material && originalColor) {
          hoveredMesh.material.color.copy(originalColor);
          hoveredMesh.material.emissive.setHex(0x000000);
        }
        hoveredMesh = obj;
        originalColor = obj.material.color.clone();
        obj.material.emissive.setHex(0x224466);
        document.body.style.cursor = 'pointer';
      }
    }
  } else {
    tooltip.style.display = 'none';
    if (hoveredMesh && hoveredMesh.material && originalColor) {
      hoveredMesh.material.color.copy(originalColor);
      hoveredMesh.material.emissive.setHex(0x000000);
      hoveredMesh = null;
      originalColor = null;
      document.body.style.cursor = 'default';
    }
  }
}
window.addEventListener('pointermove', onPointerMove);

// ============================================================
// CONTROLES DE LA INTERFAZ (UI)
// ============================================================

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const layer = btn.dataset.layer;
    if (layerGroups[layer]) {
      layerGroups[layer].visible = !layerGroups[layer].visible;
      btn.classList.toggle('active');
      btn.textContent = layerGroups[layer].visible ? 'Visible' : 'Oculto';
    }
  });
});

const timeSlider = document.getElementById('time-slider');
const timeDisplay = document.getElementById('time-display');
if (timeSlider && timeDisplay) {
  timeSlider.addEventListener('input', () => {
    const hour = parseFloat(timeSlider.value);
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    timeDisplay.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    updateSkyAndLighting(hour);
  });
}

// ============================================================
// BRÚJULA DINÁMICA
// ============================================================

function drawCompass() {
  const canvas = document.getElementById('compass');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = 140;
  canvas.height = 140;

  const cx = 70, cy = 70, r = 28;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const angle = Math.atan2(dir.x, dir.z);

  ctx.clearRect(0, 0, 140, 140);

  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-angle);

  ctx.beginPath();
  ctx.moveTo(0, -r + 2);
  ctx.lineTo(-6, 4);
  ctx.lineTo(6, 4);
  ctx.closePath();
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, r - 2);
  ctx.lineTo(-5, -3);
  ctx.lineTo(5, -3);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -r - 8);

  ctx.restore();
}

// ============================================================
// BUCLE DE RENDERIZADO Y ANIMACIÓN
// ============================================================

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  drawCompass();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// INICIALIZACIÓN COMPLETA
// ============================================================

function init() {
  createGround();
  createBuildings();
  createSportsComplex();
  createRotondaPlaza();
  createParkingLots();
  createGreenAreas();
  createPaths();
  createTrees();
  createLabels();
  updateSkyAndLighting(10.5);
  animate();

  console.log('🏛️ Campus UNT 3D cargado fielmente según plano CAD.');
  console.log(`   Edificios sólidos: ${buildings.length}`);
  console.log(`   Árboles: ${trees.length}`);
  console.log(`   Caminos: ${paths.length}`);
}

init();
