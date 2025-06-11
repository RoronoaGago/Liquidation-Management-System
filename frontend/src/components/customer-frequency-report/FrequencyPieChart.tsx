import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { CustomerData } from "@/pages/CustomerFrequencyReport";

interface CustomerFrequencyData {
  id: number;
  first_name: string;
  last_name: string;
  contact_number: string;
  address: string;
  total_transactions: number;
  total_spent: number;
  average_spent: number;
  last_transaction_date: string;
  period: string;
  start_date: string;
  end_date: string;
  transactions?: any[];
}

interface CustomerFrequencyPieChartProps {
  data: CustomerData[] | null;
}

export default function FrequencyPieChart({
  data,
}: CustomerFrequencyPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
        <p>No customer data available</p>
      </div>
    );
  }

  // Process data to get top customers by transactions
  const sortedCustomers = [...data].sort(
    (a, b) => b.total_transactions - a.total_transactions
  );

  // Limit to top 8 customers for better visualization
  const topCustomers = sortedCustomers.slice(0, 8);

  // Prepare series and labels
  const series = topCustomers.map((customer) => customer.total_transactions);
  const labels = topCustomers.map(
    (customer) => `${customer.first_name} ${customer.last_name}`
  );

  // Find the customer with highest transactions
  const highestTransactionCustomer = sortedCustomers[0];

  // Beautiful color palette with good contrast
  // High-contrast color palette optimized for light gray labels
  const colors = [
    "#667085", // Your base color (grayish-blue)
    "#7F56D9", // Vibrant purple
    "#12B76A", // Fresh green
    "#F79009", // Warm orange
    "#F04438", // Bright red
    "#2E90FA", // Strong blue
    "#EE46BC", // Pink
    "#875BF7", // Light purple
  ];

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "pie",
      height: 350,
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    colors: colors,
    legend: {
      position: "right",
      horizontalAlign: "center",
      fontFamily: "Outfit, sans-serif",
      labels: {
        colors: "#6B7280",
        useSeriesColors: false,
      },
      markers: {},
      itemMargin: {
        horizontal: 8,
        vertical: 4,
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "16px",
        fontFamily: "Outfit, sans-serif",
        fontWeight: "bold",
      },
      dropShadow: {
        enabled: false,
      },
      formatter: function (val, opts) {
        return `${opts.w.globals.series[opts.seriesIndex]}`;
      },
    },
    stroke: {
      show: true,
      width: 1,
      colors: ["#fff"],
    },
    tooltip: {
      enabled: true,
      style: {
        fontFamily: "Outfit, sans-serif",
      },
      custom: function ({ series, seriesIndex, w }) {
        const customer = topCustomers[seriesIndex];
        return `
          <div class="bg-white p-3 dark:bg-gray-900 ">
            <div class="text-sm font-semibold text-gray-900 dark:text-white">
              ${customer.first_name} ${customer.last_name}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-300 mt-1">
              <div>Transactions: <span class="font-medium">${
                customer.total_transactions
              }</span></div>
              <div>Total spent: <span class="font-medium">$${customer.total_spent.toLocaleString()}</span></div>
              <div>Avg. spent: <span class="font-medium">$${customer.average_spent.toFixed(
                2
              )}</span></div>
              <div class="mt-1 text-xs">Last transaction: ${new Date(
                customer.last_transaction_date
              ).toLocaleDateString()}</div>
            </div>
          </div>
        `;
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "0%",
        },
        expandOnClick: true,
        customScale: 1,
        offsetX: 0,
        offsetY: 0,
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          legend: {
            position: "bottom",
          },
        },
      },
      {
        breakpoint: 480,
        options: {
          chart: {
            width: "100%",
          },
          legend: {
            position: "bottom",
            fontSize: "10px",
          },
          dataLabels: {
            enabled: false,
          },
        },
      },
    ],
    labels: labels,
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Customer Transactions Distribution
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-white-400">
            {highestTransactionCustomer.first_name}{" "}
            {highestTransactionCustomer.last_name} leads with{" "}
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {highestTransactionCustomer.total_transactions} transactions
            </span>{" "}
            (${highestTransactionCustomer.total_spent.toLocaleString()} total)
          </p>
        </div>
      </div>

      <div className="max-w-full">
        <Chart options={options} series={series} type="pie" height={350} />
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <p>Showing top {topCustomers.length} customers by transaction count</p>
        {sortedCustomers.length > topCustomers.length && (
          <p>+ {sortedCustomers.length - topCustomers.length} more not shown</p>
        )}
      </div>
    </div>
  );
}
