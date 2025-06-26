import { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link } from "react-router";
import api from "@/api/axios";
import { BellDot, BellDotIcon, BellIcon } from "lucide-react";

// Helper functions for avatar generation
const getAvatarColor = (userId: number) => {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
  ];
  return colors[userId % colors.length];
};

const getUserInitials = (name: string) => {
  if (!name) return "?";
  const names = name.split(" ");
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return initials;
};

interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  profile_picture: string | null;
}

interface Notification {
  id: number;
  notification_title: string;
  details: string | null;
  receiver: User;
  sender: User | null;
  notification_date: string;
  is_read: boolean;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  // Fetch notifications from the backend
  const fetchNotifications = async () => {
    try {
      const response = await api.get("notifications/");
      setNotifications(response.data);
      console.log("Fetched notifications:", response.data);
      const unread = response.data.some((n: Notification) => !n.is_read);
      setHasUnread(unread);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Polling effect: Fetch notifications when dropdown is open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      const intervalId = setInterval(fetchNotifications, 10000); // Poll every 10 seconds
      return () => clearInterval(intervalId);
    }
  }, [isOpen]);

  // Mark a single notification as read
  const markAsRead = async (id: number) => {
    try {
      await api.patch(`notifications/${id}/`, { is_read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      const unread = notifications.some((n) => n.id !== id && !n.is_read);
      setHasUnread(unread);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.post("notifications/mark-all-read/");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setHasUnread(false);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => {
          toggleDropdown();
          if (!isOpen) fetchNotifications(); // Initial fetch when opening
        }}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            hasUnread ? "flex" : "hidden"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <BellIcon className="w-5 h-5" />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <button
            onClick={toggleDropdown}
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
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        {notifications.length > 0 ? (
          <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <DropdownItem
                  onItemClick={() => {
                    closeDropdown();
                    if (!notification.is_read) markAsRead(notification.id);
                  }}
                  className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <span className="relative block w-full h-10 rounded-full z-1 max-w-10">
                    {notification.sender?.profile_picture ? (
                      <img
                        width={40}
                        height={40}
                        src={notification.sender.profile_picture}
                        alt="User"
                        className="w-full overflow-hidden rounded-full"
                      />
                    ) : (
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full ${getAvatarColor(
                          notification.sender?.id || 0
                        )} text-white font-medium`}
                      >
                        {getUserInitials(
                          notification.sender
                            ? `${notification.sender.first_name} ${notification.sender.last_name}`
                            : "System"
                        )}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 z-10 h-2.5 w-full max-w-2.5 rounded-full border-[1.5px] border-white bg-success-500 dark:border-gray-900"></span>
                  </span>
                  <span className="block">
                    <span className="mb-1.5 block text-theme-sm text-gray-500 dark:text-gray-400">
                      {notification.notification_title}
                    </span>
                    {notification.details && (
                      <span className="block text-sm text-gray-600 dark:text-gray-300">
                        {notification.details}
                      </span>
                    )}
                    <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                      <span>
                        {new Date(
                          notification.notification_date
                        ).toLocaleString()}
                      </span>
                    </span>
                  </span>
                </DropdownItem>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No notifications
          </div>
        )}
        <div className="flex justify-between items-center mt-3">
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            disabled={!hasUnread}
          >
            Mark all as read
          </button>
          {/* <Link
            to="/notifications"
            className="block px-4 py-2 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            View All Notifications
          </Link> */}
        </div>
      </Dropdown>
    </div>
  );
}
