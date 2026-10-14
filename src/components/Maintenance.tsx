import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, UploadCloud, Columns2 as Columns, GripVertical, Check, LayoutTemplate, Eye, CircleDollarSign, Save, Bookmark, Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '../utils/exportCSV';
import { formatCurrency, formatAppDate } from '../utils/formatters';
import { BulkActionBar } from './BulkActionBar';
import { MaintenanceDrawer } from './MaintenanceDrawer';
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

interface Invoice {
  id: string;
  vendor: string;
  vrn: string;
  date: string;
  labor_cost: number;
  parts_cost: number;
  tax: number;
  total: number;
  odometer: number;
  status: 'Needs Review' | 'Synced';
}

const mockInvoices: Invoice[] = [
  {
    id: 'INV-001',
    vendor: "Bob's Auto Glass",
    vrn: 'ABC123',
    date: '2026-03-05',
    labor_cost: 175.00,
    parts_cost: 420.00,
    tax: 59.50,
    total: 654.50,
    odometer: 48250,
    status: 'Needs Review'
  },
  {
    id: 'INV-002',
    vendor: 'Jiffy Lube',
    vrn: 'XYZ789',
    date: '2026-03-06',
    labor_cost: 45.00,
    parts_cost: 78.50,
    tax: 12.35,
    total: 135.85,
    odometer: 62340,
    status: 'Needs Review'
  },
  {
    id: 'INV-003',
    vendor: 'Premium Tire & Service',
    vrn: 'DEF456',
    date: '2026-03-04',
    labor_cost: 120.00,
    parts_cost: 680.00,
    tax: 80.00,
    total: 880.00,
    odometer: 35780,
    status: 'Needs Review'
  },
  {
    id: 'INV-004',
    vendor: 'Discount Brake Center',
    vrn: 'GHI321',
    date: '2026-03-03',
    labor_cost: 220.00,
    parts_cost: 385.00,
    tax: 60.50,
    total: 665.50,
    odometer: 71920,
    status: 'Synced'
  },
  {
    id: 'INV-005',
    vendor: 'Express Auto Detailing',
    vrn: 'JKL654',
    date: '2026-03-02',
    labor_cost: 150.00,
    parts_cost: 0.00,
    tax: 15.00,
    total: 165.00,
    odometer: 22450,
    status: 'Needs Review'
  }
];

type SortColumn = 'id' | 'vendor' | 'vrn' | 'date' | 'total' | 'odometer' | 'status';
type SortDirection = 'asc' | 'desc';
type QuickFilter = 'all' | 'needs-review' | 'synced';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  sortKey?: SortColumn;
  draggable: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'invoiceId', label: 'Invoice ID', visible: true, sortKey: 'id', draggable: true },
  { id: 'vendor', label: 'Vendor', visible: true, sortKey: 'vendor', draggable: true },
  { id: 'vrn', label: 'VRN', visible: true, sortKey: 'vrn', draggable: true },
  { id: 'date', label: 'Date', visible: true, sortKey: 'date', draggable: true },
  { id: 'total', label: 'Total Amount', visible: true, sortKey: 'total', draggable: true },
  { id: 'odometer', label: 'Odometer', visible: true, sortKey: 'odometer', draggable: true },
  { id: 'status', label: 'Status', visible: true, sortKey: 'status', draggable: true },
];

function SortableHeader({ column, sortColumn, sortDirection, onSort }: {
  column: ColumnConfig;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, disabled: !column.draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getSortIcon = (columnSortKey: SortColumn) => {
    if (sortColumn !== columnSortKey) {
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />
      : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg px-4 py-3 whitespace-nowrap border-b border-slate-200/50 dark:border-slate-700/50"
    >
      <div className="flex items-center gap-2">
        {column.draggable && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <GripVertical size={14} className="text-slate-400" />
          </button>
        )}
        {column.sortKey ? (
          <button
            onClick={() => onSort(column.sortKey!)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span>{column.label}</span>
            {getSortIcon(column.sortKey)}
          </button>
        ) : (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {column.label}
          </span>
        )}
      </div>
    </th>
  );
}

export function Maintenance() {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(mockInvoices);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('maintenanceColumnState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_COLUMNS;
      }
    }
    return DEFAULT_COLUMNS;
  });
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'default' | 'finance' | 'custom' | string>('default');
  const [customViews, setCustomViews] = useState<{id: string, name: string, columns: ColumnConfig[]}[]>(() => {
    const saved = localStorage.getItem('pennyos_maintenance_views');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('maintenanceColumnState', JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem('pennyos_maintenance_views', JSON.stringify(customViews));
  }, [customViews]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchQuery, sortColumn, sortDirection, quickFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };

    if (isColumnMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnMenuOpen]);

  function filterInvoices() {
    let filtered = [...invoices];

    if (quickFilter === 'needs-review') {
      filtered = filtered.filter((inv) => inv.status === 'Needs Review');
    } else if (quickFilter === 'synced') {
      filtered = filtered.filter((inv) => inv.status === 'Synced');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.vendor.toLowerCase().includes(query) ||
          inv.vrn.toLowerCase().includes(query) ||
          inv.id.toLowerCase().includes(query)
      );
    }

    if (sortColumn) {
      filtered = sortInvoices(filtered, sortColumn, sortDirection);
    }

    setFilteredInvoices(filtered);
  }

  function sortInvoices(data: Invoice[], column: SortColumn, direction: SortDirection): Invoice[] {
    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'vendor':
          aValue = a.vendor;
          bValue = b.vendor;
          break;
        case 'vrn':
          aValue = a.vrn;
          bValue = b.vrn;
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'odometer':
          aValue = a.odometer;
          bValue = b.odometer;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return sorted;
  }

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  function toggleColumn(columnId: string) {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
    setActiveView('custom');
  }

  function applySavedView(viewType: 'default' | 'finance' | string) {
    let newColumns: ColumnConfig[];

    if (viewType === 'default') {
      newColumns = DEFAULT_COLUMNS;
    } else if (viewType === 'finance') {
      const order = ['total', 'status', 'invoiceId', 'vendor', 'date', 'vrn', 'odometer'];
      newColumns = order.map(id => {
        const col = DEFAULT_COLUMNS.find(c => c.id === id)!;
        return {
          ...col,
          visible: id !== 'odometer'
        };
      });
    } else {
      const customView = customViews.find(v => v.id === viewType);
      if (customView) {
        newColumns = customView.columns;
      } else {
        return;
      }
    }

    setColumns(newColumns);
    setActiveView(viewType);
    setIsColumnMenuOpen(false);
  }

  function handleSaveCustomView() {
    const trimmedName = newViewName.trim();
    if (!trimmedName) {
      toast.error('Please enter a view name');
      return;
    }

    const existingViewIndex = customViews.findIndex(v => v.name.toLowerCase() === trimmedName.toLowerCase());

    if (existingViewIndex >= 0) {
      const updatedViews = [...customViews];
      updatedViews[existingViewIndex].columns = [...columns];
      setCustomViews(updatedViews);
      setActiveView(updatedViews[existingViewIndex].id);
      toast.success(`View "${trimmedName}" updated successfully`);
    } else {
      const newId = `custom_${Date.now()}`;
      setCustomViews([...customViews, { id: newId, name: trimmedName, columns: [...columns] }]);
      setActiveView(newId);
      toast.success(`View "${trimmedName}" saved successfully`);
    }

    setIsSaveViewModalOpen(false);
    setNewViewName('');
  }

  function handleDeleteCustomView(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const viewToDelete = customViews.find(v => v.id === id);
    setCustomViews(prev => prev.filter(v => v.id !== id));

    if (activeView === id) {
      setActiveView('default');
      applySavedView('default');
    }

    if (viewToDelete) {
      toast.success(`View "${viewToDelete.name}" deleted`);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
      setActiveView('custom');
    }
  }

  function renderCell(columnId: string, invoice: Invoice, onClick: () => void) {
    switch (columnId) {
      case 'invoiceId':
        return (
          <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {invoice.id}
          </td>
        );
      case 'vendor':
        return (
          <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {invoice.vendor}
          </td>
        );
      case 'vrn':
        return (
          <td className="px-4 py-4 text-sm font-mono text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {invoice.vrn}
          </td>
        );
      case 'date':
        return (
          <td className="px-4 py-4 text-sm font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {formatAppDate(invoice.date)}
          </td>
        );
      case 'total':
        return (
          <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {formatCurrency(invoice.total)}
          </td>
        );
      case 'odometer':
        return (
          <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {invoice.odometer.toLocaleString()} mi
          </td>
        );
      case 'status':
        return (
          <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {invoice.status === 'Needs Review' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30 rounded-full text-xs border font-medium">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Needs Review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/30 rounded-full text-xs border font-medium">
                <CheckCircle size={12} />
                Synced
              </span>
            )}
          </td>
        );
      default:
        return null;
    }
  }

  function handleRowClick(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setTimeout(() => setIsDrawerOpen(true), 10);
  }

  function handleDrawerClose() {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedInvoice(null);
    }, 300);
  }

  function handleSelectAll() {
    if (selectedRows.size === filteredInvoices.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredInvoices.map((inv) => inv.id)));
    }
  }

  function handleSelectRow(id: string) {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  }

  function handleBulkAssign() {
    toast.success(`Bulk action for ${selectedRows.size} records`);
    setSelectedRows(new Set());
  }

  function handleBulkMarkPending() {
    toast.success(`Marked ${selectedRows.size} records as pending`);
    setSelectedRows(new Set());
  }

  function handleBulkDelete() {
    toast.success(`Deleted ${selectedRows.size} records`);
    setSelectedRows(new Set());
  }

  function handleExportCSV() {
    exportToCSV(filteredInvoices, 'maintenance-invoices.csv');
    toast.success('Data exported successfully');
  }

  function handleApproveAndSync() {
    if (!selectedInvoice) return;

    setInvoices(invoices.map(inv =>
      inv.id === selectedInvoice.id
        ? { ...inv, status: 'Synced' as const }
        : inv
    ));

    toast.success('Data pushed to Fleetio and Xero successfully', {
      description: `${selectedInvoice.vendor} - ${selectedInvoice.vrn}`,
      duration: 4000,
    });

    handleDrawerClose();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show loading toast
    toast.loading('Alibi Engine analyzing document...', { id: 'ai-processing' });

    // Simulate AI processing delay
    setTimeout(() => {
      // Dismiss loading toast
      toast.dismiss('ai-processing');
      toast.success('Extraction complete');

      // Generate new invoice with realistic data
      const newInvoice: Invoice = {
        id: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
        vendor: 'Simulated Auto Shop',
        vrn: 'SIM' + Math.floor(Math.random() * 1000),
        date: new Date().toISOString().split('T')[0],
        labor_cost: Math.floor(Math.random() * 200) + 50,
        parts_cost: Math.floor(Math.random() * 500) + 100,
        tax: 0,
        odometer: Math.floor(Math.random() * 50000) + 20000,
        status: 'Needs Review'
      };

      // Calculate tax and total
      newInvoice.tax = (newInvoice.labor_cost + newInvoice.parts_cost) * 0.1;
      newInvoice.total = newInvoice.labor_cost + newInvoice.parts_cost + newInvoice.tax;

      // Add to invoices list at the top
      setInvoices(prev => [newInvoice, ...prev]);

      // Auto-open drawer with new invoice
      handleRowClick(newInvoice);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 3000);
  }

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Static header section */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 md:p-6 transition-colors duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Maintenance & Repairs</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Intelligent invoice ingestion and multi-system routing
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">
              <span className="text-slate-600 dark:text-slate-400">Total Invoices:</span>
              <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">{filteredInvoices.length}</span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
            >
              <UploadCloud size={18} />
              Upload Invoice
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        {/* Unified sticky glass header with filters, search, and table headers */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Filter tabs */}
          <div className="px-4 md:px-6 pt-4">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setQuickFilter('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  quickFilter === 'all'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setQuickFilter('needs-review')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  quickFilter === 'needs-review'
                    ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Needs Review
              </button>
              <button
                onClick={() => setQuickFilter('synced')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  quickFilter === 'synced'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Synced
              </button>
            </div>

            {/* Search bar */}
            <div className="relative z-30 pb-4 pt-2 flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by vendor, VRN, or invoice ID..."
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
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => applySavedView('default')}
                        className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <LayoutTemplate size={16} className="text-slate-400" />
                          <span>Default</span>
                        </div>
                        {activeView === 'default' && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                      </button>
                      <button
                        onClick={() => applySavedView('finance')}
                        className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CircleDollarSign size={16} className="text-slate-400" />
                          <span>Finance Focus</span>
                        </div>
                        {activeView === 'finance' && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                      </button>
                      {customViews.map((view) => (
                        <button
                          key={view.id}
                          onClick={() => applySavedView(view.id)}
                          className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Bookmark size={16} className="text-slate-400" />
                            <span>{view.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeView === view.id && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                            <button
                              onClick={(e) => handleDeleteCustomView(view.id, e)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                              <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </button>
                      ))}
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                      <div className="px-4 py-2">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Toggle Columns</p>
                        {columns.map((col) => (
                          <label key={col.id} className="flex items-center gap-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={col.visible}
                              onChange={() => toggleColumn(col.id)}
                              className="rounded border-slate-300 dark:border-slate-600"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{col.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700 mt-1" />
                      <button
                        onClick={() => setIsSaveViewModalOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
                      >
                        <Save size={16} />
                        Save Current View
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="relative mx-4 md:mx-6 my-4 md:my-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="relative overflow-auto h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)]">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 w-12">
                        <input
                          type="checkbox"
                          checked={selectedRows.size === filteredInvoices.length && filteredInvoices.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-600"
                        />
                      </th>
                      <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        {visibleColumns.map((col) => (
                          <SortableHeader
                            key={col.id}
                            column={col}
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                          />
                        ))}
                      </SortableContext>
                      <th className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider border-b border-slate-200/50 dark:border-slate-700/50 w-[140px]">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900">
                    {filteredInvoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        onClick={() => handleRowClick(invoice)}
                        className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 w-12" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(invoice.id)}
                            onChange={() => handleSelectRow(invoice.id)}
                            className="rounded border-slate-300 dark:border-slate-600"
                          />
                        </td>
                        {visibleColumns.map((col) => (
                          <React.Fragment key={col.id}>
                            {renderCell(col.id, invoice, () => handleRowClick(invoice))}
                          </React.Fragment>
                        ))}
                        <td className="px-4 py-4 text-right w-[140px] border-b border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                          <div className="relative w-full h-full flex items-center justify-end">
                            <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 transition-opacity duration-200 opacity-100 group-hover:opacity-0 absolute right-4" />
                            <button onClick={() => handleRowClick(invoice)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100 shadow-sm">
                              Review <ChevronRight size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DndContext>
              {filteredInvoices.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-slate-500 dark:text-slate-400">No invoices found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedRows.size > 0 && (
        <BulkActionBar
          selectedCount={selectedRows.size}
          onAssign={handleBulkAssign}
          onMarkPending={handleBulkMarkPending}
          onDelete={handleBulkDelete}
          onCancel={() => setSelectedRows(new Set())}
        />
      )}

      {/* Save View Modal */}
      {isSaveViewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Save Custom View</h3>
            <input
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Enter view name..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsSaveViewModalOpen(false);
                  setNewViewName('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomView}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selectedInvoice && (
        <MaintenanceDrawer
          invoice={selectedInvoice}
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          onApprove={handleApproveAndSync}
        />
      )}
    </div>
  );
}
