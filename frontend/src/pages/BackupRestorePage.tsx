import { useEffect, useRef, useState } from "react";
import {
  initiateBackup,
  initiateRestore,
  listBackups,
  type BackupRecord,
  type RestoreResponse,
} from "@/api/backupService";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import DynamicContextualHelp from "@/components/help/DynamicContextualHelpComponent";

const BackupRestorePage = () => {
  const [includeMedia, setIncludeMedia] = useState(false);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const data = await listBackups();
      setBackups(data);
    } catch (error) {
      console.error("Failed to load backups:", error);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onBackup() {
    setLoading(true);
    setMessage(null);
    try {
      const payload = { include_media: includeMedia };
      const blob = await initiateBackup(payload);

      // Try to use the File System Access API if available
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `backup_${
              new Date().toISOString().split("T")[0]
            }.zip`,
            types: [
              {
                description: "ZIP Files",
                accept: { "application/zip": [".zip"] },
              },
            ],
          });

          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();

          setMessage("Backup created and saved successfully");
          setMessageType("success");
        } catch (saveError: any) {
          if (saveError.name !== "AbortError") {
            // User canceled the save dialog, fall back to automatic download
            downloadBlob(blob);
            setMessage("Backup created successfully (saved to downloads)");
            setMessageType("success");
          }
        }
      } else {
        // Fallback for browsers that don't support the File System Access API
        downloadBlob(blob);
        setMessage("Backup created successfully (saved to downloads)");
        setMessageType("success");
      }

      await refresh();
    } catch (e: any) {
      setMessage(e.message || "Backup failed");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  // Helper function to download blob
  function downloadBlob(blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${new Date().toISOString().split("T")[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function onRestore() {
    setRestoreLoading(true);
    setMessage(null);
    try {
      if (!selectedFile) {
        // ← Changed from fileInputRef to selectedFile
        setMessage("Please select a backup file to restore");
        setMessageType("error");
        setRestoreLoading(false);
        return;
      }

      const file = selectedFile; // ← Changed from fileInputRef to selectedFile

      // Show confirmation dialog
      if (
        !window.confirm(
          "⚠️ CRITICAL WARNING ⚠️\n\n" +
            "This restore operation will:\n" +
            "• Replace existing data with backup data\n" +
            "• Log out all current users\n" +
            "• Cannot be undone\n\n" +
            "Are you absolutely sure you want to continue?"
        )
      ) {
        setRestoreLoading(false);
        return;
      }

      // Use the corrected initiateRestore function
      const res: RestoreResponse = await initiateRestore(file, true);

      if (res.auto_login && res.tokens) {
        // Store new tokens and refresh the page
        localStorage.setItem("access_token", res.tokens.access);
        localStorage.setItem("refresh_token", res.tokens.refresh);

        setMessage(`${res.detail} Redirecting...`);
        setMessageType("success");

        // Short delay before refresh to show message
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage(`${res.detail} ${res.note || ""}`);
        setMessageType("success");

        // Refresh the backup list
        await refresh();
      }
    } catch (e: any) {
      setMessage(e.message || "Restore failed");
      setMessageType("error");
    } finally {
      setRestoreLoading(false);
      // Clear file input and state
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null); // ← Clear the state as well
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return (
          <svg
            className="w-4 h-4 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "pending":
        return (
          <svg
            className="w-4 h-4 text-amber-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  // SVG Icons
  const DownloadIcon = () => (
    <svg
      className="w-5 h-5 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );

  const UploadIcon = () => (
    <svg
      className="w-5 h-5 mr-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );

  const BackupIcon = () => (
    <svg
      className="w-6 h-6 text-blue-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m7 1V3m-3 18v-4m6 4v-4"
      />
    </svg>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <BackupIcon />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Backup & Restore
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your system backups and restore data
          </p>
        </div>
      </div>
      <DynamicContextualHelp variant="inline" className="mb-6" /> 

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            messageType === "success"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : messageType === "error"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Backup Card */}
        <div className="border rounded-xl p-5 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-between min-h-[200px]">
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center text-gray-800 dark:text-white">
              <DownloadIcon />
              Create Backup
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Export your data to a backup file that will be downloaded
              automatically
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800/50">
                <input
                  id="include-media"
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="include-media"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Include media files
                </label>
              </div>
            </div>
          </div>
          <Button
            onClick={onBackup}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
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

        {/* Restore Card */}
        <div className="border rounded-xl p-5 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-between min-h-[200px]">
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center text-gray-800 dark:text-white">
              <UploadIcon />
              Restore From Backup
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload a backup file to restore your system data
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Backup File
                </label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] || null);
                    setMessage(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select a backup ZIP file previously created by the system
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={onRestore}
            disabled={restoreLoading || !selectedFile}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {restoreLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
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

      {/* Backup History */}
      <div className="border rounded-xl p-5 shadow-sm bg-white dark:bg-gray-800">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          Backup History
        </h2>

        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="max-w-full overflow-x-auto">
            <Table className="divide-y divide-gray-200 dark:divide-gray-700">
              <TableHeader className="bg-gray-50 dark:bg-gray-700/30">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase"
                  >
                    Created
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase"
                  >
                    File Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase"
                  >
                    Size
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-start text-xs uppercase"
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                {backups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No backups found. Create your first backup to see it
                      listed here.
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((b) => (
                    <TableRow
                      key={b.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
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
                      <TableCell className="px-6 py-4 text-start text-sm break-all font-medium text-gray-900 dark:text-white">
                        {`backup_${
                          new Date(b.created_at).toISOString().split("T")[0]
                        }.zip`}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-start text-sm text-gray-600 dark:text-gray-400">
                        {b.file_size
                          ? `${(b.file_size / 1024 / 1024).toFixed(2)} MB`
                          : "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-start text-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(b.status)}
                            <Badge
                              color={
                                b.status === "success"
                                  ? "success"
                                  : b.status === "pending"
                                  ? "warning"
                                  : "error"
                              }
                            >
                              {b.status}
                            </Badge>
                          </div>
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
    </div>
  );
};

export default BackupRestorePage;
