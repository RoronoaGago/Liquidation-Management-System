import { useState, useCallback, ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { EyeIcon, EyeClosedIcon } from "lucide-react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import companyLogo from "../../images/company-logo.png";
import { useAuth } from "@/context/AuthContext";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value.trim(),
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!credentials.email || !credentials.password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      await login(credentials.email, credentials.password);
      navigate("/");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen  dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-18 h-18 p-1 bg-white rounded-full shadow-md dark:bg-gray-700 mb-4">
            <img
              src={companyLogo}
              alt="Company Logo"
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
          <h1 className="text-xl font-bold text-center text-gray-800 dark:text-white">
            Maintenance and Other Operating Expenses Liquidation Management
            System
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Enter your credentials to continue
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label
              htmlFor="email"
              className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </Label>
            <Input
              id="email"
              placeholder="Enter email"
              onChange={handleChange}
              name="email"
              value={credentials.email}
              className="w-full px-3 py-2"
            />
          </div>

          <div>
            <Label
              htmlFor="password"
              className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                onChange={handleChange}
                name="password"
                value={credentials.password}
                className="w-full px-3 py-2"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeClosedIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            className="w-full px-4 py-2 mt-6 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-500 dark:hover:bg-brand-600 disabled:opacity-50"
            type="submit"
            disabled={isLoading || !credentials.email || !credentials.password}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
