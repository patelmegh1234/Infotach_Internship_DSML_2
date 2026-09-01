import { useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { classNames } from '@/utils/helpers';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T extends object>({
  columns,
  rows,
  initialSort,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  onRowClick?: (row: T) => void;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);

  const sorted = [...rows].sort((a, b) => {
    if (!sort) return 0;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return 0;
    const av = col.sortValue ? col.sortValue(a) : (a[sort.key as keyof T] as unknown as string | number);
    const bv = col.sortValue ? col.sortValue(b) : (b[sort.key as keyof T] as unknown as string | number);
    if (av === bv) return 0;
    const cmp = av > bv ? 1 : -1;
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'asc' };
    });
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={classNames('text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400', c.className)}
              >
                {c.sortValue ? (
                  <button onClick={() => toggleSort(String(c.key))} className="inline-flex items-center gap-1 hover:text-white transition">
                    {c.header}
                    {sort?.key === String(c.key) ? (
                      sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={classNames(
                'border-b border-white/5 transition-colors',
                onRowClick ? 'cursor-pointer hover:bg-white/5' : 'hover:bg-white/[0.02]',
              )}
            >
              {columns.map((c) => (
                <td key={String(c.key)} className={classNames('px-3 py-2.5 text-slate-300', c.className)}>
                  {c.render ? c.render(row) : String(row[c.key as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500 text-sm">
                No matching records.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
