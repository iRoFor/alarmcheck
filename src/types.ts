export interface Oscillogram {
  id: string;
  name: string;
  fileName: string; // имя файла в папке "Осциллограммы" (относительная ссылка)
  type: string;
}

export interface OutageEvent {
  id: string;
  num?: number;              // номер события (присваивается при импорте/добавлении)
  date: string;            // "дд.мм.гг чч:мм" — дата и время отключения (год из 2 цифр)
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
  'cause', 'ompCalc', 'ompReal', 'analysis',
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

// ---- Нормализация года: "гг" -> "20гг" (в т.ч. "19гг" для старых данных) ----
export function normalizeYear(yyOrYYYY: string): number | null {
  const t = yyOrYYYY.trim();
  if (/^\d{4}$/.test(t)) {
    const y = +t;
    return y >= 1900 && y <= 2999 ? y : null;
  }
  if (/^\d{2}$/.test(t)) {
    const yy = +t;
    // 95..99 -> 19xx, иначе 20xx
    return yy >= 95 ? 1900 + yy : 2000 + yy;
  }
  if (/^\d{3}$/.test(t)) {
    // случай с лишним символом: "202" -> 2002? надёжнее не угадывать
    return null;
  }
  return null;
}

// ---- Нормализация разделителей даты: "дд/мм/гг" -> "дд.мм.гг" ----
// При импорте из Excel дата может приходить в формате "дд/мм/гг чч:мм" — приводим к "дд.мм.гг чч:мм"
export function normalizeDateSeparators(s: string): string {
  return s.replace(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/g, '$1.$2.$3');
}

// ---- Парсинг даты "дд.мм.гг чч:мм" (также принимаем полный год "гггг" и разделители "/" или "-") ----
export function parseDateStr(raw: string): Date | null {
  const s = normalizeDateSeparators(raw);
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const year = normalizeYear(m[3]);
  if (year == null) return null;
  const d = new Date(year, +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0));
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${p(d.getFullYear() % 100)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function nowDateStr(): string {
  return formatDateStr(new Date());
}

// ---- Полный год события (из даты "дд.мм.гг чч:мм", поддерживается "гггг" и разделители "/" или "-") ----
export function getYear(raw: string): number | null {
  const s = normalizeDateSeparators(raw);
  // первый год, идущий сразу после "дд.мм." (2..4 цифры) — корректно для дд.мм.гг
  const m = s.match(/(?:^|[^\d:])(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?!\d)/);
  if (!m) return null;
  return normalizeYear(m[3]);
}
