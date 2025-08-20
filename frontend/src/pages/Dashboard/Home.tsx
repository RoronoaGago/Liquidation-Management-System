import GeneralMetrics from "@/components/dashboard/GeneralMetrics";
import { useEffect, useState } from "react";
import DashboardTransactionStatistics from "./DashboardTransactionStatistics";
import RecentTransactions from "@/components/ecommerce/RecentTransactions";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

type Customer = {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string;
  address?: string;
  created_at?: string;
};

export type RecentTransaction = {
  id: number;
  customer: Customer;
  service_type_display: string;
  status_display: string;
  service_type: string;
  status: string;
  regular_clothes_weight: string;
  jeans_weight: string;
  linens_weight: string;
  comforter_weight: string;
  subtotal: string;
  additional_fee: string;
  grand_total: number;
  created_at: string;
  updated_at: string;
  completed_at: string;
};

export interface Transaction {
  id: number;
  customer: {
    first_name: string;
    last_name: string;
    contact_number: string;
  };
  service_type: string;
  status: string;
  grand_total: number;
  created_at: string;
}

export type MetricsData = {
  total_sales: number; // Changed from number to string to match API response
  total_transactions: string;
  ongoing_services: string;
  recent_transactions: RecentTransaction[];
  transactions?: Transaction[];
  start_date?: string;
  end_date?: string;
};

export default function Home() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb pageTitle="Dashboard" />
      </div>
    </>
  );
}
