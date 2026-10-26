export interface MaintenanceRecord {
  id: string;
  connection: string; // Присоединение
  deviceName: string; // Наименование устройства
  lastMaintenanceType: string; // Вид последнего ТО
  lastMaintenanceDate: string; // Дата последнего обслуживания
  includedInPlan: boolean; // Включен в план на текущего года
  actualMaintenanceType: string; // Фактическое выполнение - вид
  actualMaintenanceDate: string; // Фактическое выполнение - дата
  plannedMonth: number; // Запланированный месяц (1-12)
  plannedYear: number; // Запланированный год
}

export type MarkerType = 'completed' | 'overdue' | 'plannedCurrentMonth' | 'plannedNextMonth' | 'none';

export interface MaintenanceType {
  code: string;
  name: string;
}

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  { code: 'Н', name: 'Наладка' },
  { code: 'К1', name: 'Первый профилактический контроль' },
  { code: 'К', name: 'Профилактический контроль' },
  { code: 'В', name: 'Профилактическое восстановление' },
  { code: 'П', name: 'Техническое обслуживание для продления срока службы' },
  { code: 'О', name: 'Опробование' },
  { code: 'Т', name: 'Тестовый контроль' },
  { code: 'ОСМ', name: 'Технический осмотр' },
  { code: 'ТК', name: 'Технический контроль' },
];

export const getMaintenanceLabel = (code: string): string => {
  const found = MAINTENANCE_TYPES.find(t => t.code === code);
  return found ? found.name : code;
};
