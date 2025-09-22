import api from './axios';

export type BackupRecord = {
  id: number;
  initiated_by: any;
  created_at: string;
  base_path: string;
  archive_path: string;
  format: 'json';
  include_media: boolean;
  status: 'pending' | 'success' | 'failed';
  file_size: number | null;
  message?: string | null;
};

// backupService.ts - Update to match new API
export async function initiateBackup(params: {
  include_media?: boolean;
}) {
  try {
    const { data } = await api.post<Blob>('/backup/', { format: 'json', ...params }, {
      responseType: 'blob'
    });
    return data;
  } catch (error: any) {
    console.error('Backup error:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Backup failed');
  }
}

export async function initiateRestore(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('confirm_wipe', 'true');

  const { data } = await api.post<{ detail: string }>('/restore/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return data;
}

export async function listBackups() {
  const { data } = await api.get<BackupRecord[]>('/backups/');
  return data;
}