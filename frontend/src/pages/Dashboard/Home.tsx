import GeneralMetrics from "@/components/dashboard/GeneralMetrics";
import { useEffect, useState } from "react";
import DashboardTransactionStatistics from "./DashboardTransactionStatistics";
import RecentTransactions from "@/components/ecommerce/RecentTransactions";

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

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/api/dashboard/metrics/"
        );
        const data = await response.json();
        setMetrics({
          ...data,
          // Convert string to number if needed for calculations
          total_sales: data.total_sales,
          total_transactions: data.total_transactions,
          ongoing_services: data.ongoing_services,
          recent_transactions: data.recent_transactions || [],
        });
        console.log(data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-12">
          {metrics && <GeneralMetrics metrics={metrics} loading={loading} />}
        </div>
        <div className="col-span-12">
          <DashboardTransactionStatistics reportData={metrics} />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <RecentTransactions
            transactionData={metrics?.recent_transactions || []}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}
