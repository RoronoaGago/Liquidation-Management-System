import { useEffect, useRef, useState } from 'react';
import { initiateBackup, initiateRestore, listBackups, type BackupRecord } from '@/api/backupService';
import Button from '@/components/ui/button/Button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import Badge from '@/components/ui/badge/Badge';

const BackupRestorePage = () => {
  const [path, setPath] = useState('');
  const [format, setFormat] = useState<'json' | 'sql' | 'csv'>('json');
  const [includeMedia, setIncludeMedia] = useState(true);
  const [archivePath, setArchivePath] = useState('');
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    try {
      const data = await listBackups();
      setBackups(data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Ensure fallback folder input has directory attributes for browsers that support them
  useEffect(() => {
    if (folderInputRef.current) {
      try {
        folderInputRef.current.setAttribute('webkitdirectory', '');
        folderInputRef.current.setAttribute('directory', '');
      } catch {
        // ignore
      }
    }
  }, []);

  async function onBackup() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await initiateBackup({ path, format, include_media: includeMedia });
      setMessage(res.message ?? 'Backup created successfully');
      setMessageType('success');
      await refresh();
    } catch (e: any) {
      setMessage(e?.response?.data?.detail || 'Backup failed');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function onRestore() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await initiateRestore({ archive_path: archivePath });
      setMessage(res.detail);
      setMessageType('success');
    } catch (e: any) {
      setMessage(e?.response?.data?.detail || 'Restore failed');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function pickDestinationFolder() {
    try {
      // @ts-expect-error: Not in all TS DOM lib versions
      if (window.showDirectoryPicker) {
        // @ts-expect-error: Not in all TS DOM lib versions
        const handle = await window.showDirectoryPicker();
        if (handle?.name) {
          // Browsers do not expose absolute filesystem paths; use name for display
          setPath((prev) => (prev ? prev : handle.name));
        }
        return;
      }
    } catch {
      // fall back
    }
    folderInputRef.current?.click();
  }

  function onFolderInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const first: File & { webkitRelativePath?: string } = files[0] as any;
    const rel = first.webkitRelativePath || '';
    const folderName = rel.split('/')[0] || '';
    if (folderName) setPath((prev) => (prev ? prev : folderName));
    e.target.value = '';
  }

  async function pickArchiveFile() {
    try {
      // @ts-expect-error: Not in all TS DOM lib versions
      if (window.showOpenFilePicker) {
        // @ts-expect-error: Not in all TS DOM lib versions
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'Backup Archives',
              accept: {
                'application/zip': ['.zip'],
                'application/json': ['.json'],
                'application/sql': ['.sql'],
                'text/csv': ['.csv']
              }
            }
          ]
        });
        if (handle?.name) setArchivePath((prev) => (prev ? prev : handle.name));
        return;
      }
    } catch {
      // fall back
    }
    fileInputRef.current?.click();
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivePath((prev) => (prev ? prev : file.name));
    e.target.value = '';
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
      case 'pending': return (
        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  // SVG Icons for UI elements
  const DownloadIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );

  const UploadIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );

  const FolderIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );

  const FileIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const DatabaseIcon = () => (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );

  const BackupIcon = () => (
    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m7 1V3m-3 18v-4m6 4v-4" />
    </svg>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <BackupIcon />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backup & Restore</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your system backups and restore data</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${messageType === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Backup Card */}
        <div className="border rounded-xl p-5 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
          <h2 className="text-lg font-semibold mb-3 flex items-center text-gray-800 dark:text-white">
            <DownloadIcon />
            Create Backup
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Export your data to a backup file</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Destination Path</label>
              <div className="flex gap-2">
                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="e.g. C:\\Backups\\LMS"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button variant="outline" onClick={pickDestinationFolder} className="whitespace-nowrap">
                  <FolderIcon />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use folder picker (if supported)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Format</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DatabaseIcon />
                </div>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="json">JSON</option>
                  <option value="sql">SQL (SQLite only)</option>
                  <option value="csv">CSV (limited)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800/50">
              <input 
                id="include-media" 
                type="checkbox" 
                checked={includeMedia} 
                onChange={(e) => setIncludeMedia(e.target.checked)} 
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="include-media" className="text-sm text-gray-700 dark:text-gray-300">
                Include media files
              </label>
            </div>

            <Button 
              onClick={onBackup} 
              disabled={loading || !path}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <DownloadIcon />
                  Start Backup
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="border rounded-xl p-5 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
          <h2 className="text-lg font-semibold mb-3 flex items-center text-gray-800 dark:text-white">
            <UploadIcon />
            Restore From Archive
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Import data from a backup file</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Archive Path</label>
              <div className="flex gap-2">
                <input
                  value={archivePath}
                  onChange={(e) => setArchivePath(e.target.value)}
                  placeholder="e.g. C:\\Backups\\LMS\\backup_20250101_120000.json.zip"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <Button variant="outline" onClick={pickArchiveFile} className="whitespace-nowrap">
                  <FileIcon />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pick .zip/.json/.sql/.csv files</p>
            </div>

            <Button 
              onClick={onRestore} 
              disabled={loading || !archivePath} 
              className="w-full border border-green-300 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Restoring...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <UploadIcon />
                  Restore
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Backup History */}
      <div className="border rounded-xl p-5 shadow-sm bg-white dark:bg-gray-800">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Backup History</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Recently created backups</p>
        
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="max-w-full overflow-x-auto">
            <Table className="divide-y divide-gray-200 dark:divide-gray-700">
              <TableHeader className="bg-gray-50 dark:bg-gray-700/30">
                <TableRow>
                  <TableCell isHeader className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase">Created</TableCell>
                  <TableCell isHeader className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase">Format</TableCell>
                  <TableCell isHeader className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase">Archive Path</TableCell>
                  <TableCell isHeader className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase">Size</TableCell>
                  <TableCell isHeader className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase">Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                {backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No backups found. Create your first backup to see it listed here.
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((b) => (
                    <TableRow key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <TableCell className="px-6 py-4 text-start text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(b.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(b.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-start text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {b.format.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-start text-sm break-all font-medium text-gray-900 dark:text-white">
                        {b.archive_path || '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-start text-sm text-gray-600 dark:text-gray-400">
                        {b.file_size ? `${(b.file_size/1024/1024).toFixed(2)} MB` : '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-start text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(b.status)}
                          <Badge color={b.status === 'success' ? 'success' : b.status === 'pending' ? 'warning' : 'error'}>
                            {b.status}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Hidden inputs for fallback selection */}
      <input ref={folderInputRef} type="file" className="hidden" onChange={onFolderInputChange} multiple />
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileInputChange} accept=".zip,.json,.sql,.csv" />
    </div>
  );
};

export default BackupRestorePage;