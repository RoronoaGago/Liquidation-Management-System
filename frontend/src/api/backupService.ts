import api from './axios';

export type BackupRecord = {
  id: number;
  initiated_by: any;
  created_at: string;
  format: 'json';
  include_media: boolean;
  status: 'pending' | 'success' | 'failed';
  file_size: number | null;
  message?: string | null;
};

export type RestoreResponse = {
  detail: string;
  summary?: any;
  auto_login: boolean;
  tokens?: {
    access: string;
    refresh: string;
  };
  note?: string;
};

export async function initiateBackup(params: {
  include_media?: boolean;
}) {
  try {
    const { data } = await api.post<Blob>('/backup/', {
      format: 'json',
      ...params
    }, {
      responseType: 'blob'
    });
    return data;
  } catch (error: any) {
    console.error('Backup error:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Backup failed');
  }
}

export async function initiateRestore(file: File, confirmWipe: boolean = true): Promise<RestoreResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('confirm_wipe', confirmWipe.toString());

  try {
    const { data } = await api.post<RestoreResponse>('/restore/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  } catch (error: any) {
    console.error('Restore error:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Restore failed');
  }
}

export async function listBackups() {
  const { data } = await api.get<BackupRecord[]>('/backups/');
  return data;
}