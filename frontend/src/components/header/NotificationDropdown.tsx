import { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getNotifications, markAsRead } from "@/services/notificationService";

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

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.user_id) {
      fetchNotifications();

      // Set up polling or consider using WebSockets for real-time updates
      const interval = setInterval(fetchNotifications, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [user?.user_id]);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications(user?.user_id);
      setNotifications(data);
      setHasUnread(data.some((n: Notification) => !n.is_read));
      console.log(data);
    } catch (error) {
      console.error("Failed to fetch notification:", error);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    try {
      const notification = notifications.find((n) => n.id === notificationId);
      await markAsRead(notificationId);
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setHasUnread(
        notifications.some((n) => !n.is_read && n.id !== notificationId)
      );

      // Navigation logic based on notification title
      console.log(notification?.notification_title);
      if (notification) {
        if (
          notification.notification_title === "Request ready for liquidation" ||
          notification.notification_title === "Liquidation Needs Revision"
        ) {
          navigate("/liquidation");
        } else if (
          notification.notification_title === "Your request was approved"
        ) {
          navigate("/requests-history");
        } else if (
          notification.notification_title === "Your request was rejected"
        ) {
          navigate("/requests-history");
        } else if (
          notification.notification_title === "New Liquidation Submitted"
        ) {
          console.log("oh yeah");
          navigate("/pre-auditing");
        } else if (
          notification.notification_title === "New comment on your post"
        ) {
          navigate("/posts");
        } else if (notification.notification_title.includes("New Request")) {
          console.log("New Request Notification");
          navigate("/schools-priorities-submissions");
        } else if (notification.details.includes("for accounting")) {
          console.log("New Accounting Notification");
          navigate("/approved-requests");
        } else if (
          notification.notification_title === "New Liquidation Submitted" &&
          user?.role === "district_admin"
        ) {
          navigate("/pre-auditing");
        } else if (
          notification.notification_title ===
            "Liquidation Under District Review" ||
          notification.notification_title === "Liquidation Submitted"
        ) {
          navigate("/liquidation");
        }

        // Add more conditions as needed for other notification types
      }
      closeDropdown();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
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
    let stringId = sender.id?.toString() || "";
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
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !hasUnread ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notification
          </h5>
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
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
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

                  <span className="block">
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
                    <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                      <span>{formatDate(notification.notification_date)}</span>
                    </span>
                  </span>
                </DropdownItem>
              </li>
            ))
          ) : (
            <li className="flex items-center justify-center p-4 text-gray-500">
              No notifications available
            </li>
          )}
        </ul>
        {/* <Link
          to="/notifications"
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link> */}
      </Dropdown>
    </div>
  );
}
