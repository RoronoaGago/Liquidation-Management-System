import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
// import mobileLogo from "../images/bubble-magic/bubble-magic-mobile-logo.svg";
import desktopLogo from "../images/company-logo.png";
// Assume these icons are imported from an icon library
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  // StatusIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { NavItem } from "@/lib/types";
import {
  BanknoteIcon,
  FileCheck2Icon,
  PhilippinePeso,
  ReceiptText,
  SchoolIcon,
  FileText,
  ListOrdered, // <-- Add this
  History,
  FileSearch,
  UserRoundPenIcon,
  HandCoinsIcon,
  FileUserIcon,
  StampIcon,
  LandPlotIcon,
  FileChartColumnIcon,
  ClipboardCheckIcon,
  DatabaseBackupIcon,
  CalendarIcon,
  FileIcon,
  LogsIcon,
  HelpCircleIcon, // <-- Add this
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuditLogPage from "../pages/AuditLogPage";

// Define all possible navigation items with role permissions
const allNavItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
    roles: ["admin", "school_head", "teacher", "superintendent"], // All roles can access
  },
  {
    icon: <UserCircleIcon />,
    name: "Manage Users",
    path: "/users",
    roles: ["admin"], // Only admin
  },
  {
    icon: <SchoolIcon />,
    name: "Manage Schools",
    path: "/schools",
    roles: ["admin"], // Only admin
  },
  {
    icon: <ClipboardCheckIcon />,
    name: "Finalize Liquidation Report",
    path: "/division-review",
    roles: ["accountant"], // Only for division accountant
  },
  {
    icon: <FileCheck2Icon />,
    name: "Approved Requests",
    path: "/approved-requests",
    roles: ["accountant"], // Only for division superintendent
  },

  {
    icon: <HandCoinsIcon />,
    name: "Resource Allocation",
    path: "/resource-allocation",
    roles: ["accountant"], // Only admin and accountant
  },
  {
    icon: <BanknoteIcon />,
    name: "Manage List of Priorities",
    path: "/list-of-priorities",
    roles: ["admin"], // Only admin
  },
  {
    icon: <FileText />, // <-- Add this block for requirements
    name: "Manage Requirements",
    path: "/requirements",
    roles: ["admin"], // Only admin
  },
  {
    icon: <LandPlotIcon />, // <-- Add this block for requirements
    name: "Manage Districts",
    path: "/school-districts",
    roles: ["admin"], // Only admin
  },
  {
    icon: <StampIcon />,
    name: "Liquidator Review",
    path: "/liquidation-finalize",
    roles: ["liquidator"], // Only liquidator
  },
  {
    icon: <FileSearch />, // <-- Use FileSearch or any icon you prefer
    name: "District Review",
    path: "/pre-auditing",
    roles: ["district_admin"], // Only for district_admin
  },
  {
    icon: <PhilippinePeso />,
    name: "MOOE",
    roles: ["school_head"], // Only for school_head
    // No direct path, use subItems for dropdown
    subItems: [
      {
        icon: <ListOrdered />, // <-- Add icon here
        name: "List of Priority",
        path: "/prepare-list-of-priorities",
        roles: ["school_head"],
      },
      {
        icon: <History />, // <-- Add icon here
        name: "Requests History",
        path: "/requests-history", // Make sure this route exists in your App.tsx
        roles: ["school_head"],
      },
    ],
  },
  {
    icon: <ReceiptText />,
    name: "Liquidation",
    path: "/liquidation",
    roles: ["school_head", "school_admin"], // Only admin
  },
  {
    icon: <PhilippinePeso />,
    name: "Schools Priorities Submissions",
    path: "/schools-priorities-submissions",
    roles: ["superintendent"], // Only for division superintendent
  },

  // {
  //   icon: <ReportIcon />,
  //   name: "Generate Report",
  //   roles: ["admin", "school_head"], // Admin and school heads
  //   subItems: [
  //     {
  //       name: "Sales",
  //       path: "/generate-report/sales",
  //       pro: false,
  //       roles: ["admin"], // Only admin can see this sub-item
  //     },
  //     {
  //       name: "Customer Frequency",
  //       path: "/generate-report/customer-frequency",
  //       pro: false,
  //       roles: ["admin", "school_head"],
  //     },
  //     {
  //       name: "Student Performance",
  //       path: "/generate-report/student-performance",
  //       pro: false,
  //       roles: ["school_head", "teacher"],
  //     },
  //   ],
  // },
  {
    icon: <FileChartColumnIcon />,
    name: "Generate Report",
    roles: ["admin"], // Only for admin

    subItems: [
      {
        icon: <CalendarIcon />, // <-- Add icon here
        name: "Aging",
        path: "/report/aging", // Make sure this route exists in your App.tsx
        roles: ["admin"],
      },
      {
        icon: <HandCoinsIcon />, // <-- Add icon here
        name: "Liquidation",
        path: "/report/liquidation", // Make sure this route exists in your App.tsx
        roles: ["admin"],
      },
    ],
  },
  {
    icon: <DatabaseBackupIcon />,
    name: "Backup & Restore",
    path: "/backup-restore",
    roles: ["admin"],
  },
  {
    icon: <LogsIcon />,
    name: "Audit Logs",
    path: "/audit-logs",
    roles: ["admin"], // Only admins should access audit logs
  },
  {
    icon: <UserRoundPenIcon />,
    name: "User Profile",
    path: "/profile",
    roles: [
      "school_admin",
      "school_head",
      "district_admin",
      "superintendent",
      "admin",
      "liquidator",
      "accountant",
    ], // All roles
  },
  {
    icon: <HelpCircleIcon />,
    name: "Help Center",
    path: "/help",
    roles: [
      "admin",
      "school_head",
      "school_admin",
      "district_admin",
      "superintendent",
      "liquidator",
      "accountant",
    ],
  },
];

// const othersItems: NavItem[] = [
//   {
//     icon: <PieChartIcon />,
//     name: "Charts",
//     roles: ["admin", "school_head"],
//     subItems: [
//       {
//         name: "Line Chart",
//         path: "/line-chart",
//         pro: false,
//         roles: ["admin", "school_head"],
//       },
//       { name: "Bar Chart", path: "/bar-chart", pro: false, roles: ["admin"] },
//     ],
//   },
//   {
//     icon: <BoxCubeIcon />,
//     name: "UI Elements",
//     roles: ["admin"],
//     subItems: [
//       { name: "Alerts", path: "/alerts", pro: false, roles: ["admin"] },
//       { name: "Avatar", path: "/avatars", pro: false, roles: ["admin"] },
//     ],
//   },
// ];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Get user role (hardcoded for now, but you can get from localStorage later)

  // Filter nav items based on user role
  const filterItemsByRole = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        // If no roles specified, show to everyone
        if (!item.roles) return true;

        // Type Guard: Check if user exists and has a role
        if (user?.role) {
          return item.roles.includes(user.role);
        }
        // If user is null/undefined or has no role, don't show subItems with roles
        return false;
      })
      .map((item) => {
        // Filter subItems if they exist
        if (item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter((subItem) => {
              if (!subItem.roles) return true;
              if (user?.role) {
                return subItem.roles.includes(user.role);
              }
              return false;
            }),
          };
        }
        return item;
      })
      .filter((item) => {
        // Remove items with empty subItems (if the item requires subItems)
        if (item.subItems && item.subItems.length === 0) return false;
        return true;
      });
  };

  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [filteredOthersItems] = useState<NavItem[]>([]);

  useEffect(() => {
    // Filter items whenever userRole changes
    setNavItems(filterItemsByRole(allNavItems));
    // setFilteredOthersItems(filterItemsByRole(othersItems));
    console.log(user?.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : filteredOthersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, navItems, filteredOthersItems]);
  useEffect(() => {
    // This calculates the height when submenu opens
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      const subMenuElement = subMenuRefs.current[key];

      if (subMenuElement) {
        const height = subMenuElement.scrollHeight; // Remove the +8
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: height,
        }));
      }
    } else {
      // Reset all submenu heights to 0 when no submenu is open
      setSubMenuHeight({});
    }
  }, [openSubmenu, navItems, filteredOthersItems]);

  // And make sure your handleSubmenuToggle is like this:
  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) => {
      if (prev?.type === menuType && prev?.index === index) {
        return null; // Close if same submenu clicked
      }
      return { type: menuType, index }; // Open new submenu
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems &&
            (isExpanded || isHovered || isMobileOpen) &&
            openSubmenu?.type === menuType &&
            openSubmenu?.index === index && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height: `${
                    subMenuHeight[`${menuType}-${index}`] || "auto"
                  }px`,
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        } flex items-center gap-2`}
                      >
                        {subItem.icon && (
                          <span className="menu-item-icon-size">
                            {subItem.icon}
                          </span>
                        )}
                        <span>{subItem.name}</span>
                        <span className="flex items-center gap-1 ml-auto">
                          {subItem.new && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                            >
                              new
                            </span>
                          )}
                          {subItem.pro && (
                            <span
                              className={`ml-auto ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                            >
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-7 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src={desktopLogo}
                alt="Logo"
                width={100}
                height={40}
              />
              <img
                className="hidden dark:block"
                src={desktopLogo}
                alt="Logo"
                width={100}
                height={40}
              />
            </>
          ) : (
            <img src={desktopLogo} alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>
      {(isExpanded || isHovered || isMobileOpen) && (
        <h1 className="text-xl mb-4 font-bold">MOOELMS</h1>
      )}

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            {/* Others menu section */}
            {/* {filteredOthersItems.length > 0 && (
              <div className="">
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Others"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(filteredOthersItems, "others")}
              </div>
            )} */}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
