import { Pipe, PipeTransform } from '@angular/core';

/** "2 hours ago", "3 days ago" etc. */
@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null): string {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }
}

/** Bytes to human-readable: "1.5 MB" */
@Pipe({ name: 'fileSize', standalone: true })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number | null): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }
}

/** Truncate long text: "Hello wo..." */
@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null, maxLength = 50): string {
    if (!value) return '';
    return value.length > maxLength ? value.slice(0, maxLength) + '...' : value;
  }
}

/** Status to badge variant mapping */
@Pipe({ name: 'statusVariant', standalone: true })
export class StatusVariantPipe implements PipeTransform {
  transform(status: string | null): string {
    const map: Record<string, string> = {
      active: 'success', trial: 'info', published: 'success',
      pending: 'warning', draft: 'neutral', past_due: 'warning',
      cancelled: 'danger', expired: 'danger', suspended: 'danger',
      deprecated: 'neutral', revoked: 'danger', accepted: 'success',
    };
    return map[status ?? ''] ?? 'neutral';
  }
}
