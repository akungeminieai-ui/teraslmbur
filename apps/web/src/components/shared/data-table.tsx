/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Eye,
  Sliders,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@teras-lmbur/utils';
import { AppButton } from '@teras-lmbur/ui';
import { useTranslations } from 'next-intl';

export interface ColumnDef<T> {
  id?: string;
  header: React.ReactNode;
  accessorKey?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  csvValue?: (item: T) => string;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  storageKey?: string; // Cache key for persisting user layout settings
  exportFilename?: string; // Filename for CSV exports
  highlightedId?: string; // Row ID to highlight
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSort: (field: string) => void;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: React.ReactNode;
  bulkActions?: {
    label: string;
    onClick: (selectedIds: string[]) => void;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
    disabled?: boolean;
  }[];
  emptyState?: {
    title?: string;
    description?: string;
    action?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
  };
  primaryAction?: React.ReactNode;
  onRowClick?: (item: T) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  isLoading = false,
  storageKey,
  exportFilename = 'export',
  highlightedId,
  pagination,
  sorting,
  search,
  filters,
  bulkActions,
  emptyState,
  primaryAction,
  onRowClick,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
}: DataTableProps<T>) {
  const tCommon = useTranslations('common');

  // Selection state (controlled or uncontrolled fallback)
  const [localSelectedIds, setLocalSelectedIds] = React.useState<string[]>([]);
  const selectedIds = controlledSelectedIds !== undefined ? controlledSelectedIds : localSelectedIds;
  const setSelectedIds = React.useCallback(
    (ids: string[]) => {
      if (onSelectionChange) {
        onSelectionChange(ids);
      } else {
        setLocalSelectedIds(ids);
      }
    },
    [onSelectionChange]
  );

  // Clear selections when the actual data items change (using stable ID string comparison
  // to avoid infinite re-renders from unstable array references like `data?.items || []`)
  const dataIds = React.useMemo(() => data.map((item) => item.id).join(','), [data]);
  const prevDataIdsRef = React.useRef(dataIds);
  React.useEffect(() => {
    if (prevDataIdsRef.current !== dataIds) {
      prevDataIdsRef.current = dataIds;
      setSelectedIds([]);
    }
  }, [dataIds, setSelectedIds]);

  // Enterprise Layout State
  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(() => {
    return columns.map((c) => c.accessorKey || c.id || '').filter(Boolean);
  });
  const [density, setDensity] = React.useState<'comfortable' | 'compact'>('compact');
  const [isColumnPickerOpen, setIsColumnPickerOpen] = React.useState(false);

  // Use a ref for pagination callbacks to avoid stale closures without adding
  // the inline `pagination` object to the dependency array (which would cause infinite loops)
  const paginationRef = React.useRef(pagination);
  React.useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // Read Settings from LocalStorage (runs once on mount per storageKey)
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(`table-pref-${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.visibleColumns) {
          setVisibleColumns(parsed.visibleColumns);
        }
        if (parsed.density) {
          setDensity(parsed.density);
        }
        if (parsed.pageSize && paginationRef.current?.onPageSizeChange) {
          paginationRef.current.onPageSizeChange(parsed.pageSize);
        }
      }
    } catch (e) {
      console.error('Failed to load table settings', e);
    }
  }, [storageKey]);

  // Save Settings to LocalStorage
  const handleUpdateVisibleColumns = (updatedKeys: string[]) => {
    setVisibleColumns(updatedKeys);
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(`table-pref-${storageKey}`);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.visibleColumns = updatedKeys;
      localStorage.setItem(`table-pref-${storageKey}`, JSON.stringify(parsed));
    } catch { }
  };

  const handleUpdateDensity = (updatedDensity: 'comfortable' | 'compact') => {
    setDensity(updatedDensity);
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(`table-pref-${storageKey}`);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.density = updatedDensity;
      localStorage.setItem(`table-pref-${storageKey}`, JSON.stringify(parsed));
    } catch { }
  };

  const handleUpdatePageSize = (size: number) => {
    if (pagination?.onPageSizeChange) {
      pagination.onPageSizeChange(size);
    }
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(`table-pref-${storageKey}`);
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.pageSize = size;
      localStorage.setItem(`table-pref-${storageKey}`, JSON.stringify(parsed));
    } catch { }
  };

  // Filter Active Display Columns
  const activeColumns = React.useMemo(() => {
    return columns.filter((col) => {
      const colId = col.accessorKey || col.id || '';
      // Always show selection column, action buttons, or columns without an ID
      if (!colId) return true;
      return visibleColumns.includes(colId);
    });
  }, [columns, visibleColumns]);

  // Selections
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(data.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(
      selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]
    );
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isSomeSelected = data.length > 0 && selectedIds.length > 0 && selectedIds.length < data.length;

  // CSV Export Generator
  const handleExportCsv = () => {
    const visibleCols = activeColumns.filter((col) => col.accessorKey || col.id);
    const headers = visibleCols.map((col) => {
      if (typeof col.header === 'string') return col.header;
      return col.accessorKey || col.id || 'Column';
    });

    const csvRows: string[] = [];
    // UTF-8 BOM to prevent Excel display corruption
    csvRows.push('\ufeff' + headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    for (const item of data) {
      const row = visibleCols.map((col) => {
        let val = '';
        if (col.csvValue) {
          val = col.csvValue(item);
        } else if (col.accessorKey) {
          val = String((item as any)[col.accessorKey] ?? '');
        }
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Search, Filters, Bulk Actions, Layout Configs & CTAs */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {search && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder={search.placeholder || tCommon('searchPlaceholder')}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                aria-label="Search items"
                className="data-table-search-input flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          )}
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Bulk Actions Panel */}
          {selectedIds.length > 0 && bulkActions && (
            <div className="flex items-center gap-2 animate-fade-in mr-2 bg-[var(--accent)]/10 px-3 py-1.5 rounded-lg border border-[var(--border)]">
              <span className="text-xs text-[var(--muted-foreground)] font-semibold whitespace-nowrap">
                {selectedIds.length} {tCommon('table.selected')}
              </span>
              {bulkActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <AppButton
                    key={idx}
                    size="sm"
                    variant={action.variant || 'outline'}
                    leftIcon={Icon ? <Icon className="h-3.5 w-3.5" /> : undefined}
                    onClick={() => action.onClick(selectedIds)}
                    disabled={action.disabled}
                    className="h-8 py-1"
                  >
                    {action.label}
                  </AppButton>
                );
              })}
            </div>
          )}

          {/* CSV Export */}
          <AppButton
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={isLoading || data.length === 0}
            leftIcon={<Download className="h-4 w-4" />}
            className="h-9 py-1 px-3"
            aria-label="Export data as CSV"
          >
            Export
          </AppButton>



          {/* Column Visibility Selector dropdown */}
          <div className="relative">
            <AppButton
              size="sm"
              variant="outline"
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              leftIcon={<Eye className="h-4 w-4" />}
              className="h-9 py-1 px-3"
              aria-label="Toggle visible columns"
              aria-haspopup="dialog"
              aria-expanded={isColumnPickerOpen}
            >
              Columns
            </AppButton>
            {isColumnPickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsColumnPickerOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl z-50 animate-fade-in text-[var(--foreground)]">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]/40">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Visible Columns</span>
                    <button onClick={() => setIsColumnPickerOpen(false)} className="p-1 rounded hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {columns
                      .filter((col) => col.accessorKey || col.id)
                      .map((col) => {
                        const colKey = col.accessorKey || col.id || '';
                        const label = typeof col.header === 'string' ? col.header : colKey;
                        const isChecked = visibleColumns.includes(colKey);
                        return (
                          <label key={colKey} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--accent)]/50 cursor-pointer text-xs transition-colors font-medium">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const next = isChecked
                                  ? visibleColumns.filter((k) => k !== colKey)
                                  : [...visibleColumns, colKey];
                                handleUpdateVisibleColumns(next);
                              }}
                              className="h-3.5 w-3.5 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500"
                            />
                            <span className="truncate">{label}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>

          {primaryAction}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm max-h-[650px] relative">
        <table className="w-full border-collapse text-left text-sm table-fixed min-w-[900px] lg:min-w-full">
          {/* Header */}
          <thead className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)] shadow-sm text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <tr className="bg-[var(--accent)]/20">
              {bulkActions && (
                <th className="w-12 px-5 py-4 sticky left-0 bg-[var(--card)] z-20 border-r border-[var(--border)] shadow-[4px_0_8px_rgba(0,0,0,0.05)]">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="h-4 w-4 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500"
                  />
                </th>
              )}
              {activeColumns.map((col, idx) => {
                const isSorted = sorting && col.accessorKey === sorting.sortBy;
                const isLast = idx === activeColumns.length - 1;
                return (
                  <th
                    key={idx}
                    onClick={() => col.sortable && sorting?.onSort(col.accessorKey!)}
                    className={cn(
                      'px-5 py-4 font-semibold transition-colors select-none relative group',
                      col.sortable && 'cursor-pointer hover:bg-[var(--accent)]/50 hover:text-[var(--foreground)]',
                      isLast && 'sticky right-0 bg-[var(--card)] z-20 border-l border-[var(--border)] shadow-[-4px_0_8px_rgba(0,0,0,0.05)]',
                      col.className
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && sorting && (
                        <span className="text-[var(--muted-foreground)]">
                          {isSorted ? (
                            sorting.sortOrder === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 opacity-35 group-hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
            {isLoading ? (
              // Loading Row Skeletons (keeps component heights static to avoid shifts)
              Array.from({ length: pagination?.pageSize || 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {bulkActions && (
                    <td className="px-5 py-4 w-12 sticky left-0 bg-[var(--card)] z-5 border-r border-[var(--border)] shadow-[4px_0_8px_rgba(0,0,0,0.05)]">
                      <div className="h-4 w-4 rounded bg-[var(--border)]" />
                    </td>
                  )}
                  {activeColumns.map((col, cIdx) => {
                    const isLast = cIdx === activeColumns.length - 1;
                    return (
                      <td
                        key={cIdx}
                        className={cn(
                          'px-5 py-4',
                          isLast && 'sticky right-0 bg-[var(--card)] z-5 border-l border-[var(--border)] shadow-[-4px_0_8px_rgba(0,0,0,0.05)]',
                          col.className
                        )}
                      >
                        <div className="h-4 rounded bg-[var(--border)] w-2/3" />
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={activeColumns.length + (bulkActions ? 1 : 0)} className="px-5 py-16 text-center">
                  {search?.value ? (
                    // Search no result empty state
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-[var(--border)] p-3.5 text-[var(--muted-foreground)]">
                        <FileSpreadsheet className="h-7 w-7" />
                      </div>
                      <h3 className="text-base font-bold text-[var(--foreground)]">No results found</h3>
                      <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                        Try changing your search keyword.
                      </p>
                      <AppButton size="sm" variant="outline" onClick={() => search.onChange('')}>
                        Clear Search
                      </AppButton>
                    </div>
                  ) : (
                    // Default database empty state
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-brand-500/10 p-3.5 text-brand-500">
                        {emptyState?.icon ? <emptyState.icon className="h-7 w-7" /> : <FileSpreadsheet className="h-7 w-7" />}
                      </div>
                      <h3 className="text-base font-bold text-[var(--foreground)]">
                        {emptyState?.title || "No data yet"}
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                        {emptyState?.description || "Create your first item."}
                      </p>
                      {(emptyState?.action || primaryAction) && (
                        <div className="pt-2">{emptyState?.action || primaryAction}</div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              // Live Rows
              data.map((item) => (
                <tr
                  key={item.id}
                  id={`row-${item.id}`}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'transition-colors border-b border-[var(--border)]/40 group/row',
                    onRowClick && 'cursor-pointer',
                    item.id === highlightedId
                      ? 'bg-brand-500/10 hover:bg-brand-500/15 border-brand-500/30'
                      : 'hover:bg-[var(--accent)]/30'
                  )}
                >
                  {bulkActions && (
                    <td
                      className={cn(
                        'px-5 py-2.5 w-12 sticky left-0 z-5 border-r border-[var(--border)] shadow-[4px_0_8px_rgba(0,0,0,0.05)] transition-colors',
                        item.id === highlightedId
                          ? 'bg-brand-900/20 group-hover/row:bg-brand-900/30'
                          : 'bg-[var(--card)] group-hover/row:bg-[var(--accent)]/50'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                        aria-label={`Select row ${item.id}`}
                        className="h-4 w-4 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500"
                      />
                    </td>
                  )}
                  {activeColumns.map((col, cIdx) => {
                    const isLast = cIdx === activeColumns.length - 1;
                    return (
                      <td
                        key={cIdx}
                        className={cn(
                          'px-5 text-sm text-[var(--foreground)] font-medium truncate',
                          density === 'comfortable' ? 'py-3.5' : 'py-1.5',
                          isLast && cn(
                            'sticky right-0 z-5 border-l border-[var(--border)] shadow-[-4px_0_8px_rgba(0,0,0,0.05)] transition-colors',
                            item.id === highlightedId
                              ? 'bg-brand-900/20 group-hover/row:bg-brand-900/30'
                              : 'bg-[var(--card)] group-hover/row:bg-[var(--accent)]/50'
                          ),
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(item)
                          : col.accessorKey
                            ? (item as any)[col.accessorKey]
                            : null}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination && data.length > 0 && (
        <div className="flex flex-col gap-3 items-center justify-between border-t border-[var(--border)] bg-[var(--accent)]/10 px-5 py-4 sm:flex-row rounded-xl">
          <span className="text-xs text-[var(--muted-foreground)] font-semibold">
            {tCommon('table.showing', { count: data.length, total: pagination.total })}
          </span>
          <div className="flex items-center gap-4">
            {pagination.onPageSizeChange && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--muted-foreground)] font-semibold">{tCommon('table.rows')}:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => handleUpdatePageSize(Number(e.target.value))}
                  className="rounded border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 text-xs focus:outline-none"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-1">
              <AppButton
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </AppButton>
              <span className="text-xs font-semibold px-2 font-mono">
                {pagination.page} / {pagination.totalPages}
              </span>
              <AppButton
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
