// ============================================================
// Effects / presets
// IDs 0x00–0x1B (28 cores) — confirmar do log ADB
// ============================================================
const EFFECT_COUNT = 28;
const EFFECTS = [
  { id: 0x00, name: 'Branco',        color: 'rgb(255, 255, 255)' },
  { id: 0x01, name: 'Vermelho',      color: 'rgb(253, 0, 0)'     },
  { id: 0x02, name: 'Laranja',       color: 'rgb(255, 100, 0)'   },
  { id: 0x03, name: 'Âmbar',         color: 'rgb(255, 150, 0)'   },
  { id: 0x04, name: 'Amarelo Ouro',  color: 'rgb(254, 200, 0)'   },
  { id: 0x05, name: 'Amarelo',       color: 'rgb(255, 250, 0)'   },
  { id: 0x06, name: 'Lima Amarelo',  color: 'rgb(224, 254, 25)'  },
  { id: 0x07, name: 'Lima',          color: 'rgb(171, 255, 0)'   },
  { id: 0x08, name: 'Lima Verde',    color: 'rgb(30, 255, 0)'    },
  { id: 0x09, name: 'Verde Claro',   color: 'rgb(0, 255, 40)'    },
  { id: 0x0A, name: 'Verde',         color: 'rgb(0, 255, 0)'     },
  { id: 0x0B, name: 'Menta',         color: 'rgb(0, 255, 100)'   },
  { id: 0x0C, name: 'Verde Ciano',   color: 'rgb(0, 255, 200)'   },
  { id: 0x0D, name: 'Ciano',         color: 'rgb(0, 255, 255)'   },
  { id: 0x0E, name: 'Azul Céu',      color: 'rgb(0, 180, 255)'   },
  { id: 0x0F, name: 'Azul Claro',    color: 'rgb(0, 120, 255)'   },
  { id: 0x10, name: 'Azul',          color: 'rgb(0, 70, 255)'    },
  { id: 0x11, name: 'Azul Médio',    color: 'rgb(0, 30, 255)'    },
  { id: 0x12, name: 'Azul Puro',     color: 'rgb(0, 0, 255)'     },
  { id: 0x13, name: 'Azul Escuro',   color: 'rgb(0, 0, 235)'     },
  { id: 0x14, name: 'Azul Profundo', color: 'rgb(0, 0, 210)'     },
  { id: 0x15, name: 'Roxo',          color: 'rgb(120, 0, 255)'   },
  { id: 0x16, name: 'Roxo Médio',    color: 'rgb(160, 0, 255)'   },
  { id: 0x17, name: 'Violeta',       color: 'rgb(200, 0, 255)'   },
  { id: 0x18, name: 'Púrpura',       color: 'rgb(240, 0, 240)'   },
  { id: 0x19, name: 'Magenta',       color: 'rgb(255, 0, 180)'   },
  { id: 0x1A, name: 'Rosa Quente',   color: 'rgb(255, 0, 80)'    },
  { id: 0x1B, name: 'Rosa Intenso',  color: 'rgb(255, 0, 40)'    },
];
