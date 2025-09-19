import api from './axios';

export type BackupRecord = {
  id: number;
  initiated_by: any;
  created_at: string;
  base_path: string;
  archive_path: string;
<<<<<<< HEAD
  format: 'json' | 'sql' | 'csv';
=======
  format: 'json';
>>>>>>> faeea8c2c0f1294d7140681e25884100552f54ac
  include_media: boolean;
  status: 'pending' | 'success' | 'failed';
  file_size: number | null;
  message?: string | null;
};

<<<<<<< HEAD
export async function initiateBackup(params: { 
  path: string; 
  format?: 'json' | 'sql' | 'csv'; 
  include_media?: boolean; 
}) {
  try {
    const { data } = await api.post<BackupRecord>('/backup/', params);
=======
// backupService.ts - Update to match new API
export async function initiateBackup(params: {
  include_media?: boolean;
}) {
  try {
    const { data } = await api.post<Blob>('/backup/', { format: 'json', ...params }, {
      responseType: 'blob'
    });
>>>>>>> faeea8c2c0f1294d7140681e25884100552f54ac
    return data;
  } catch (error: any) {
    console.error('Backup error:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Backup failed');
  }
}

<<<<<<< HEAD
export async function listBackups() {
  const { data } = await api.get<BackupRecord[]>('/backups/');
  return data;
}

export async function initiateRestore(params: { archive_path?: string; backup_id?: number; }) {
  const { data } = await api.post<{ detail: string }>('restore/', params);
  return data;
}


=======
export async function initiateRestore(file: File) {
  const formData = new FormData();
  formData.append('file', file);

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
>>>>>>> faeea8c2c0f1294d7140681e25884100552f54ac
