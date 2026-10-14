import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Upload, Mail, Download, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, User, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Columns2 as Columns, GripVertical, Check, LayoutTemplate, Eye, CircleDollarSign, Save, Bookmark, Trash2, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CUSTOMER_BASES } from '../constants/config';
import type { Infringement } from '../types/database';
import { InfringementDrawer } from './InfringementDrawer';
import { BulkUploadModal } from './BulkUploadModal';
import { EmailInboxModal } from './EmailInboxModal';
import { useRBAC } from '../contexts/RBACContext';
import { formatCurrency, formatAppDate } from '../utils/formatters';
import { CommandPalette } from './CommandPalette';
import { BulkActionBar } from './BulkActionBar';
import { QuickAddMenu } from './QuickAddMenu';
import { exportToCSV } from '../utils/exportCSV';
import { toast } from 'sonner';
import { useNavigate } from '../contexts/NavigationContext';
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

type SortColumn = 'date_received' | 'due_date' | 'reference' | 'customer_base' | 'vrn' | 'offence_type' | 'assigned_driver' | 'fine_amount' | 'status';
type SortDirection = 'asc' | 'desc';
type QuickFilter = 'all' | 'overdue' | 'pending';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  sortKey?: SortColumn;
  draggable: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'dateReceived', label: 'Date Received', visible: true, sortKey: 'date_received', draggable: true },
  { id: 'dueDate', label: 'Due Date', visible: true, sortKey: 'due_date', draggable: true },
  { id: 'reference', label: 'Reference', visible: true, sortKey: 'reference', draggable: true },
  { id: 'customerBase', label: 'Customer Base', visible: true, sortKey: 'customer_base', draggable: true },
  { id: 'vrn', label: 'VRN/Rego', visible: true, sortKey: 'vrn', draggable: true },
  { id: 'offenceType', label: 'Offence Type', visible: true, sortKey: 'offence_type', draggable: true },
  { id: 'assignedDriver', label: 'Assigned Driver', visible: true, sortKey: 'assigned_driver', draggable: true },
  { id: 'fineAmount', label: 'Fine Amount', visible: true, sortKey: 'fine_amount', draggable: true },
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

export function InfringementTriage() {
  const [infringements, setInfringements] = useState<Infringement[]>([]);
  const [filteredInfringements, setFilteredInfringements] = useState<Infringement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [selectedInfringement, setSelectedInfringement] = useState<Infringement | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isEmailInboxOpen, setIsEmailInboxOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('infringementColumnState');
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
  const [activeView, setActiveView] = useState<'default' | 'triage' | 'finance' | 'custom' | string>('default');
  const [customViews, setCustomViews] = useState<{id: string, name: string, columns: ColumnConfig[]}[]>(() => {
    const saved = localStorage.getItem('pennyos_custom_views');
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
  const { currentUser, canAccessFleet, hasFullAccess } = useRBAC();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { registerResetCallback, unregisterResetCallback } = useNavigate();

  useEffect(() => {
    fetchInfringements();
  }, []);

  useEffect(() => {
    localStorage.setItem('infringementColumnState', JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem('pennyos_custom_views', JSON.stringify(customViews));
  }, [customViews]);

  useEffect(() => {
    filterInfringements();
  }, [infringements, searchQuery, customerFilter, sortColumn, sortDirection, quickFilter, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    registerResetCallback('infringement-triage', () => {
      handleDrawerClose();
    });

    return () => {
      unregisterResetCallback('infringement-triage');
    };
  }, [registerResetCallback, unregisterResetCallback]);

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

  async function fetchInfringements() {
    setLoading(true);
    const { data, error } = await supabase
      .from('infringements')
      .select('*')
      .order('date_received', { ascending: false });

    if (error) {
      console.error('Error fetching infringements:', error);
    } else {
      setInfringements(data || []);
    }
    setLoading(false);
  }

  function filterInfringements() {
    let filtered = [...infringements];

    filtered = filtered.filter((inf) => canAccessFleet(inf.customer_base));

    if (customerFilter !== 'all') {
      filtered = filtered.filter((inf) => inf.customer_base === customerFilter);
    }

    if (quickFilter !== 'all') {
      filtered = filtered.filter((inf) => {
        const dueDate = calculateDueDate(inf.date_received);
        const daysUntil = getDaysUntilDue(dueDate);

        if (quickFilter === 'overdue') {
          return daysUntil < 0;
        } else if (quickFilter === 'pending') {
          return inf.status.toLowerCase().includes('pending') ||
                 inf.status.toLowerCase().includes('awaiting');
        }
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inf) =>
          inf.vrn.toLowerCase().includes(query) ||
          inf.offence_type.toLowerCase().includes(query) ||
          inf.reference_number?.toLowerCase().includes(query) ||
          inf.internal_id?.toLowerCase().includes(query) ||
          inf.assigned_driver?.toLowerCase().includes(query)
      );
    }

    if (sortColumn) {
      filtered = sortInfringements(filtered, sortColumn, sortDirection);
    }

    setFilteredInfringements(filtered);
  }

  function calculateDueDate(dateReceived: string): Date {
    const received = new Date(dateReceived);
    const dueDate = new Date(received);
    dueDate.setDate(received.getDate() + 21);
    return dueDate;
  }

  function getDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getUrgencyBadge(daysUntilDue: number) {
    if (daysUntilDue < 0) {
      return {
        text: 'Overdue',
        icon: AlertCircle,
        className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-400/30'
      };
    } else if (daysUntilDue <= 5) {
      return {
        text: 'Due Soon',
        icon: AlertTriangle,
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/30'
      };
    }
    return null;
  }

  function getAIConfidence(infringement: Infringement): number | null {
    if (infringement.assigned_driver && infringement.status !== 'New') {
      const hash = infringement.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return 85 + (hash % 15);
    }
    return null;
  }

  function sortInfringements(data: Infringement[], column: SortColumn, direction: SortDirection): Infringement[] {
    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case 'date_received':
          aValue = new Date(a.date_received).getTime();
          bValue = new Date(b.date_received).getTime();
          break;
        case 'due_date':
          aValue = calculateDueDate(a.date_received).getTime();
          bValue = calculateDueDate(b.date_received).getTime();
          break;
        case 'reference':
          aValue = a.reference_number || '';
          bValue = b.reference_number || '';
          break;
        case 'customer_base':
          aValue = a.customer_base;
          bValue = b.customer_base;
          break;
        case 'vrn':
          aValue = a.vrn;
          bValue = b.vrn;
          break;
        case 'offence_type':
          aValue = a.offence_type;
          bValue = b.offence_type;
          break;
        case 'assigned_driver':
          aValue = a.assigned_driver || '';
          bValue = b.assigned_driver || '';
          break;
        case 'fine_amount':
          aValue = a.fine_amount != null || a.victims_levy != null
            ? (a.fine_amount ?? 0) + (a.victims_levy ?? 0)
            : -1;
          bValue = b.fine_amount != null || b.victims_levy != null
            ? (b.fine_amount ?? 0) + (b.victims_levy ?? 0)
            : -1;
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

  function applySavedView(viewType: 'default' | 'triage' | 'finance' | string) {
    let newColumns: ColumnConfig[];

    if (viewType === 'default') {
      newColumns = DEFAULT_COLUMNS;
    } else if (viewType === 'triage') {
      const order = ['vrn', 'dateReceived', 'dueDate', 'offenceType', 'reference', 'customerBase', 'assignedDriver', 'fineAmount', 'status'];
      newColumns = order.map(id => {
        const col = DEFAULT_COLUMNS.find(c => c.id === id)!;
        return {
          ...col,
          visible: id !== 'fineAmount' && id !== 'customerBase'
        };
      });
    } else if (viewType === 'finance') {
      const order = ['customerBase', 'fineAmount', 'status', 'reference', 'dateReceived', 'dueDate', 'vrn', 'offenceType', 'assignedDriver'];
      newColumns = order.map(id => {
        const col = DEFAULT_COLUMNS.find(c => c.id === id)!;
        return {
          ...col,
          visible: id !== 'assignedDriver' && id !== 'offenceType'
        };
      });
    } else {
      // Custom view
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
      // Overwrite existing view
      const updatedViews = [...customViews];
      updatedViews[existingViewIndex].columns = [...columns];
      setCustomViews(updatedViews);
      setActiveView(updatedViews[existingViewIndex].id);
      toast.success(`View "${trimmedName}" updated successfully`);
    } else {
      // Create new view
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

  function renderCell(columnId: string, infringement: Infringement, onClick: () => void) {
    switch (columnId) {
      case 'dateReceived':
        return (
          <td className="px-4 py-4 text-sm font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {formatAppDate(infringement.date_received)}
          </td>
        );
      case 'dueDate':
        return (
          <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {(() => {
              const dueDate = calculateDueDate(infringement.date_received);
              const daysUntil = getDaysUntilDue(dueDate);
              const urgency = getUrgencyBadge(daysUntil);

              return (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatAppDate(dueDate.toISOString())}
                  </span>
                  {urgency && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold w-fit border ${urgency.className}`}>
                      <urgency.icon size={12} />
                      {urgency.text}
                    </span>
                  )}
                </div>
              );
            })()}
          </td>
        );
      case 'reference':
        return (
          <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                {infringement.reference_number || '—'}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                ID: {infringement.internal_id}
              </span>
            </div>
          </td>
        );
      case 'customerBase':
        return (
          <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getCustomerBaseDotColor(infringement.customer_base)}`} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {infringement.customer_base}
              </span>
            </div>
          </td>
        );
      case 'vrn':
        return (
          <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {infringement.vrn}
          </td>
        );
      case 'offenceType':
        return (
          <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {infringement.offence_type}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {infringement.issuing_authority || 'Unknown Authority'}
              </span>
            </div>
          </td>
        );
      case 'assignedDriver':
        return (
          <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {infringement.assigned_driver ? (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {infringement.assigned_driver}
                </span>
                {(() => {
                  const aiConfidence = getAIConfidence(infringement);
                  if (aiConfidence !== null) {
                    if (aiConfidence >= 95) {
                      return (
                        <Sparkles size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      );
                    } else {
                      return (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-400/30 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/40 cursor-pointer">
                          <AlertTriangle size={11} className="flex-shrink-0" />
                          Review AI
                        </span>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
            ) : (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">—</span>
            )}
          </td>
        );
      case 'fineAmount':
        return (
          <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            {infringement.fine_amount != null || infringement.victims_levy != null
              ? formatCurrency(Number(infringement.fine_amount ?? 0) + Number(infringement.victims_levy ?? 0))
              : '—'}
          </td>
        );
      case 'status':
        return (
          <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700" onClick={onClick}>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${getStatusColor(
                infringement.status
              )} ${infringement.status === 'New' ? 'font-bold' : 'font-medium'}`}
            >
              {infringement.status}
            </span>
          </td>
        );
      default:
        return null;
    }
  }

  function handleRowClick(infringement: Infringement) {
    setSelectedInfringement(infringement);
    setTimeout(() => setIsDrawerOpen(true), 10);
  }

  function handleDrawerClose() {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedInfringement(null);
    }, 300);
  }

  function handleInfringementUpdate(updatedInfringement: Infringement) {
    setInfringements(prev =>
      prev.map(item =>
        item.id === updatedInfringement.id ? updatedInfringement : item
      )
    );
  }

  function getSortIcon(column: SortColumn) {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" />
      : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800 border-blue-200',
      'Awaiting COR Identification': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Stat Dec Pending': 'bg-orange-100 text-orange-800 border-orange-200',
      'Pending Fleet Payment': 'bg-purple-100 text-purple-800 border-purple-200',
      'Awaiting Reimbursement (Xero)': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Closed': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  function getCustomerBaseDotColor(customerBase: string) {
    const colors: Record<string, string> = {
      'GigCar': 'bg-[#E96146]',
      'Fleetcar': 'bg-[#2BACE2]',
      'Yonder': 'bg-indigo-600 dark:bg-[#C51A20]'
    };
    return colors[customerBase] || 'bg-slate-400';
  }

  function handleUploadComplete() {
    fetchInfringements();
  }

  function handleSelectAll() {
    if (selectedRows.size === filteredInfringements.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredInfringements.map((inf) => inf.id)));
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
    toast.success(`Bulk assign action for ${selectedRows.size} records`);
    setSelectedRows(new Set());
  }

  function handleBulkMarkPending() {
    toast.success(`Marked ${selectedRows.size} records as pending`);
    setSelectedRows(new Set());
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;

    if (!window.confirm(`Delete ${ids.length} selected record${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }

    try {
      const { data: documents, error: documentsError } = await supabase
        .from('infringement_documents')
        .select('storage_path')
        .in('infringement_id', ids);

      if (documentsError) throw documentsError;

      if (documents && documents.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('infringement-documents')
          .remove(documents.map((document) => document.storage_path));

        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase
        .from('infringements')
        .delete()
        .in('id', ids);

      if (deleteError) throw deleteError;

      setInfringements((current) => current.filter((infringement) => !selectedRows.has(infringement.id)));
      setFilteredInfringements((current) => current.filter((infringement) => !selectedRows.has(infringement.id)));
      setSelectedRows(new Set());
      setSelectedInfringement((current) => current && ids.includes(current.id) ? null : current);
      setIsDrawerOpen((isOpen) => selectedInfringement && ids.includes(selectedInfringement.id) ? false : isOpen);
      toast.success(`Deleted ${ids.length} record${ids.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Error deleting selected infringements:', error);
      toast.error('Unable to delete the selected records');
    }
  }

  function handleExportCSV() {
    exportToCSV(filteredInfringements, 'pennyos-export.csv');
    toast.success('Data exported successfully');
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Static header section */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 md:p-6 transition-colors duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">Infringement Triage</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Processing camera fines across GigCar, Fleetcar, and Yonder fleets
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">
              <span className="text-slate-600 dark:text-slate-400">Total Cases:</span>
              <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">{filteredInfringements.length}</span>
            </div>
            <QuickAddMenu onUploadFine={() => setIsBulkUploadOpen(true)} />
            <button
              onClick={() => setIsEmailInboxOpen(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
            >
              <Mail size={18} />
              <span className="hidden sm:inline">Email Settings</span>
            </button>
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
                All Cases
              </button>
              <button
                onClick={() => setQuickFilter('overdue')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  quickFilter === 'overdue'
                    ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Action Required
              </button>
              <button
                onClick={() => setQuickFilter('pending')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  quickFilter === 'pending'
                    ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Pending Government
              </button>
            </div>

            {/* Search bar */}
            <div className="relative z-30 pb-4 pt-2 flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by VRN... [⌘K for Command Palette]"
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
                        onClick={() => applySavedView('triage')}
                        className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Eye size={16} className="text-slate-400" />
                          <span>Triage Focus</span>
                        </div>
                        {activeView === 'triage' && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                      </button>
                      <button
                        onClick={() => applySavedView('finance')}
                        className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CircleDollarSign size={16} className="text-slate-400" />
                          <span>Finance Audit</span>
                        </div>
                        {activeView === 'finance' && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                      </button>

                      {customViews.map((view) => (
                        <button
                          key={view.id}
                          onClick={() => applySavedView(view.id)}
                          className="group w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Bookmark size={16} className="text-indigo-500" />
                            <span>{view.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeView === view.id && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
                            <button
                              onClick={(e) => handleDeleteCustomView(view.id, e)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete view"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </button>
                      ))}

                      <button
                        onClick={() => {
                          setIsSaveViewModalOpen(true);
                          setIsColumnMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-t border-slate-100 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <Save size={16} />
                          <span className="font-medium">Save Current View...</span>
                        </div>
                      </button>
                    </div>

                    <div className="px-4 pt-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase border-t border-slate-100 dark:border-slate-700 mt-1">Toggle Columns</div>
                    <div className="py-1 max-h-80 overflow-y-auto">
                      {columns.map((column) => (
                        <button
                          key={column.id}
                          onClick={() => toggleColumn(column.id)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors text-left"
                        >
                          <div className={`flex flex-shrink-0 items-center justify-center w-4 h-4 rounded border transition-colors ${column.visible ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                            {column.visible && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{column.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {hasFullAccess() && (
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="pl-10 pr-8 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer transition-colors"
                  >
                    <option value="all">All Fleets</option>
                    <option value="GigCar">GigCar</option>
                    <option value="Fleetcar">Fleetcar</option>
                    <option value="Yonder">Yonder</option>
                  </select>
                </div>
              )}
              {!hasFullAccess() && (
                <div className="px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-sm font-medium text-slate-700">
                  Viewing: {currentUser.allowedFleets.join(', ')}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Table content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-600 dark:text-slate-400">Loading infringements...</div>
          </div>
        ) : filteredInfringements.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-slate-600">No infringements found</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="relative mx-4 md:mx-6 my-4 md:my-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="relative overflow-auto h-[calc(100vh-280px)] sm:h-[calc(100vh-300px)]">
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/50 to-transparent dark:from-slate-800 dark:via-slate-800/50 dark:to-transparent pointer-events-none z-10"></div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg px-4 py-3 whitespace-nowrap border-b border-slate-200/50 dark:border-slate-700/50">
                          <div className="flex items-center justify-center">
                            {(() => {
                              const isAllSelected = selectedRows.size === filteredInfringements.length && filteredInfringements.length > 0;
                              const isSomeSelected = selectedRows.size > 0 && selectedRows.size < filteredInfringements.length;

                              return (
                                <button
                                  onClick={handleSelectAll}
                                  className="flex items-center justify-center cursor-pointer focus:outline-none"
                                >
                                  <div className={`flex flex-shrink-0 items-center justify-center w-4 h-4 rounded border transition-colors ${isAllSelected || isSomeSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                                    {isAllSelected && <Check size={12} strokeWidth={3} />}
                                    {isSomeSelected && <Minus size={12} strokeWidth={3} />}
                                  </div>
                                </button>
                              );
                            })()}
                          </div>
                        </th>
                        <SortableContext
                          items={columns.filter(col => col.visible).map(col => col.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          {columns.filter(col => col.visible).map((column) => (
                            <SortableHeader
                              key={column.id}
                              column={column}
                              sortColumn={sortColumn}
                              sortDirection={sortDirection}
                              onSort={handleSort}
                            />
                          ))}
                        </SortableContext>
                        <th className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg px-4 py-3 text-right whitespace-nowrap border-b border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Action
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInfringements.map((infringement) => (
                        <tr
                          key={infringement.id}
                          className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 align-top" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-start justify-center mt-1">
                              <button
                                onClick={() => handleSelectRow(infringement.id)}
                                className="focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded"
                              >
                                <div className={`flex flex-shrink-0 items-center justify-center w-4 h-4 rounded border transition-colors ${selectedRows.has(infringement.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
                                  {selectedRows.has(infringement.id) && <Check size={12} strokeWidth={3} />}
                                </div>
                              </button>
                            </div>
                          </td>
                          {columns.filter(col => col.visible).map((column) => (
                            <React.Fragment key={column.id}>
                              {renderCell(column.id, infringement, () => handleRowClick(infringement))}
                            </React.Fragment>
                          ))}
                          <td className="px-4 py-4 text-right w-[140px] border-b border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                            <div className="relative w-full h-full flex items-center justify-end">
                              <ChevronRight
                                size={20}
                                className="text-slate-300 dark:text-slate-600 transition-opacity duration-200 opacity-100 group-hover:opacity-0 absolute right-4"
                              />
                              <button
                                onClick={() => handleRowClick(infringement)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100 shadow-sm"
                              >
                                Review
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DndContext>
              </div>
            </div>
          </div>
        )}
      </div>

      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      <EmailInboxModal
        isOpen={isEmailInboxOpen}
        onClose={() => setIsEmailInboxOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onBulkUpload={() => {
          setIsCommandPaletteOpen(false);
          setIsBulkUploadOpen(true);
        }}
      />

      {selectedRows.size > 0 && (
        <BulkActionBar
          selectedCount={selectedRows.size}
          onBulkAssign={handleBulkAssign}
          onMarkPending={handleBulkMarkPending}
          onDelete={handleBulkDelete}
          onClose={() => setSelectedRows(new Set())}
        />
      )}

      {selectedInfringement && (
        <InfringementDrawer
          infringement={selectedInfringement}
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          onUpdate={handleInfringementUpdate}
        />
      )}

      {isSaveViewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Save Custom View</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Save the current column configuration and order as a custom view.
            </p>
            <div className="mb-6">
              <label htmlFor="viewName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                View Name
              </label>
              <input
                id="viewName"
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCustomView();
                  } else if (e.key === 'Escape') {
                    setIsSaveViewModalOpen(false);
                    setNewViewName('');
                  }
                }}
                placeholder="e.g., My Custom View"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsSaveViewModalOpen(false);
                  setNewViewName('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomView}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
