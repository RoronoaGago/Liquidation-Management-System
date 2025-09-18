import api from './axios';

export type BackupRecord = {
  id: number;
  initiated_by: any;
  created_at: string;
  base_path: string;
  archive_path: string;
  format: 'json' | 'sql' | 'csv';
  include_media: boolean;
  status: 'pending' | 'success' | 'failed';
  file_size: number | null;
  message?: string | null;
};

export async function initiateBackup(params: { 
  path: string; 
  format?: 'json' | 'sql' | 'csv'; 
  include_media?: boolean; 
}) {
  try {
    const { data } = await api.post<BackupRecord>('/backup/', params);
    return data;
  } catch (error: any) {
    console.error('Backup error:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Backup failed');
  }
}

export async function listBackups() {
  const { data } = await api.get<BackupRecord[]>('/backups/');
  return data;
}

export async function initiateRestore(params: { archive_path?: string; backup_id?: number; }) {
  const { data } = await api.post<{ detail: string }>('restore/', params);
  return data;
}


