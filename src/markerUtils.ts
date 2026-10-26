import { MaintenanceRecord, MarkerType } from './types';

export const getMarkerType = (record: MaintenanceRecord): MarkerType => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  let nextMonth = currentMonth + 1;
  let nextMonthYear = currentYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextMonthYear = currentYear + 1;
  }

  // 1. Выполненные работы в текущем году (зелёный)
  if (record.actualMaintenanceDate) {
    const actualDate = new Date(record.actualMaintenanceDate);
    if (actualDate.getFullYear() === currentYear) {
      return 'completed';
    }
  }

  // 2. Невыполненные в срок (красный)
  if (record.includedInPlan && record.plannedMonth > 0 && record.plannedYear === currentYear) {
    // Если запланированный месяц уже прошёл и работа не выполнена
    if (record.plannedMonth < currentMonth && !record.actualMaintenanceDate) {
      return 'overdue';
    }
    // Если работа была запланирована ранее в этом году, но не выполнена
    if (record.plannedMonth < currentMonth && record.actualMaintenanceDate) {
      const actualDate = new Date(record.actualMaintenanceDate);
      if (actualDate.getFullYear() !== currentYear) {
        return 'overdue';
      }
    }
  }

  // 3. Запланированные на следующий месяц (синий)
  if (record.includedInPlan && record.plannedMonth === nextMonth && record.plannedYear === nextMonthYear) {
    return 'plannedNextMonth';
  }

  // 4. Запланированные на текущий месяц (жёлтый/оранжевый)
  if (record.includedInPlan && record.plannedMonth === currentMonth && record.plannedYear === currentYear) {
    return 'plannedCurrentMonth';
  }

  return 'none';
};

export const getMarkerColor = (marker: MarkerType): string => {
  switch (marker) {
    case 'completed': return 'bg-green-200 border-green-500';
    case 'overdue': return 'bg-red-200 border-red-500';
    case 'plannedCurrentMonth': return 'bg-yellow-200 border-yellow-500';
    case 'plannedNextMonth': return 'bg-blue-200 border-blue-500';
    default: return '';
  }
};

export const getMarkerLabel = (marker: MarkerType): string => {
  switch (marker) {
    case 'completed': return 'Выполнено в текущем году';
    case 'overdue': return 'Невыполнено в срок';
    case 'plannedCurrentMonth': return 'Запланировано на текущий месяц';
    case 'plannedNextMonth': return 'Запланировано на следующий месяц';
    default: return '';
  }
};

export const getMarkerDotColor = (marker: MarkerType): string => {
  switch (marker) {
    case 'completed': return 'bg-green-500';
    case 'overdue': return 'bg-red-500';
    case 'plannedCurrentMonth': return 'bg-yellow-500';
    case 'plannedNextMonth': return 'bg-blue-500';
    default: return 'bg-gray-300';
  }
};
