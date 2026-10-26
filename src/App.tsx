import { useState, useRef, useCallback } from 'react';
import { MaintenanceRecord, MarkerType, MAINTENANCE_TYPES } from './types';
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
  Calendar,
  ChevronDown,
  ChevronUp,
  Save,
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
  const [activeMarkers, setActiveMarkers] = useState<MarkerType[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [importStatus, setImportStatus] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState(false);
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

  const toggleMarker = (marker: MarkerType) => {
    setActiveMarkers(prev =>
      prev.includes(marker) ? prev.filter(m => m !== marker) : [...prev, marker]
    );
  };

  const clearFilters = () => {
    setActiveMarkers([]);
    setSearchText('');
  };

  const handleExport = () => {
    exportToExcel(records, `РЗА_план_${currentYear}.xlsx`);
  };

  const handleDownloadApp = () => {
    // Определяем, работаем ли мы в режиме разработки
    const isDevMode = document.querySelector('script[src*="/@vite/client"]') !== null;
    
    if (isDevMode) {
      alert(
        '⚠️ Скачивание программы недоступно в режиме предпросмотра.\n\n' +
        'Программа уже работает прямо сейчас в браузере — вы можете пользоваться всеми функциями.\n\n' +
        'Для получения автономного HTML-файла, который можно открыть без интернета, ' +
        'необходимо сначала собрать production-версию проекта.'
      );
      return;
    }

    // Production-режим: весь код уже inline в HTML
    // Клонируем документ
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    
    // Очищаем #root, чтобы React мог инициализироваться заново
    const cloneRoot = clone.querySelector('#root');
    if (cloneRoot) cloneRoot.innerHTML = '';
    
    // Убираем атрибуты, мешающие работе с file:// протоколом
    let html = '<!DOCTYPE html>\n' + clone.outerHTML;
    html = html.replace(/\s+crossorigin/g, '');
    html = html.replace(/type="module"/g, 'defer');
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Планирование_РЗА.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromExcel(file);
      saveRecords([...records, ...imported]);
      setImportStatus(`Успешно импортировано ${imported.length} записей`);
      setTimeout(() => setImportStatus(''), 3000);
    } catch {
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
    const marker = getMarkerType(r);
    // Если выбраны фильтры по маркерам - показывать только совпадающие
    if (activeMarkers.length > 0 && !activeMarkers.includes(marker)) return false;
    // Поиск по тексту
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        r.connection.toLowerCase().includes(search) ||
        r.deviceName.toLowerCase().includes(search) ||
        r.lastMaintenanceType.toLowerCase().includes(search) ||
        r.actualMaintenanceType.toLowerCase().includes(search)
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

  const markerOptions: { type: MarkerType; label: string; color: string }[] = [
    { type: 'completed', label: 'Выполнено в текущем году', color: 'bg-green-500' },
    { type: 'overdue', label: 'Невыполнено в срок', color: 'bg-red-500' },
    { type: 'plannedCurrentMonth', label: 'План на текущий месяц', color: 'bg-yellow-500' },
    { type: 'plannedNextMonth', label: 'План на следующий месяц', color: 'bg-blue-500' },
  ];

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
            <div className="text-right text-sm text-blue-200 flex items-center gap-3">
              <div>
                <div>{monthNames[currentMonth - 1]} {currentYear}</div>
                <div className="text-xs">Всего записей: {records.length}</div>
              </div>
              <button
                onClick={() => setShowInstructions(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                title="Инструкция по установке"
              >
                📖 Инструкция
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Download hint banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-start gap-3">
          <Save size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-orange-800">💾 Как сохранить программу на компьютер:</p>
            <p className="text-orange-700 mt-0.5">
              Для получения автономного HTML-файла нужно собрать production-версию. 
              <button onClick={() => setShowInstructions(true)} className="underline font-semibold hover:text-orange-900 ml-1">
                Показать инструкцию →
              </button>
            </p>
            <p className="text-orange-600 mt-1 text-xs">
              ℹ️ Программа работает прямо сейчас — все функции доступны. Данные сохраняются в браузере.
            </p>
          </div>
        </div>

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

            <button
              onClick={handleDownloadApp}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              title="Скачать программу как HTML-файл для работы без интернета"
            >
              <Save size={16} /> Скачать программу
            </button>

            <div className="flex-1" />

            <input
              type="text"
              placeholder="Поиск..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Filter size={16} />
              Фильтры
              {activeMarkers.length > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeMarkers.length}
                </span>
              )}
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {importStatus && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              {importStatus}
            </div>
          )}

          {/* Multiple Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Фильтр по статусу (можно выбрать несколько):</h3>
                {activeMarkers.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <X size={12} /> Сбросить все
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {markerOptions.map(option => (
                  <button
                    key={option.type}
                    onClick={() => toggleMarker(option.type)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      activeMarkers.includes(option.type)
                        ? 'border-current bg-opacity-10 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    } ${
                      activeMarkers.includes(option.type) && option.type === 'completed' ? 'border-green-500 bg-green-50 text-green-700' : ''
                    } ${
                      activeMarkers.includes(option.type) && option.type === 'overdue' ? 'border-red-500 bg-red-50 text-red-700' : ''
                    } ${
                      activeMarkers.includes(option.type) && option.type === 'plannedCurrentMonth' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : ''
                    } ${
                      activeMarkers.includes(option.type) && option.type === 'plannedNextMonth' ? 'border-blue-500 bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${option.color} ${activeMarkers.includes(option.type) ? 'ring-2 ring-offset-1 ring-current' : ''}`}></span>
                    {option.label}
                    {activeMarkers.includes(option.type) && (
                      <Check size={14} className="ml-1" />
                    )}
                  </button>
                ))}
              </div>
              {activeMarkers.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Выбрано фильтров: {activeMarkers.length} | Показано записей: {filteredRecords.length} из {records.length}
                </p>
              )}
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
            <div className="flex flex-wrap gap-4 mb-3">
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
            <div className="border-t pt-2 mt-2">
              <h4 className="text-xs font-semibold text-gray-500 mb-1">Виды обслуживания:</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {MAINTENANCE_TYPES.map(t => (
                  <span key={t.code} className="text-xs text-gray-600">
                    <strong>{t.code}</strong> — {t.name}
                  </span>
                ))}
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
                  <th className="px-3 py-3 text-left font-medium">Вид посл. ТО</th>
                  <th className="px-3 py-3 text-left font-medium">Дата посл. ТО</th>
                  <th className="px-3 py-3 text-center font-medium">В плане</th>
                  <th className="px-3 py-3 text-left font-medium">Факт. вид</th>
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
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-xs">
                              {record.lastMaintenanceType || '—'}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{record.lastMaintenanceDate || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {record.includedInPlan ? (
                            <Check size={16} className="mx-auto text-green-600" />
                          ) : (
                            <X size={16} className="mx-auto text-gray-400" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {record.actualMaintenanceType ? (
                            <span className="font-mono font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-xs">
                              {record.actualMaintenanceType}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
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

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                📖 Инструкция: как получить автономный HTML-файл
              </h2>
              <button onClick={() => setShowInstructions(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm text-gray-700">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-800 mb-2">💡 Что это значит?</p>
                <p className="text-blue-700">
                  Сейчас программа работает в режиме предпросмотра. Чтобы получить файл, 
                  который можно открыть двойным кликом без интернета, нужно один раз 
                  выполнить сборку на вашем компьютере.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-bold text-gray-800 mb-2">Шаг 1. Установите Node.js</h3>
                  <p className="mb-2">Скачайте и установите Node.js с официального сайта:</p>
                  <a 
                    href="https://nodejs.org/ru" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={16} />
                    Скачать Node.js (версия LTS)
                  </a>
                  <p className="mt-2 text-xs text-gray-600">
                    При установке оставляйте все галочки по умолчанию.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-bold text-gray-800 mb-2">Шаг 2. Скачайте проект</h3>
                  <p className="mb-2">
                    Скачайте папку с проектом (все файлы программы) в любое место на компьютере, 
                    например в <code className="bg-gray-100 px-2 py-1 rounded">C:\Программы\РЗА</code>
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-bold text-gray-800 mb-2">Шаг 3. Откройте командную строку</h3>
                  <p className="mb-2">
                    Откройте папку с проектом, нажмите <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">Shift</kbd> + 
                    <kbd className="bg-gray-200 px-2 py-1 rounded text-xs">правая кнопка мыши</kbd> в пустом месте папки 
                    и выберите <strong>"Открыть окно PowerShell"</strong> или <strong>"Открыть в терминале"</strong>.
                  </p>
                  <p className="text-xs text-gray-600">
                    Альтернатива: в адресной строке проводника наберите <code className="bg-gray-100 px-2 py-1 rounded">cmd</code> и нажмите Enter.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-bold text-gray-800 mb-2">Шаг 4. Установите зависимости</h3>
                  <p className="mb-2">В командной строке введите команду и нажмите Enter:</p>
                  <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
                    npm install
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Подождите 1-2 минуты, пока установятся все компоненты.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-bold text-gray-800 mb-2">Шаг 5. Соберите программу</h3>
                  <p className="mb-2">В той же командной строке введите:</p>
                  <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
                    npm run build
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Сборка займёт несколько секунд. После завершения появится папка <code className="bg-gray-100 px-2 py-1 rounded">dist</code>.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-bold text-gray-800 mb-2">Шаг 6. Готово!</h3>
                  <p className="mb-2">
                    В папке <code className="bg-gray-100 px-2 py-1 rounded">dist</code> будет файл 
                    <strong className="text-green-700"> index.html</strong> — это и есть ваша программа!
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Переименуйте его в <code className="bg-gray-100 px-2 py-1 rounded">Планирование_РЗА.html</code></li>
                    <li>Можете перенести в любое место на компьютере</li>
                    <li>Открывайте двойным кликом — работает без интернета!</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="font-semibold text-yellow-800 mb-2">⚠️ Важно:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700 text-xs">
                  <li>Шаги 1-5 нужно выполнить только один раз</li>
                  <li>После сборки файл <code className="bg-yellow-100 px-1 rounded">index.html</code> полностью автономен</li>
                  <li>Папки <code className="bg-yellow-100 px-1 rounded">node_modules</code> и <code className="bg-yellow-100 px-1 rounded">src</code> больше не нужны — их можно удалить</li>
                  <li>Данные сохраняются в браузере, делайте резервные копии через экспорт в Excel</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <p className="font-semibold text-green-800 mb-2">🆘 Нужна помощь?</p>
                <p className="text-green-700 text-xs">
                  Если что-то не получается, обратитесь к любому знакомому IT-специалисту 
                  с этой инструкцией — он поможет выполнить шаги 1-5 за 5 минут.
                </p>
              </div>
            </div>

            <div className="p-5 border-t flex justify-end">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Понятно, закрыть
              </button>
            </div>
          </div>
        </div>
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
                {MAINTENANCE_TYPES.map(t => (
                  <option key={t.code} value={t.code}>{t.code} — {t.name}</option>
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
                {MAINTENANCE_TYPES.map(t => (
                  <option key={t.code} value={t.code}>{t.code} — {t.name}</option>
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

          {/* Reference table for maintenance types */}
          <div className="border-t pt-4">
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 font-medium hover:text-gray-800">
                Справка по видам обслуживания
              </summary>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 bg-gray-50 rounded-lg p-3">
                {MAINTENANCE_TYPES.map(t => (
                  <div key={t.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-bold text-blue-700 min-w-[30px]">{t.code}</span>
                    <span className="text-gray-600">{t.name}</span>
                  </div>
                ))}
              </div>
            </details>
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
