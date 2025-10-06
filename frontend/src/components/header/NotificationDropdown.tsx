/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-dupe-else-if */
import { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from "@/services/notificationService";
import { useWebSocket } from "@/hooks/useWebSocket";
import { BellIcon } from "@heroicons/react/outline";

interface Notification {
  id: string;
  notification_title: string;
  details: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  notification_date: string;
  is_read: boolean;
}

interface NotificationResponse {
  results: Notification[];
  count: number;
  next: string | null;
  previous: string | null;
  current_page: number;
  page_size: number;
  total_pages: number;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null); // Modal state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // WebSocket integration
  useWebSocket({
    onNotification: (data) => {
      console.log('New notification received via WebSocket:', data);
      // Add new notification to the beginning of the list
      if (data.notification) {
        setNotifications(prev => [data.notification, ...prev]);
        setHasUnread(true);
        setTotalCount(prev => prev + 1);
      }
    },
    onLiquidationReminder: (data) => {
      console.log('Liquidation reminder received via WebSocket:', data);
      // Handle liquidation reminder notifications
      if (data.notification) {
        const reminderNotification = {
          id: `reminder_${data.notification.liquidation_id}_${Date.now()}`,
          notification_title: `Liquidation Reminder: ${data.notification.days_left} days remaining`,
          details: data.notification.message,
          sender: {
            id: 'system',
            first_name: 'System',
            last_name: 'Reminder',
            profile_picture: undefined
          },
          notification_date: new Date().toISOString(),
          is_read: false
        };
        
        setNotifications(prev => [reminderNotification, ...prev]);
        setHasUnread(true);
        setTotalCount(prev => prev + 1);
        
        // Show browser notification if permission is granted
        if (Notification.permission === 'granted') {
          new Notification('Liquidation Reminder', {
            body: data.notification.message,
            icon: '/favicon.ico'
          });
        }
      }
    },
    onConnected: () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    },
    onDisconnected: () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    }
  });

  useEffect(() => {
    if (user?.user_id) {
      fetchNotifications();

      // Request browser notification permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Use WebSocket for real-time updates, fallback to polling if WebSocket is not connected
      const pollInterval = wsConnected ? 300000 : 60000; // 5 minutes if WS connected, 1 minute if not
      const interval = setInterval(fetchNotifications, pollInterval);
      return () => clearInterval(interval);
    }
  }, [user?.user_id, wsConnected]);

  const fetchNotifications = async (page: number = 1) => {
    setLoading(true);
    try {
      const data: NotificationResponse = await getNotifications(page, 20);
      setNotifications(data.results);
      setHasUnread(data.results.some((n: Notification) => !n.is_read));
      setCurrentPage(data.current_page);
      setTotalPages(data.total_pages);
      setTotalCount(data.count);
      console.log(data);
    } catch (error) {
      console.error("Failed to fetch notification:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to sort notifications: unread first, then by date descending
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.is_read === b.is_read) {
      // Newest first
      return (
        new Date(b.notification_date).getTime() -
        new Date(a.notification_date).getTime()
      );
    }
    // Unread first
    return a.is_read ? 1 : -1;
  });

  const handleNotificationClick = async (notificationId: string) => {
    try {
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification) return;

      await markAsRead(notificationId);

      // Move the notification down the list by marking as read and sorting again
      const updatedNotifications = notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      setNotifications(updatedNotifications);
      setHasUnread(
        updatedNotifications.some((n) => !n.is_read && n.id !== notificationId)
      );

      // Show modal with notification details
      setSelectedNotification(notification);

      // Do not close dropdown here, let modal handle navigation/close
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Refresh notifications to reflect changes
      await fetchNotifications(currentPage);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      // Remove from local state
      const updatedNotifications = notifications.filter((n) => n.id !== notificationId);
      setNotifications(updatedNotifications);
      setHasUnread(updatedNotifications.some((n) => !n.is_read));
      setTotalCount(totalCount - 1);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
      setHasUnread(false);
      setTotalCount(0);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchNotifications(page);
  };

  // Extracted navigation logic for modal action
  const handleNotificationNavigation = (notification: Notification) => {
    if (!notification) return;

    if (
      notification.notification_title === "Request ready for liquidation" ||
      notification.notification_title === "Liquidation Needs Revision"
    ) {
      navigate("/liquidation");
    } else if (
      notification.notification_title === "Your request was approved" ||
      notification.notification_title === "Your request was rejected"
    ) {
      navigate("/requests-history");
    } else if (
      notification.notification_title === "New Liquidation Submitted"
    ) {
      navigate("/pre-auditing");
    } else if (
      notification.notification_title === "Liquidation Approved by District" &&
      user?.role === "liquidator"
    ) {
      navigate("/liquidation-finalize");
    } else if (
      notification.notification_title === "Liquidation Approved by District" &&
      user?.role === "school_head"
    ) {
      navigate("/liquidation");
    } else if (notification.notification_title.includes("New Request")) {
      navigate("/schools-priorities-submissions");
    } else if (notification.details.includes("for accounting")) {
      navigate("/approved-requests");
    } else if (
      notification.notification_title === "New Liquidation Submitted" &&
      user?.role === "district_admin"
    ) {
      navigate("/pre-auditing");
    } else if (
      notification.notification_title === "Liquidation Under District Review" ||
      notification.notification_title === "Liquidation Submitted"
    ) {
      navigate("/liquidation");
    }

    closeDropdown();
    setSelectedNotification(null);
  };

  function toggleDropdown() {
    setIsOpen(!isOpen);
    if (!isOpen && hasUnread) {
      // Optionally mark all as read when opening dropdown
      // markAllAsRead();
    }
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hr ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  // Generate initials from a user object
  const getSenderInitials = (sender: Notification["sender"]) => {
    if (!sender) return "U";
    const firstNameChar = sender.first_name?.charAt(0) || "";
    const lastNameChar = sender.last_name?.charAt(0) || "";
    return `${firstNameChar}${lastNameChar}`.toUpperCase() || "U";
  };

  // Generate a color based on sender id or name
  const getSenderAvatarColor = (sender: Notification["sender"]) => {
    if (!sender) return "bg-gray-500";
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-indigo-500",
    ];
    const stringId = sender.id?.toString() || "";
    const hash =
      stringId && typeof stringId === "string"
        ? stringId.charCodeAt(0) + stringId.charCodeAt(stringId.length - 1)
        : (typeof sender.first_name === "string"
            ? sender.first_name.charCodeAt(0)
            : 0) +
          (typeof sender.last_name === "string"
            ? sender.last_name.charCodeAt(0)
            : 0);

    return colors[hash % colors.length];
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {/* Notification count badge */}
        {hasUnread && (
          <span className="absolute -top-1 -right-1 z-10 flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
            {notifications.filter((n) => !n.is_read).length}
          </span>
        )}
        {/* WebSocket connection indicator */}
        <span className={`absolute -bottom-1 -right-1 z-10 w-3 h-3 rounded-full border-2 border-white ${
          wsConnected ? 'bg-green-500' : 'bg-gray-400'
        }`} title={wsConnected ? 'Real-time connected' : 'Real-time disconnected'} />
        {/* Use BellIcon from icons */}
        <BellIcon className="fill-current" width={20} height={20} />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications ({totalCount})
          </h5>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAllNotifications}
                className="text-xs px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                title="Delete all notifications"
              >
                Clear all
              </button>
            )}
            <button
              onClick={closeDropdown}
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                className="fill-current"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C6.21967 6.98841 5.92678 6.65263 5.51256 6.65263C5.09835 6.65263 4.80546 6.98841 4.80546 7.28131L9.52413 12L4.80546 16.7186C4.80546 17.0115 5.09835 17.3473 5.51256 17.3473C5.92678 17.3473 6.21967 17.0115 6.21967 16.7186L10.9383 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {sortedNotifications.length > 0 ? (
            sortedNotifications.map((notification) => (
              <li key={notification.id}>
                <DropdownItem
                  onItemClick={() => handleNotificationClick(notification.id)}
                  className={`flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${
                    !notification.is_read
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}
                >
                  <span className="relative block w-full h-10 rounded-full z-1 max-w-10">
                    {notification.sender &&
                    notification.sender.profile_picture ? (
                      <img
                        width={40}
                        height={40}
                        src={notification.sender.profile_picture}
                        alt={notification.sender.first_name}
                        className="w-full overflow-hidden rounded-full"
                      />
                    ) : (
                      <span
                        className={`flex items-center justify-center w-full h-full rounded-full text-white font-bold text-lg ${getSenderAvatarColor(
                          notification.sender || {}
                        )}`}
                      >
                        {getSenderInitials(notification.sender || {})}
                      </span>
                    )}
                    <span className="absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white bg-success-500 dark:border-gray-900"></span>
                  </span>

                  <span className="block flex-1">
                    <span className="mb-1.5 block text-theme-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {notification.sender
                          ? `${notification.sender.first_name} ${notification.sender.last_name}`
                          : "Unknown Sender"}
                      </span>
                      <span> {notification.notification_title}</span>
                    </span>
                    {/* Display notification details here */}
                    {notification.details && (
                      <span className="block text-xs text-gray-600 dark:text-gray-300 mb-1">
                        {notification.details}
                      </span>
                    )}
                    
                  </span>
                </DropdownItem>
              </li>
            ))
          ) : (
            <li className="flex items-center justify-center p-4 text-gray-500">
              {loading ? "Loading..." : "No notifications available"}
            </li>
          )}
        </ul>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Next
            </button>
          </div>
        )}
      </Dropdown>
      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {selectedNotification.notification_title}
              </h3>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-start mb-4 space-x-3">
              {selectedNotification.sender?.profile_picture ? (
                <img
                  src={selectedNotification.sender.profile_picture}
                  alt={`${selectedNotification.sender.first_name} ${selectedNotification.sender.last_name}`}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-bold ${getSenderAvatarColor(
                    selectedNotification.sender || {}
                  )}`}
                >
                  {getSenderInitials(selectedNotification.sender || {})}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-800 dark:text-white">
                  {selectedNotification.sender
                    ? `${selectedNotification.sender.first_name} ${selectedNotification.sender.last_name}`
                    : "Unknown Sender"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(selectedNotification.notification_date)}
                </p>
              </div>
            </div>
            <div className="p-4 text-gray-700 bg-gray-100 rounded-lg dark:bg-gray-700 dark:text-gray-300">
              {selectedNotification.details || "No additional details"}
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={() =>
                  handleNotificationNavigation(selectedNotification)
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                View Related Content
              </button>
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
