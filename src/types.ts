export interface Oscillogram {
  id: string;
  name: string;
  dataUrl: string; // base64 data URL
  type: string;
}

export interface OutageEvent {
  id: string;
  date: string;            // "дд.мм.гггг чч:мм" — дата и время отключения
  line: string;            // "ПС №1 - ПС №2"
  voltage: string;         // "330" | "110" | "35" | ...
  rzaPs1: string;          // работа РЗА на ПС №1 (+ успешность АПВ/РПВ)
  rzaPs2: string;          // работа РЗА на ПС №2
  cause: string;           // причина повреждения
  ompCalc: string;         // ОМП расчетное (РАС/ФИП/МП терминалы + модели)
  ompReal: string;         // ОМП реальное (расстояние с привязкой к ПС)
  analysis: string;        // анализ работы (П-2, У/НУ АПВ)
  rzaAdjacent: string;     // работа РЗА на смежных ПС
  notes: string;           // примечания
  refusal: boolean;        // метка "Отказ"
  oscillograms: Oscillogram[];
}

export const EMPTY_EVENT: Omit<OutageEvent, 'id'> = {
  date: '',
  line: '',
  voltage: '',
  rzaPs1: '',
  rzaPs2: '',
  cause: '',
  ompCalc: '',
  ompReal: '',
  analysis: '',
  rzaAdjacent: '',
  notes: '',
  refusal: false,
  oscillograms: [],
};

export const VOLTAGE_OPTIONS = ['330', '110', '35'];

// Поля, обязательные для того, чтобы событие считалось "оформленным"
export const REQUIRED_FIELDS: (keyof OutageEvent)[] = [
  'date', 'line', 'voltage', 'rzaPs1', 'rzaPs2',
  'cause', 'ompCalc', 'ompReal', 'analysis', 'rzaAdjacent', 'notes',
];

export function isIncomplete(e: OutageEvent): boolean {
  return REQUIRED_FIELDS.some((f) => {
    const v = e[f];
    return typeof v === 'string' ? v.trim() === '' : !v;
  });
}

export interface ColumnDef {
  key: keyof OutageEvent;
  title: string;
  width?: number;
}

export const COLUMNS: ColumnDef[] = [
  { key: 'date', title: 'Дата отключения', width: 130 },
  { key: 'line', title: 'Линия', width: 170 },
  { key: 'voltage', title: 'Класс напряжения, кВ', width: 90 },
  { key: 'rzaPs1', title: 'Работа РЗА на ПС №1', width: 180 },
  { key: 'rzaPs2', title: 'Работа РЗА на ПС №2', width: 180 },
  { key: 'cause', title: 'Причина повреждения', width: 180 },
  { key: 'ompCalc', title: 'ОМП расчетное', width: 160 },
  { key: 'ompReal', title: 'ОМП реальное', width: 140 },
  { key: 'analysis', title: 'Анализ работы', width: 130 },
  { key: 'rzaAdjacent', title: 'Работа РЗА на смежных ПС', width: 180 },
  { key: 'notes', title: 'Примечания', width: 180 },
  { key: 'oscillograms', title: 'Осциллограммы', width: 120 },
];

// ---- Парсинг даты "дд.мм.гггг чч:мм" ----
export function parseDateStr(s: string): Date | null {
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0));
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function nowDateStr(): string {
  return formatDateStr(new Date());
}
