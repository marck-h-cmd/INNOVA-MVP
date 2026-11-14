// ============================================================
// Campus UNT - Datos Geoespaciales Verificados según Plano CAD
// Universidad Nacional de Trujillo (Ciudad Universitaria)
// ============================================================
// Coordenadas locales en metros:
// X: 0 (Av. América Oeste / Antenor Orrego) a 720 (Límite Este)
// Z: 0 (Av. Juan Pablo II) a 460 (Av. Jesús de Nazareth)
// Y: 0 (Nivel de suelo)

export interface Building3DDefinition {
  id: string;
  name: string;
  category: string;
  type: 'academic' | 'administrative' | 'service' | 'sports' | 'lab' | 'auditorium' | 'library' | 'admin' | string;
  polygon?: [number, number][];
  height: number;
  color: string;
  roofColor?: string;
  isOctagon?: boolean;
  center?: [number, number];
  outerRadius?: number;
  innerRadius?: number;
  hasPyramidRoof?: boolean;
  facilityMappingId?: string;
}

function createRotatedRect(cx: number, cz: number, w: number, d: number, angleDeg: number): [number, number][] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = w / 2;
  const hd = d / 2;
  const corners = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
  return corners.map(([x, z]) => [
    Math.round((cx + x * cos - z * sin) * 10) / 10,
    Math.round((cz + x * sin + z * cos) * 10) / 10,
  ]);
}

// ============================================================
// PERÍMETRO DEL CAMPUS UNT
// ============================================================
export const campusBoundary = [
  [12, 12],
  [12, 120],
  [16, 260],
  [22, 380],
  [26, 445],
  [180, 452],
  [330, 455],
  [510, 452],
  [690, 445],
  [700, 360],
  [700, 200],
  [695, 70],
  [685, 15],
  [450, 12],
  [220, 12],
  [12, 12],
];

// ============================================================
// COMPLEJO DEPORTIVO (ESTADIO TILTED 36°, PISCINA, CANCHAS)
// El estadio está en ángulo/de lado (~36°) como muestra el plano CAD
// ============================================================
export const sportsComplex = {
  // Estadio UNT / Pista atlética
  stadium: {
    id: 'estadio-unt',
    name: 'Estadio UNT / Pista Atlética Olímpica',
    center: [142, 126],
    radiusX: 72,
    radiusZ: 44,
    angleDeg: 36, // Rotación exacta del plano CAD
    trackColor: '#d84315', // Arcilla roja tartán
  },
  // Campo de fútbol dentro del óvalo
  pitch: {
    id: 'cancha-futbol',
    name: 'Campo de Fútbol Oficial UNT',
    center: [142, 126],
    width: 92,
    depth: 54,
    angleDeg: 36,
    color: '#2e7d32',
  },
  // Tribuna Principal (Costado Noroeste del estadio)
  grandstandNW: {
    id: 'tribuna-nw',
    name: 'Tribuna Preferencial Noroeste',
    type: 'sports',
    polygon: createRotatedRect(114, 168, 86, 12, 36),
    height: 10,
    color: '#d35400',
    roofColor: '#ba4a00',
  },
  // Tribuna Sureste (Costado opuesto)
  grandstandSE: {
    id: 'tribuna-se',
    name: 'Tribuna Oriente Sureste',
    type: 'sports',
    polygon: createRotatedRect(170, 84, 86, 10, 36),
    height: 8,
    color: '#d35400',
    roofColor: '#ba4a00',
  },
  // Canchas polideportivas (2 losas gemelas rotadas al mismo ángulo)
  courts: [
    {
      id: 'losa-deportiva-1',
      name: 'Losa Multideportiva A',
      center: [84, 182],
      width: 28,
      depth: 18,
      angleDeg: 36,
      polygon: createRotatedRect(84, 182, 28, 18, 36),
      color: '#1565c0',
    },
    {
      id: 'losa-deportiva-2',
      name: 'Losa Multideportiva B',
      center: [100, 204],
      width: 28,
      depth: 18,
      angleDeg: 36,
      polygon: createRotatedRect(100, 204, 28, 18, 36),
      color: '#c62828',
    },
  ],
  // Piscina y vestuarios
  pool: {
    id: 'piscina-unt',
    name: 'Piscina Universitaria y Gimnasio',
    center: [78, 255],
    width: 32,
    depth: 18,
    polygon: [[62, 246], [94, 246], [94, 264], [62, 264]],
    color: '#0288d1',
  },
};

// ============================================================
// EDIFICIOS 3D (CADA UNO IDENTIFICADO CON SU FORMA EXACTA DEL CAD)
// ============================================================
export const buildings: Building3DDefinition[] = [
  // ----------------------------------------------------------
  // 1. SECTOR NOROESTE (Pabellones de Aulas Generales NW)
  // Dos pabellones paralelos en forma de 'H' o peine con puente
  // ----------------------------------------------------------
  {
    id: 'pabellon-aulas-nw-1',
    name: 'Pabellón Aulas Generales NW (Bloque 1)',
    category: 'Aulas Generales',
    type: 'academic',
    polygon: [[45, 330], [68, 330], [68, 420], [45, 420]],
    height: 11,
    color: '#b0bec5',
    roofColor: '#78909c',
  },
  {
    id: 'pabellon-aulas-nw-2',
    name: 'Pabellón Aulas Generales NW (Bloque 2)',
    category: 'Aulas Generales',
    type: 'academic',
    polygon: [[82, 330], [105, 330], [105, 420], [82, 420]],
    height: 11,
    color: '#b0bec5',
    roofColor: '#78909c',
  },
  {
    id: 'conector-nw',
    name: 'Conector Central Aulas NW',
    category: 'Aulas Generales',
    type: 'academic',
    polygon: [[68, 368], [82, 368], [82, 384], [68, 384]],
    height: 9,
    color: '#90a4ae',
    roofColor: '#607d8b',
  },
  {
    id: 'talleres-nw',
    name: 'Talleres y Laboratorios NW',
    category: 'Talleres y Laboratorios',
    type: 'lab',
    polygon: [[115, 375], [165, 375], [165, 415], [115, 415]],
    height: 8,
    color: '#cfd8dc',
    roofColor: '#90a4ae',
  },
  {
    id: 'pabellon-nw-diagonal',
    name: 'Pabellón Agronomía y Veterinaria NW',
    category: 'Ciencias Agropecuarias',
    type: 'academic',
    polygon: createRotatedRect(210, 395, 46, 20, 22),
    height: 11,
    color: '#81c784',
    roofColor: '#4caf50',
  },

  // ----------------------------------------------------------
  // 2. SECTOR DEPORTIVO & EDIFICIOS DIAGONALES
  // Edificios en ángulo rotados a 36° junto al estadio (vistos en CAD)
  // ----------------------------------------------------------
  {
    id: 'edificio-diagonal-1',
    name: 'Pabellón de Aulas Deportivas y Tópico',
    category: 'Bienestar Universitario',
    type: 'academic',
    polygon: createRotatedRect(198, 222, 36, 18, 36),
    height: 10,
    color: '#e67e22',
    roofColor: '#d35400',
  },
  {
    id: 'edificio-diagonal-2',
    name: 'Pabellón de Gimnasia y Federación Estudiantil',
    category: 'Instalaciones Deportivas',
    type: 'sports',
    polygon: createRotatedRect(222, 185, 36, 18, 36),
    height: 10,
    color: '#e67e22',
    roofColor: '#d35400',
  },
  {
    id: 'vestuarios-deporte',
    name: 'Vestuarios Centrales y Gimnasio',
    category: 'Deportes',
    type: 'sports',
    polygon: [[52, 218], [95, 218], [95, 242], [52, 242]],
    height: 6,
    color: '#d7ccc8',
    roofColor: '#a1887f',
  },

  // ----------------------------------------------------------
  // 3. SECTOR SUR (PARALELO A AV. JUAN PABLO II)
  // Con Puerta 1, Puerta 2, Comedor, Servicios y Económicas
  // ----------------------------------------------------------
  {
    id: 'servicios-generales',
    name: 'Servicios Generales y Transporte UNT',
    category: 'Mantenimiento y Logística',
    type: 'service',
    polygon: [[215, 45], [275, 45], [275, 75], [215, 75]],
    height: 7,
    color: '#bcaaa4',
    roofColor: '#8d6e63',
  },
  {
    id: 'comedor-universitario',
    name: 'Comedor Universitario UNT',
    category: 'Bienestar Universitario',
    type: 'service',
    polygon: [[285, 45], [350, 45], [350, 78], [285, 78]],
    height: 9,
    color: '#d7ccc8',
    roofColor: '#a1887f',
  },
  {
    id: 'bienestar-universitario',
    name: 'Dirección de Bienestar Universitario',
    category: 'Servicios Estudiantiles',
    type: 'service',
    polygon: [[358, 45], [415, 45], [415, 78], [358, 78]],
    height: 9,
    color: '#d7ccc8',
    roofColor: '#a1887f',
  },
  {
    id: 'facultad-ciencias-economicas',
    name: 'Facultad de Ciencias Económicas',
    category: 'Economía, Contabilidad y Administración',
    type: 'academic',
    polygon: [[435, 45], [515, 45], [515, 100], [435, 100]],
    height: 15,
    color: '#90a4ae',
    roofColor: '#546e7a',
  },
  {
    id: 'aulas-economicas-sur',
    name: 'Pabellón de Aulas de Contabilidad y Finanzas',
    category: 'Ciencias Económicas',
    type: 'academic',
    polygon: [[525, 45], [590, 45], [590, 85], [525, 85]],
    height: 12,
    color: '#b0bec5',
    roofColor: '#78909c',
  },
  {
    id: 'facultad-educacion',
    name: 'Facultad de Educación y Ciencias de la Comunicación',
    category: 'Facultad Académica',
    type: 'academic',
    polygon: [[280, 95], [355, 95], [355, 150], [280, 150]],
    height: 14,
    color: '#90a4ae',
    roofColor: '#607d8b',
  },
  {
    id: 'ciencias-sociales',
    name: 'Facultad de Ciencias Sociales',
    category: 'Facultad Académica',
    type: 'academic',
    polygon: [[280, 160], [355, 160], [355, 215], [280, 215]],
    height: 13,
    color: '#90a4ae',
    roofColor: '#607d8b',
  },

  // ----------------------------------------------------------
  // 4. SECTOR CENTRAL (EL EDIFICIO PIRAMIDAL Y FACULTAD DE INGENIERÍA)
  // El edificio con techo a 4 aguas (pirámide) que se destaca en el CAD
  // ----------------------------------------------------------
  {
    id: 'auditorio-teatro-unt',
    name: 'Auditorio Central / Teatro Universitario UNT',
    category: 'Edificio Central y Eventos',
    type: 'auditorium',
    polygon: [[350, 245], [395, 245], [395, 290], [350, 290]],
    height: 16,
    hasPyramidRoof: true, // Techo piramidal distintivo del plano CAD
    color: '#d4ac0d',     // Tono dorado/ocre icónico
    roofColor: '#b7950b',
  },
  {
    id: 'facultad-ingenieria-civil',
    name: 'Facultad de Ingeniería - Pabellón Civil y Sistemas',
    category: 'Ingeniería',
    type: 'academic',
    polygon: [[330, 305], [410, 305], [410, 345], [330, 345]],
    height: 16,
    color: '#78909c',
    roofColor: '#455a64',
  },
  {
    id: 'laboratorios-ingenieria',
    name: 'Laboratorios de Ingeniería y Cómputo',
    category: 'Investigación Tecnológica',
    type: 'lab',
    polygon: [[295, 245], [340, 245], [340, 295], [295, 295]],
    height: 10,
    color: '#cfd8dc',
    roofColor: '#90a4ae',
  },
  {
    id: 'facultad-ciencias-fisicas',
    name: 'Fac. Ciencias Físicas y Matemáticas',
    category: 'Facultad Académica',
    type: 'academic',
    polygon: [[415, 245], [455, 245], [455, 305], [415, 305]],
    height: 14,
    color: '#90a4ae',
    roofColor: '#546e7a',
  },
  {
    id: 'biblioteca-central',
    name: 'Biblioteca Central UNT',
    category: 'Centro de Documentación e Información',
    type: 'library',
    polygon: [[415, 315], [465, 315], [465, 360], [415, 360]],
    height: 15,
    color: '#5c6bc0',
    roofColor: '#3949ab',
  },

  // ----------------------------------------------------------
  // 5. SECTOR ROTONDA (PLAZA DE LA INTEGRACIÓN Y DERECHO)
  // Rueda radial de 8 rayos y facultades adyacentes
  // ----------------------------------------------------------
  {
    id: 'facultad-medicina',
    name: 'Facultad de Medicina',
    category: 'Ciencias Médicas',
    type: 'academic',
    polygon: [[465, 140], [515, 140], [515, 215], [465, 215]],
    height: 16,
    color: '#90a4ae',
    roofColor: '#546e7a',
  },
  {
    id: 'facultad-farmacia',
    name: 'Facultad de Farmacia y Bioquímica',
    category: 'Ciencias de la Salud',
    type: 'academic',
    polygon: [[465, 225], [515, 225], [515, 285], [465, 285]],
    height: 14,
    color: '#90a4ae',
    roofColor: '#546e7a',
  },
  {
    id: 'facultad-enfermeria',
    name: 'Facultad de Enfermería',
    category: 'Ciencias de la Salud',
    type: 'academic',
    polygon: [[475, 295], [525, 295], [525, 345], [475, 345]],
    height: 13,
    color: '#90a4ae',
    roofColor: '#546e7a',
  },
  {
    id: 'facultad-derecho',
    name: 'Facultad de Derecho y Ciencias Políticas',
    category: 'Facultad Académica',
    type: 'academic',
    polygon: [[555, 135], [625, 135], [625, 205], [555, 205]],
    height: 16,
    color: '#90a4ae',
    roofColor: '#455a64',
  },
  {
    id: 'escuela-posgrado',
    name: 'Escuela de Posgrado UNT',
    category: 'Posgrado y Maestrías',
    type: 'admin',
    polygon: [[555, 215], [620, 215], [620, 260], [555, 260]],
    height: 14,
    color: '#c0392b',
    roofColor: '#962d22',
  },

  // ----------------------------------------------------------
  // 6. EDIFICIO OCTOGONAL Y SECTOR ESTE
  // Edificio anular de 8 lados muy destacado en el plano CAD
  // ----------------------------------------------------------
  {
    id: 'edificio-octogonal-biologicas',
    name: 'Facultad de Ciencias Biológicas (Edificio Octogonal)',
    category: 'Biología, Pesquería y Microbiología',
    type: 'academic',
    isOctagon: true, // Generado como anillo octogonal 3D
    center: [642, 185],
    outerRadius: 25,
    innerRadius: 10,
    height: 13,
    color: '#81c784',
    roofColor: '#388e3c',
  },
  {
    id: 'pergola-este',
    name: 'Pabellón Este con Pérgola y Colonnade',
    category: 'Aulas y Laboratorios Este',
    type: 'academic',
    polygon: [[575, 265], [645, 265], [645, 310], [575, 310]],
    height: 12,
    color: '#e74c3c',
    roofColor: '#c0392b',
  },
  {
    id: 'ingenieria-quimica',
    name: 'Facultad de Ingeniería Química',
    category: 'Ingeniería',
    type: 'academic',
    polygon: [[535, 325], [605, 325], [605, 375], [535, 375]],
    height: 14,
    color: '#78909c',
    roofColor: '#455a64',
  },
  {
    id: 'centro-idiomas',
    name: 'Centro de Idiomas UNT',
    category: 'Enseñanza de Idiomas',
    type: 'academic',
    polygon: [[535, 385], [605, 385], [605, 425], [535, 425]],
    height: 12,
    color: '#90a4ae',
    roofColor: '#546e7a',
  },
  {
    id: 'pabellon-verde-ne',
    name: 'Complejo de Nuevos Laboratorios NE',
    category: 'Investigación Científica',
    type: 'lab',
    polygon: [[625, 335], [685, 335], [685, 410], [625, 410]],
    height: 14,
    color: '#66bb6a',
    roofColor: '#2e7d32',
  },
  {
    id: 'facultad-letras-este',
    name: 'Pabellón Letras y Humanidades Sureste',
    category: 'Aulas Generales',
    type: 'academic',
    polygon: [[600, 75], [665, 75], [665, 120], [600, 120]],
    height: 11,
    color: '#b0bec5',
    roofColor: '#78909c',
  },

  // ----------------------------------------------------------
  // 7. PERÍMETRO NORTE (AV. JESÚS DE NAZARETH & PUERTA 4)
  // Edificios rojos y Rectorado
  // ----------------------------------------------------------
  {
    id: 'rectorado-unt',
    name: 'Rectorado y Administración Central UNT',
    category: 'Gobierno Universitario',
    type: 'admin',
    polygon: [[340, 360], [420, 360], [420, 410], [340, 410]],
    height: 18,
    color: '#c0392b',
    roofColor: '#962d22',
  },
  {
    id: 'perimetro-norte-1',
    name: 'Pabellón Perimetral Norte 1',
    category: 'Servicios Administrativos',
    type: 'admin',
    polygon: [[285, 420], [340, 420], [340, 445], [285, 445]],
    height: 9,
    color: '#c0392b',
    roofColor: '#962d22',
  },
  {
    id: 'perimetro-norte-2',
    name: 'Pabellón Perimetral Norte 2',
    category: 'Servicios Administrativos',
    type: 'admin',
    polygon: [[350, 420], [405, 420], [405, 445], [350, 445]],
    height: 9,
    color: '#c0392b',
    roofColor: '#962d22',
  },
  {
    id: 'perimetro-norte-3',
    name: 'Pabellón Perimetral Norte 3',
    category: 'Servicios Administrativos',
    type: 'admin',
    polygon: [[415, 420], [470, 420], [470, 445], [415, 445]],
    height: 9,
    color: '#c0392b',
    roofColor: '#962d22',
  },
  {
    id: 'puerta-4-nazareth',
    name: 'Puerta 4 - Acceso Av. Jesús de Nazareth',
    category: 'Control de Ingreso Norte',
    type: 'service',
    polygon: [[485, 425], [540, 425], [540, 448], [485, 448]],
    height: 8,
    color: '#7f8c8d',
    roofColor: '#5d6d7e',
  },
];

// ============================================================
// ROTONDA / PLAZA CENTRAL (WHEEL DE 8 RAYOS DEL PLANO CAD)
// ============================================================
export const rotonda = {
  id: 'rotonda-unt',
  name: 'Plaza de la Integración (La Rotonda)',
  center: [520, 175],
  outerRadius: 32,
  innerRadius: 12,
  hubRadius: 5.5,
  spokes: 8,
};

// ============================================================
// ZONAS DE ESTACIONAMIENTO (RAYAS DIAGONALES AMARILLAS EN CAD)
// ============================================================
export const parkingLots = [
  // Estacionamiento junto al estadio
  {
    id: 'estacionamiento-estadio',
    name: 'Estacionamiento Estadio',
    center: [215, 115],
    width: 20,
    depth: 60,
    angleDeg: 0,
    polygon: [[205, 85], [225, 85], [225, 145], [205, 145]],
  },
  // Estacionamiento Sur (Económicas)
  {
    id: 'estacionamiento-economicas',
    name: 'Estacionamiento Ciencias Económicas',
    polygon: [[525, 95], [550, 95], [550, 145], [525, 145]],
  },
];

// ============================================================
// ZONAS VERDES Y PARQUES DEL CAMPUS
// ============================================================
export const greenAreas = [
  // Gran área verde que rodea el estadio en ángulo
  {
    id: 'parque-estadio-sw',
    name: 'Área Verde Perimetral del Estadio',
    type: 'park',
    polygon: [[20, 20], [195, 20], [195, 60], [90, 60], [90, 110], [20, 110]],
  },
  // Parque de Materiales (Centro del campus, frondoso)
  {
    id: 'parque-materiales',
    name: 'Parque de Materiales UNT',
    type: 'park',
    polygon: [[290, 218], [350, 218], [350, 240], [290, 240]],
  },
  // Parque de Derecho (Alrededor de la Rotonda)
  {
    id: 'parque-derecho',
    name: 'Parque de Derecho y Ciencias Políticas',
    type: 'park',
    polygon: [[525, 210], [550, 210], [550, 260], [525, 260]],
  },
  // Jardín Central Norte (Frente a Rectorado)
  {
    id: 'jardin-rectorado',
    name: 'Jardín Frontal de Rectorado',
    type: 'garden',
    polygon: [[340, 412], [420, 412], [420, 428], [340, 428]],
  },
  // Jardín Este (Alrededor del edificio octogonal)
  {
    id: 'jardin-octogonal',
    name: 'Jardín de Ciencias Biológicas',
    type: 'garden',
    polygon: [[615, 135], [670, 135], [670, 160], [615, 160]],
  },
  // Jardines longitudinales Av. Juan Pablo II
  {
    id: 'jardin-juan-pablo',
    name: 'Banda Verde Av. Juan Pablo II',
    type: 'lawn',
    polygon: [[200, 25], [670, 25], [670, 40], [200, 40]],
  },
];

// ============================================================
// RED DE CAMINOS Y VÍAS (LÍNEAS AMARILLAS EXACTAS DEL CAD)
// ============================================================
export const paths = [
  // 1. Av. Juan Pablo II (Avenida Sur doble vía con berma)
  {
    id: 'av-juan-pablo-sur',
    name: 'Av. Juan Pablo II',
    points: [[15, 18], [150, 18], [300, 18], [500, 18], [690, 18]],
    width: 14,
  },
  // 2. Av. Jesús de Nazareth (Avenida Norte)
  {
    id: 'av-jesus-nazareth',
    name: 'Av. Jesús de Nazareth',
    points: [[25, 450], [200, 450], [400, 450], [600, 450], [695, 450]],
    width: 12,
  },
  // 3. Av. América Oeste / Antenor Orrego (Avenida Oeste con Óvalo)
  {
    id: 'av-america-oeste',
    name: 'Av. América Oeste / Antenor Orrego',
    points: [[16, 25], [16, 120], [18, 250], [22, 380], [26, 450]],
    width: 12,
  },
  // 4. Camino curvo diagonal que bordea CEE Narváez hacia el centro
  {
    id: 'camino-diagonal-nw',
    name: 'Camino Curvo Acceso NW - Centro',
    points: [
      [110, 420],
      [165, 370],
      [185, 310],
      [205, 255],
      [245, 235],
      [290, 235],
    ],
    width: 7,
  },
  // 5. Vía perimetral del estadio en ángulo
  {
    id: 'camino-perimetro-estadio',
    name: 'Paseo Perimetral del Estadio',
    points: [
      [55, 155],
      [85, 195],
      [135, 215],
      [195, 185],
      [215, 125],
      [185, 65],
      [125, 50],
      [65, 85],
      [55, 155],
    ],
    width: 6,
  },
  // 6. Eje Central Norte-Sur (De Puerta 4 a Av. Juan Pablo II)
  {
    id: 'eje-central-ns',
    name: 'Eje Peatonal Central Norte-Sur',
    points: [[430, 450], [430, 360], [430, 245], [430, 140], [430, 20]],
    width: 8,
  },
  // 7. Eje Transversal Central (De la Pirámide a la Rotonda)
  {
    id: 'eje-transversal-centro',
    name: 'Eje Transversal Central',
    points: [[290, 235], [350, 235], [430, 235], [520, 235], [640, 235]],
    width: 8,
  },
  // 8. Paseo del Auditorio a Medicina y Farmacia
  {
    id: 'paseo-salud',
    name: 'Paseo de Ciencias Médicas',
    points: [[460, 235], [460, 140], [520, 140], [520, 90]],
    width: 6,
  },
  // 9. Paseo Este (Hacia edificio octogonal y laboratorios)
  {
    id: 'paseo-este-octogonal',
    name: 'Paseo de Ciencias Biológicas',
    points: [[520, 175], [580, 175], [642, 175], [685, 175]],
    width: 7,
  },
  // 10. Paseo Norte de Ingeniería a Rectorado
  {
    id: 'paseo-ingenieria-rectorado',
    name: 'Paseo de Facultades de Ingeniería',
    points: [[290, 305], [350, 305], [430, 305], [530, 305]],
    width: 6,
  },
];

// ============================================================
// ÁRBOLES 3D (DISTRIBUIDOS SEGÚN EL PLANO CAD Y VISTA SATELITAL)
// ============================================================
export const trees = generateTrees();

export interface Tree3DData {
  id: string;
  x: number;
  z: number;
  type: string;
  height: number;
}

function generateTrees(): Tree3DData[] {
  const treeList: Tree3DData[] = [];
  let id = 0;

  function addCluster(x1: number, z1: number, x2: number, z2: number, count: number, type: string = 'medium') {
    for (let i = 0; i < count; i++) {
      treeList.push({
        id: `tree-${id++}`,
        x: x1 + Math.random() * (x2 - x1),
        z: z1 + Math.random() * (z2 - z1),
        type,
        height:
          type === 'small'
            ? 3.5 + Math.random() * 2
            : type === 'large'
            ? 8.5 + Math.random() * 3
            : type === 'palm'
            ? 7.5 + Math.random() * 2
            : 5.5 + Math.random() * 2,
      });
    }
  }

  // Zona boscosa del Estadio (Sur y Suroeste)
  addCluster(22, 22, 110, 60, 18, 'large');
  addCluster(22, 60, 65, 130, 12, 'large');

  // Parque de Materiales (Zona central densa)
  addCluster(295, 220, 345, 238, 14, 'large');
  addCluster(295, 220, 345, 238, 8, 'medium');

  // Alrededor de la Rotonda
  addCluster(490, 145, 515, 170, 8, 'palm');
  addCluster(525, 145, 550, 170, 8, 'palm');

  // Jardín Frontal de Rectorado
  addCluster(345, 414, 415, 426, 12, 'palm');

  // Jardín Este (Biológicas)
  addCluster(620, 140, 665, 158, 10, 'medium');

  // Palmeras alineadas en el Eje Central Norte-Sur
  for (let z = 35; z < 440; z += 22) {
    treeList.push({
      id: `tree-${id++}`,
      x: 424 + (Math.random() - 0.5) * 2,
      z,
      type: 'palm',
      height: 7.5 + Math.random() * 1.5,
    });
    treeList.push({
      id: `tree-${id++}`,
      x: 436 + (Math.random() - 0.5) * 2,
      z,
      type: 'palm',
      height: 7.5 + Math.random() * 1.5,
    });
  }

  // Palmeras a lo largo de Av. Juan Pablo II
  for (let x = 205; x < 670; x += 30) {
    treeList.push({
      id: `tree-${id++}`,
      x,
      z: 32 + (Math.random() - 0.5) * 2,
      type: 'palm',
      height: 8.0 + Math.random() * 1.5,
    });
  }

  return treeList;
}

// ============================================================
// ETIQUETAS 3D FLOTANTES (CENTROIDES CALCULADOS CON PRECISIÓN)
// ============================================================
export const labels = [
  ...buildings
    .filter(
      b =>
        !b.id.includes('narvaez') &&
        !b.id.includes('conector') &&
        !b.id.startsWith('pabellon-aulas-nw') &&
        !b.id.startsWith('talleres-nw') &&
        !b.name.includes('Narváez') &&
        !b.name.includes('CEE')
    )
    .map((b) => {
      let cx = 0, cz = 0;
      if (b.isOctagon && b.center) {
        cx = b.center[0];
        cz = b.center[1];
      } else if (b.polygon && b.polygon.length > 0) {
        cx = b.polygon.reduce((sum, p) => sum + p[0], 0) / b.polygon.length;
        cz = b.polygon.reduce((sum, p) => sum + p[1], 0) / b.polygon.length;
      }
      return {
        id: b.id,
        name: b.name,
        category: b.category,
        type: b.type,
        x: cx,
        z: cz,
        y: b.height + 3.5,
      };
    }),
  // Etiquetas del complejo deportivo y la rotonda
  {
    id: 'label-estadio',
    name: sportsComplex.stadium.name,
    category: 'Estadio y Atletismo',
    type: 'sports',
    x: sportsComplex.stadium.center[0],
    z: sportsComplex.stadium.center[1],
    y: 12,
  },
  {
    id: 'label-rotonda',
    name: rotonda.name,
    category: 'Plaza Monumental',
    type: 'service',
    x: rotonda.center[0],
    z: rotonda.center[1],
    y: 8,
  },
];

// ============================================================
// MAPEO BIDIRECCIONAL CON LAS INSTALACIONES LÓGICAS DE NEXO UNT
// ============================================================
export const FACILITY_3D_MAPPING: Record<string, string> = {
  'pabellon-aulas-nw-1': 'ED-01',
  'pabellon-aulas-nw-2': 'ED-01',
  'talleres-nw': 'ED-02',
  'biblioteca-central': 'ED-03',
  'rectorado': 'ED-04',
  'ciencias-economicas': 'ED-05',
};

export const NEXO_FACILITY_TO_3D: Record<string, string> = {
  'ED-01': 'pabellon-aulas-nw-1',
  'ED-02': 'talleres-nw',
  'ED-03': 'biblioteca-central',
  'ED-04': 'rectorado',
  'ED-05': 'ciencias-economicas',
};

