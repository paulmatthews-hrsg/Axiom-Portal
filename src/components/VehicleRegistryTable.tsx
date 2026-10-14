import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, Columns2 as Columns, GripVertical, Check, Eye, Save, Bookmark, Trash2, Minus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '../utils/exportCSV';
import { BulkActionBar } from './BulkActionBar';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortColumn = 'vehicle_name' | 'vin' | 'license_plate' | 'group' | 'type' | 'acriss' | 'status';
type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  sortKey?: SortColumn;
  draggable: boolean;
}

interface Vehicle {
  id: string;
  vehicle_name: string;
  vin: string;
  license_plate: string;
  group: string;
  type: string;
  acriss: string;
  status: 'Active' | 'In Shop' | 'Pending De-fleet';
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'vehicleName', label: 'Vehicle Name', visible: true, sortKey: 'vehicle_name', draggable: true },
  { id: 'vin', label: 'VIN', visible: true, sortKey: 'vin', draggable: true },
  { id: 'licensePlate', label: 'License Plate', visible: true, sortKey: 'license_plate', draggable: true },
  { id: 'group', label: 'Group', visible: true, sortKey: 'group', draggable: true },
  { id: 'type', label: 'Type', visible: true, sortKey: 'type', draggable: true },
  { id: 'acriss', label: 'ACRISS', visible: true, sortKey: 'acriss', draggable: true },
  { id: 'status', label: 'Status', visible: true, sortKey: 'status', draggable: true },
];

const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', vehicle_name: '2024 Tesla Model 3 - Silver', vin: '5YJ3E1EA8PF123456', license_plate: 'NYC-8472', group: 'Global Fleet', type: 'Sedan', acriss: 'ECAR', status: 'Active' },
  { id: '2', vehicle_name: '2023 Toyota RAV4 - White', vin: '2T3P1RFV8PC456789', license_plate: 'BOS-2891', group: 'North Region', type: 'SUV', acriss: 'SFAR', status: 'Active' },
  { id: '3', vehicle_name: '2024 Ford F-150 - Blue', vin: '1FTFW1E85PFA78901', license_plate: 'MIA-5632', group: 'South Region', type: 'Truck', acriss: 'FTAR', status: 'In Shop' },
  { id: '4', vehicle_name: '2023 Honda Civic - Black', vin: '2HGFC2F59PH234567', license_plate: 'NYC-1947', group: 'North Region', type: 'Sedan', acriss: 'CCAR', status: 'Active' },
  { id: '5', vehicle_name: '2024 Chevrolet Tahoe - Grey', vin: '1GNSKCKD2PR345678', license_plate: 'BOS-7823', group: 'North Region', type: 'SUV', acriss: 'FFAR', status: 'Active' },
  { id: '6', vehicle_name: '2023 Nissan Altima - Red', vin: '1N4BL4EV8PC456789', license_plate: 'MIA-3421', group: 'South Region', type: 'Sedan', acriss: 'ICAR', status: 'Pending De-fleet' },
  { id: '7', vehicle_name: '2024 Hyundai Tucson - Silver', vin: '5NMS24AJ7PH567890', license_plate: 'NYC-6754', group: 'West Region', type: 'SUV', acriss: 'CFAR', status: 'Active' },
  { id: '8', vehicle_name: '2023 BMW X5 - White', vin: 'WBAJW0C56PC678901', license_plate: 'BOS-9182', group: 'Global Fleet', type: 'SUV', acriss: 'LFAR', status: 'In Shop' },
];

function SortableHeader({ column, sortColumn, sortDirection, onSort }: {
  column: ColumnConfig;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id, disabled: !column.draggable });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const getSortIcon = (columnSortKey: SortColumn) => {
    if (sortColumn !== columnSortKey) return <ArrowUpDown size={14} className="text-slate-400" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
  };

  return (
    <th ref={setNodeRef} style={style} className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg px-4 py-3 whitespace-nowrap border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="flex items-center gap-2">
        {column.draggable && (
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
            <GripVertical size={14} className="text-slate-400" />
          </button>
        )}
        {column.sortKey ? (
          <button onClick={() => onSort(column.sortKey!)} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <span>{column.label}</span>
            {getSortIcon(column.sortKey)}
          </button>
        ) : (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{column.label}</span>
        )}
      </div>
    </th>
  );
}

function getStatusBadge(status: Vehicle['status']) {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border";
  switch (status) {
    case 'Active':
      return <span className={`${baseClasses} bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30`}>Active</span>;
    case 'In Shop':
      return <span className={`${baseClasses} bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30`}>In Shop</span>;
    case 'Pending De-fleet':
      return <span className={`${baseClasses} bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-400/30`}>Pending De-fleet</span>;
    default:
      return <span className={`${baseClasses} bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400`}>{status}</span>;
  }
}

export function VehicleRegistryTable() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('vehicleRegistryColumnState');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'default' | 'custom' | string>('default');
  const [customViews, setCustomViews] = useState<{id: string, name: string, columns: ColumnConfig[]}[]>(() => {
    const saved = localStorage.getItem('pennyos_vehicle_views');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    localStorage.setItem('vehicleRegistryColumnState', JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem('pennyos_vehicle_views', JSON.stringify(customViews));
  }, [customViews]);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchQuery, statusFilter, groupFilter, sortColumn, sortDirection]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    if (isColumnMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);

  function filterVehicles() {
    let filtered = [...vehicles];
    if (statusFilter !== 'all') filtered = filtered.filter((v) => v.status === statusFilter);
    if (groupFilter !== 'all') filtered = filtered.filter((v) => v.group === groupFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((v) =>
        v.vehicle_name.toLowerCase().includes(query) ||
        v.vin.toLowerCase().includes(query) ||
        v.license_plate.toLowerCase().includes(query) ||
        v.group.toLowerCase().includes(query)
      );
    }

    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    setFilteredVehicles(filtered);
  }

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function toggleColumnVisibility(columnId: string) {
    setColumns((prev) => prev.map((col) => col.id === columnId ? { ...col, visible: !col.visible } : col));
  }

  function handleExport() {
    const headers = columns.filter(c => c.visible).map(c => c.label);
    const rows = filteredVehicles.map(v =>
      columns.filter(c => c.visible).map(c => {
        switch (c.id) {
          case 'vehicleName': return v.vehicle_name;
          case 'vin': return v.vin;
          case 'licensePlate': return v.license_plate;
          case 'group': return v.group;
          case 'type': return v.type;
          case 'acriss': return v.acriss;
          case 'status': return v.status;
          default: return '';
        }
      })
    );
    exportToCSV(headers, rows, 'vehicle-registry');
    toast.success('Vehicle registry exported to CSV');
  }

  function handleExportCSV() {
    handleExport();
  }

  function handleSelectRow(id: string) {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredVehicles.map(v => v.id)));
    }
  }

  function loadView(viewId: string) {
    if (viewId === 'default') {
      setColumns(DEFAULT_COLUMNS);
      setActiveView('default');
    } else {
      const view = customViews.find(v => v.id === viewId);
      if (view) {
        setColumns(view.columns);
        setActiveView(viewId);
      }
    }
    setIsColumnMenuOpen(false);
  }

  function saveCurrentView() {
    if (!newViewName.trim()) return;
    const newView = {
      id: Date.now().toString(),
      name: newViewName,
      columns: [...columns]
    };
    setCustomViews(prev => [...prev, newView]);
    setActiveView(newView.id);
    setNewViewName('');
    setIsSaveViewModalOpen(false);
    toast.success('View saved successfully');
  }

  function deleteView(viewId: string) {
    setCustomViews(prev => prev.filter(v => v.id !== viewId));
    if (activeView === viewId) {
      setActiveView('default');
      setColumns(DEFAULT_COLUMNS);
    }
    toast.success('View deleted');
  }

  const visibleColumns = columns.filter((c) => c.visible);
  const uniqueGroups = Array.from(new Set(vehicles.map(v => v.group))).sort();
  const allSelected = filteredVehicles.length > 0 && selectedRows.size === filteredVehicles.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < filteredVehicles.length;
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-6">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Vehicle Registry</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Master table of all fleet vehicles
        </p>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        {/* Unified sticky glass header with filters, search, and table headers */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Filter tabs */}
          <div className="px-4 md:px-6 pt-4">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === 'all'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All Vehicles
              </button>
              <button
                onClick={() => setStatusFilter('Active')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === 'Active'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('In Shop')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === 'In Shop'
                    ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                In Shop
              </button>
            </div>

            {/* Search and control buttons */}
            <div className="relative z-30 pb-4 pt-2 flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name or VIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Export to CSV"
              >
                <Download size={18} />
                <span className="hidden md:inline text-sm font-medium">Export CSV</span>
              </button>

              <div className="relative" ref={columnMenuRef}>
                <button
                  onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Column Visibility"
                >
                  <Columns size={18} />
                  <span className="hidden md:inline text-sm font-medium">View</span>
                </button>

              {isColumnMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
                  {/* Saved Views */}
                  <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Saved Views</span>
                      <button
                        onClick={() => setIsSaveViewModalOpen(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                      >
                        <Save size={12} />
                        Save Current
                      </button>
                    </div>

                    <button
                      onClick={() => loadView('default')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                        activeView === 'default' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Eye size={14} className="text-slate-400" />
                        <span className="text-sm">Default View</span>
                      </div>
                      {activeView === 'default' && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                    </button>

                    {customViews.map(view => (
                      <div
                        key={view.id}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                          activeView === view.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <button
                          onClick={() => loadView(view.id)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          <Bookmark size={14} className="text-slate-400" />
                          <span className="text-sm">{view.name}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          {activeView === view.id && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteView(view.id);
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 size={12} className="text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Column Toggles */}
                  <div className="p-3">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">Columns</span>
                    {columns.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={() => toggleColumnVisibility(col.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer transition-colors"
                >
                  <option value="all">All Groups</option>
                  {uniqueGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Table content */}
        <div className="relative mx-4 md:mx-6 my-4 md:my-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="relative overflow-auto h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-left">
            <thead>
              <tr>
                {/* Checkbox Column */}
                <th className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg px-4 py-3 w-12 border-b border-slate-200/50 dark:border-slate-700/50">
                  <button
                    onClick={handleSelectAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      allSelected
                        ? 'bg-blue-600 border-blue-600'
                        : someSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-600'
                    }`}
                  >
                    {allSelected && <Check size={14} className="text-white" />}
                    {someSelected && <Minus size={14} className="text-white" />}
                  </button>
                </th>
                <SortableContext
                  items={columns.map(c => c.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {visibleColumns.map((column) => (
                    <SortableHeader
                      key={column.id}
                      column={column}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => {
                const isSelected = selectedRows.has(vehicle.id);
                return (
                  <tr
                    key={vehicle.id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {/* Checkbox Column */}
                    <td className="px-4 py-3 w-12 border-b border-slate-200 dark:border-slate-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(vehicle.id);
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-slate-300 dark:border-slate-600 hover:border-blue-600'
                        }`}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </button>
                    </td>
                    {visibleColumns.map((column) => (
                      <td key={column.id} className="px-4 py-3 whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                        {column.id === 'vehicleName' && (
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{vehicle.vehicle_name}</span>
                        )}
                        {column.id === 'vin' && (
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-mono">{vehicle.vin}</span>
                        )}
                        {column.id === 'licensePlate' && (
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">{vehicle.license_plate}</span>
                        )}
                        {column.id === 'group' && (
                          <span className="text-sm text-slate-600 dark:text-slate-400">{vehicle.group}</span>
                        )}
                        {column.id === 'type' && (
                          <span className="text-sm text-slate-600 dark:text-slate-400">{vehicle.type}</span>
                        )}
                        {column.id === 'acriss' && (
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-mono">{vehicle.acriss}</span>
                        )}
                        {column.id === 'status' && getStatusBadge(vehicle.status)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredVehicles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No vehicles found</p>
            </div>
          )}
        </DndContext>
            </div>
          </div>
        </div>
      </div>

      {/* Save View Modal */}
      {isSaveViewModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Save Custom View</h3>
            <input
              type="text"
              placeholder="Enter view name..."
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveCurrentView()}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsSaveViewModalOpen(false);
                  setNewViewName('');
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentView}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedRows.size > 0 && (
        <BulkActionBar
          selectedCount={selectedRows.size}
          onBulkAssign={() => { toast.success('Group changed'); setSelectedRows(new Set()); }}
          onMarkPending={() => { toast.success('Status updated'); setSelectedRows(new Set()); }}
          onDelete={() => { toast.success('Vehicles deleted'); setSelectedRows(new Set()); }}
          onClose={() => setSelectedRows(new Set())}
        />
      )}
    </div>
  );
}
