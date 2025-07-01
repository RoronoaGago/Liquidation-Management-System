import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import ToastProvider from "@/components/ui/ToastProvider";
import { Bounce, ToastContainer } from "react-toastify";

// Only allow +63 and numbers starting with 9 (PH mobile)
export const validatePhoneNumber = (phone: string): boolean => {
  return /^\+639\d{9}$/.test(phone);
};

// LayoutContent component
const LayoutContent: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children || <Outlet />}
          <ToastContainer
            position="top-center"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            transition={Bounce}
            style={{ fontFamily: "Outfit, sans-serif" }} // Fixed: Style should be an object
          />
        </div>
      </div>
    </div>
  );
};

// AppLayout component
const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};

export default AppLayout;
