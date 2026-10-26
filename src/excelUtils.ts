import * as XLSX from 'xlsx';
import { MaintenanceRecord } from './types';

export const exportToExcel = (records: MaintenanceRecord[], filename: string = 'РЗА_план.xlsx') => {
  const data = records.map((r, idx) => ({
    '№': idx + 1,
    'Присоединение': r.connection,
    'Наименование устройства': r.deviceName,
    'Вид последнего ТО': r.lastMaintenanceType,
    'Дата последнего обслуживания': r.lastMaintenanceDate,
    'Включен в план на текущий год': r.includedInPlan ? 'Да' : 'Нет',
    'Фактический вид обслуживания': r.actualMaintenanceType,
    'Фактическая дата выполнения': r.actualMaintenanceDate,
    'Запланированный месяц': r.plannedMonth,
    'Запланированный год': r.plannedYear,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'План РЗА');

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 30 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.writeFile(wb, filename);
};

export const importFromExcel = (file: File): Promise<MaintenanceRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        const records: MaintenanceRecord[] = json.map((row, idx) => ({
          id: `imported-${Date.now()}-${idx}`,
          connection: String(row['Присоединение'] || ''),
          deviceName: String(row['Наименование устройства'] || ''),
          lastMaintenanceType: String(row['Вид последнего ТО'] || ''),
          lastMaintenanceDate: String(row['Дата последнего обслуживания'] || ''),
          includedInPlan: String(row['Включен в план на текущий год'] || '').toLowerCase() === 'да' ||
                          String(row['Включен в план на текущий год'] || '') === 'true' ||
                          row['Включен в план на текущий год'] === true,
          actualMaintenanceType: String(row['Фактический вид обслуживания'] || ''),
          actualMaintenanceDate: String(row['Фактическая дата выполнения'] || ''),
          plannedMonth: Number(row['Запланированный месяц'] || 0),
          plannedYear: Number(row['Запланированный год'] || new Date().getFullYear()),
        }));

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
