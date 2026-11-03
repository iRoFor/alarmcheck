import * as XLSX from 'xlsx';
import { OutageEvent, EMPTY_EVENT, formatDateStr, parseDateStr } from './types';

// Маппинг заголовков столбцов Excel -> ключи события.
// Поддерживаются и старые столбцы "Аварийные параметры..." (игнорируются при импорте с 2020 г.)
const HEADER_MAP: Record<string, keyof OutageEvent> = {
  'дата отключения': 'date',
  'дата': 'date',
  'время': 'date',
  'линия': 'line',
  'класс напряжения': 'voltage',
  'класс напряжения, кв': 'voltage',
  'напряжение': 'voltage',
  'работа рза на пс №1': 'rzaPs1',
  'работа рза на пс 1': 'rzaPs1',
  'работа рза на пс №2': 'rzaPs2',
  'работа рза на пс 2': 'rzaPs2',
  'причина повреждения': 'cause',
  'причина': 'cause',
  'омп расчетное': 'ompCalc',
  'омп расчётное': 'ompCalc',
  'омп реальное': 'ompReal',
  'анализ работы': 'analysis',
  'анализ': 'analysis',
  'работа рза на смежных пс': 'rzaAdjacent',
  'примечания': 'notes',
  'примечание': 'notes',
  'отказ': 'refusal',
  'осциллограммы': 'oscillograms',
};

export interface ImportColumn {
  excelHeader: string;   // заголовок как в файле
  targetKey: keyof OutageEvent | null; // куда маппится (null — не импортировать)
  include: boolean;      // выбран ли к импорту
  isNew: boolean;        // новый столбец (не распознан)
}

function normalize(h: string): string {
  return h.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Значение ячейки -> строка для поля события
function cellToString(v: any): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) return formatDateStr(v);
  if (typeof v === 'number') {
    // дата в excel как число (serial)
    const d = XLSX.SSF.parse_date_code(v);
    if (d && d.y >= 1990 && d.y <= 2100) {
      return formatDateStr(new Date(d.y, d.m - 1, d.d, d.h ?? 0, d.mi ?? 0));
    }
    return String(v);
  }
  return String(v).trim();
}

function guessTarget(header: string): keyof OutageEvent | null {
  const n = normalize(header);
  if (HEADER_MAP[n]) return HEADER_MAP[n];
  // "аварийные параметры на пс №1/2" — устаревшие столбцы
  if (n.includes('аварийные параметры')) return null;
  // нечеткий поиск
  for (const [k, v] of Object.entries(HEADER_MAP)) {
    if (n.includes(k)) return v;
  }
  return null;
}

export interface ParsedSheet {
  sheetName: string;
  year: number | null;
  columns: ImportColumn[];
  rows: OutageEvent[][]; // подготовленные события (по одному листу), id пустой до подтверждения
}

export function parseWorkbook(data: ArrayBuffer): ParsedSheet[] {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const sheets: ParsedSheet[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    if (!aoa.length) continue;

    // найти строку заголовков (первая строка, где есть известные названия)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(aoa.length, 5); i++) {
      const row = aoa[i].map((c) => normalize(String(c)));
      if (row.some((c) => c.includes('дата') || c.includes('линия'))) { headerIdx = i; break; }
    }
    const headers = aoa[headerIdx].map((h) => String(h ?? '').trim());
    if (headers.every((h) => !h)) continue;

    const columns: ImportColumn[] = headers.map((h) => {
      const target = guessTarget(h);
      return {
        excelHeader: h || '(без названия)',
        targetKey: target,
        include: target !== null,
        isNew: target === null,
      };
    });

    // год из названия листа (например "2023" или "Отключения 2021")
    const ym = sheetName.match(/(19|20)\d{2}/);
    const year = ym ? parseInt(ym[0], 10) : null;

    const events: OutageEvent[] = [];
    for (let r = headerIdx + 1; r < aoa.length; r++) {
      const rowArr = aoa[r];
      if (!rowArr || rowArr.every((c) => String(c ?? '').trim() === '')) continue;

      const ev: OutageEvent = { ...EMPTY_EVENT, oscillograms: [], id: crypto.randomUUID() };
      let hasData = false;
      columns.forEach((col, ci) => {
        if (!col.targetKey || col.targetKey === 'oscillograms') return;
        const raw = rowArr[ci];
        const s = cellToString(raw);
        if (!s) return;
        hasData = true;
        if (col.targetKey === 'refusal') {
          ev.refusal = /^(да|отказ|x|\+|1|true)$/i.test(s);
        } else if (col.targetKey === 'voltage') {
          const num = s.replace(/[^0-9]/g, '');
          ev.voltage = num || s;
        } else {
          (ev as any)[col.targetKey] = s;
        }
      });

      // если в дате нет года, а лист задан годом — подставить год листа
      if (ev.date && year) {
        const m = ev.date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})\b/); // дд.мм.гг
        if (m) ev.date = ev.date.replace(m[0], `${m[1]}.${m[2]}.${year}`);
        if (!parseDateStr(ev.date)) {
          // формат мог быть "дд.мм чч:мм"
          const m2 = ev.date.match(/^(\d{1,2})\.(\d{1,2})(\s.*)?$/);
          if (m2) ev.date = `${m2[1]}.${m2[2]}.${year}${m2[3] ?? ''}`;
        }
      }

      if (hasData) events.push(ev);
    }

    sheets.push({ sheetName, year, columns, rows: [events] });
  }
  return sheets;
}


// ---- Экспорт ----
const EXPORT_HEADERS = [
  'Дата отключения', 'Линия', 'Класс напряжения, кВ',
  'Работа РЗА на ПС №1', 'Работа РЗА на ПС №2', 'Причина повреждения',
  'ОМП расчетное', 'ОМП реальное', 'Анализ работы',
  'Работа РЗА на смежных ПС', 'Примечания', 'Отказ', 'Осциллограммы',
];

export function exportToExcel(events: OutageEvent[]) {
  const byYear = new Map<number, OutageEvent[]>();
  for (const e of events) {
    const d = parseDateStr(e.date);
    const y = d ? d.getFullYear() : 0;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(e);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);

  const wb = XLSX.utils.book_new();
  for (const y of years) {
    const rows = byYear.get(y)!
      .sort((a, b) => (parseDateStr(a.date)?.getTime() ?? 0) - (parseDateStr(b.date)?.getTime() ?? 0))
      .map((e) => [
        e.date, e.line, e.voltage ? `${e.voltage}` : '', e.rzaPs1, e.rzaPs2, e.cause,
        e.ompCalc, e.ompReal, e.analysis, e.rzaAdjacent, e.notes,
        e.refusal ? 'Отказ' : '',
        e.oscillograms.map((o) => o.name).join(', '),
      ]);
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
    ws['!cols'] = EXPORT_HEADERS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, y === 0 ? 'Без даты' : String(y));
  }
  if (years.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([EXPORT_HEADERS]), 'События');
  }
  XLSX.writeFile(wb, 'Программа_отключений.xlsx');
}
