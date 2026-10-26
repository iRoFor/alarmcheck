import { useState, useRef, useCallback } from 'react';
import { MaintenanceRecord, MarkerType } from './types';
import { exportToExcel, importFromExcel } from './excelUtils';
import { getMarkerType, getMarkerColor, getMarkerLabel, getMarkerDotColor } from './markerUtils';
import { sampleData } from './sampleData';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Edit3,
  Trash2,
  Filter,
  X,
  Check,
  AlertTriangle,
  Calendar,
  ChevronDown,
} from 'lucide-react';

function App() {
  const [records, setRecords] = useState<MaintenanceRecord[]>(() => {
    const saved = localStorage.getItem('rza_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return sampleData;
      }
    }
    return sampleData;
  });

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [filterMarker, setFilterMarker] = useState<MarkerType | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const saveRecords = useCallback((newRecords: MaintenanceRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('rza_records', JSON.stringify(newRecords));
  }, []);

  const handleExport = () => {
    exportToExcel(records, `РЗА_план_${currentYear}.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromExcel(file);
      saveRecords([...records, ...imported]);
      setImportStatus(`Успешно импортировано ${imported.length} записей`);
      setTimeout(() => setImportStatus(''), 3000);
    } catch (err) {
      setImportStatus('Ошибка при импорте файла');
      setTimeout(() => setImportStatus(''), 3000);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm('Удалить запись?')) {
      saveRecords(records.filter(r => r.id !== id));
    }
  };

  const handleSave = (record: MaintenanceRecord) => {
    if (editingRecord) {
      saveRecords(records.map(r => r.id === record.id ? record : r));
    } else {
      saveRecords([...records, { ...record, id: `rec-${Date.now()}` }]);
    }
    setShowForm(false);
    setEditingRecord(null);
  };

  const filteredRecords = records.filter(r => {
    if (filterMarker !== 'all' && getMarkerType(r) !== filterMarker) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        r.connection.toLowerCase().includes(search) ||
        r.deviceName.toLowerCase().includes(search) ||
        r.lastMaintenanceType.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const stats = {
    total: records.length,
    completed: records.filter(r => getMarkerType(r) === 'completed').length,
    overdue: records.filter(r => getMarkerType(r) === 'overdue').length,
    plannedCurrent: records.filter(r => getMarkerType(r) === 'plannedCurrentMonth').length,
    plannedNext: records.filter(r => getMarkerType(r) === 'plannedNextMonth').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FileSpreadsheet size={28} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Планирование и контроль РЗА</h1>
                <p className="text-blue-200 text-sm">Система управления обслуживанием устройств релейной защиты</p>
              </div>
            </div>
            <div className="text-right text-sm text-blue-200">
              <div>{monthNames[currentMonth - 1]} {currentYear}</div>
              <div className="text-xs">Всего записей: {records.length}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-gray-400">
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
            <div className="text-xs text-gray-500">Всего устройств</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-500">Выполнено</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-gray-500">Просрочено</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">{stats.plannedCurrent}</div>
            <div className="text-xs text-gray-500">План (тек. месяц)</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{stats.plannedNext}</div>
            <div className="text-xs text-gray-500">План (след. месяц)</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { setEditingRecord(null); setShowForm(true); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Добавить запись
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} /> Экспорт в Excel
            </button>

            <label className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
              <Upload size={16} /> Импорт из Excel
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            <div className="flex-1" />

            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterMarker}
                onChange={(e) => setFilterMarker(e.target.value as MarkerType | 'all')}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Все записи</option>
                <option value="completed">✅ Выполнено в текущем году</option>
                <option value="overdue">❌ Невыполнено в срок</option>
                <option value="plannedCurrentMonth">📅 План на текущий месяц</option>
                <option value="plannedNextMonth">📆 План на следующий месяц</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Поиск..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {importStatus && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              {importStatus}
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Обозначения (маркеры):</h3>
              <button onClick={() => setShowLegend(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-green-500"></span>
                <span className="text-sm text-gray-600">Выполнено в текущем году</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500"></span>
                <span className="text-sm text-gray-600">Невыполнено в срок</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-yellow-500"></span>
                <span className="text-sm text-gray-600">Запланировано на текущий месяц</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                <span className="text-sm text-gray-600">Запланировано на следующий месяц</span>
              </div>
            </div>
          </div>
        )}

        {!showLegend && (
          <button
            onClick={() => setShowLegend(true)}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <ChevronDown size={14} /> Показать обозначения
          </button>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-3 py-3 text-left font-medium w-8">№</th>
                  <th className="px-3 py-3 text-left font-medium min-w-[180px]">Присоединение</th>
                  <th className="px-3 py-3 text-left font-medium min-w-[200px]">Наименование устройства</th>
                  <th className="px-3 py-3 text-left font-medium">Вид последнего ТО</th>
                  <th className="px-3 py-3 text-left font-medium">Дата посл. ТО</th>
                  <th className="px-3 py-3 text-center font-medium">В плане</th>
                  <th className="px-3 py-3 text-left font-medium">Факт. вид обслуж.</th>
                  <th className="px-3 py-3 text-left font-medium">Факт. дата</th>
                  <th className="px-3 py-3 text-center font-medium">Статус</th>
                  <th className="px-3 py-3 text-center font-medium w-24">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-gray-400">
                      <FileSpreadsheet size={40} className="mx-auto mb-2 opacity-50" />
                      <p>Нет записей для отображения</p>
                      <p className="text-xs mt-1">Добавьте запись или импортируйте из Excel</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, idx) => {
                    const marker = getMarkerType(record);
                    const rowClass = getMarkerColor(marker);
                    return (
                      <tr
                        key={record.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${marker !== 'none' ? rowClass : ''}`}
                      >
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{record.connection}</td>
                        <td className="px-3 py-2 text-gray-700">{record.deviceName}</td>
                        <td className="px-3 py-2 text-gray-600">{record.lastMaintenanceType || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{record.lastMaintenanceDate || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {record.includedInPlan ? (
                            <Check size={16} className="mx-auto text-green-600" />
                          ) : (
                            <X size={16} className="mx-auto text-gray-400" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{record.actualMaintenanceType || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{record.actualMaintenanceDate || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {marker !== 'none' && (
                            <div className="flex items-center justify-center gap-1">
                              <span className={`w-3 h-3 rounded-full ${getMarkerDotColor(marker)}`}></span>
                              <span className="text-xs hidden lg:inline">{getMarkerLabel(marker)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setEditingRecord(record); setShowForm(true); }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Редактировать"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Данные сохраняются в браузере. Используйте экспорт/импорт для резервного копирования.
        </div>
      </main>

      {/* Modal Form */}
      {showForm && (
        <RecordForm
          record={editingRecord}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingRecord(null); }}
          currentYear={currentYear}
          monthNames={monthNames}
        />
      )}
    </div>
  );
}

// Form Component
interface RecordFormProps {
  record: MaintenanceRecord | null;
  onSave: (record: MaintenanceRecord) => void;
  onCancel: () => void;
  currentYear: number;
  monthNames: string[];
}

function RecordForm({ record, onSave, onCancel, currentYear, monthNames }: RecordFormProps) {
  const [form, setForm] = useState<MaintenanceRecord>(
    record || {
      id: '',
      connection: '',
      deviceName: '',
      lastMaintenanceType: '',
      lastMaintenanceDate: '',
      includedInPlan: true,
      actualMaintenanceType: '',
      actualMaintenanceDate: '',
      plannedMonth: new Date().getMonth() + 1,
      plannedYear: currentYear,
    }
  );

  const maintenanceTypes = [
    'Текущий осмотр',
    'Полная проверка',
    'Частичная проверка',
    'Техническое обслуживание',
    'Ремонт',
    'Испытание',
    'Наладка',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {record ? 'Редактирование записи' : 'Новая запись'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Присоединение *</label>
              <input
                type="text"
                required
                value={form.connection}
                onChange={(e) => setForm({ ...form, connection: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Например: ВЛ 110 кВ Подстанция Северная"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Наименование устройства *</label>
              <input
                type="text"
                required
                value={form.deviceName}
                onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Например: ДЗ-110 (панель ЭКРА-2000)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Вид последнего ТО</label>
              <select
                value={form.lastMaintenanceType}
                onChange={(e) => setForm({ ...form, lastMaintenanceType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Выберите вид...</option>
                {maintenanceTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата последнего ТО</label>
              <input
                type="date"
                value={form.lastMaintenanceDate}
                onChange={(e) => setForm({ ...form, lastMaintenanceDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="includedInPlan"
                checked={form.includedInPlan}
                onChange={(e) => setForm({ ...form, includedInPlan: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="includedInPlan" className="text-sm font-medium text-gray-700">
                Включен в план на {currentYear} год
              </label>
            </div>

            {form.includedInPlan && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Запланированный месяц</label>
                  <select
                    value={form.plannedMonth}
                    onChange={(e) => setForm({ ...form, plannedMonth: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>Не указан</option>
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Запланированный год</label>
                  <input
                    type="number"
                    value={form.plannedYear}
                    onChange={(e) => setForm({ ...form, plannedYear: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min={2020}
                    max={2030}
                  />
                </div>
              </>
            )}

            <div className="border-t pt-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar size={14} /> Фактическое выполнение
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фактический вид обслуживания</label>
              <select
                value={form.actualMaintenanceType}
                onChange={(e) => setForm({ ...form, actualMaintenanceType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Не выполнено</option>
                {maintenanceTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фактическая дата выполнения</label>
              <input
                type="date"
                value={form.actualMaintenanceDate}
                onChange={(e) => setForm({ ...form, actualMaintenanceDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {record ? 'Сохранить изменения' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
