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
