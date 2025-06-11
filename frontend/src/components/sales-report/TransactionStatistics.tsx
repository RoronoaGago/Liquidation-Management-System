import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { SalesReportData } from "@/api/reportService";

interface SalesStatisticsProps {
  reportData: SalesReportData | null;
}

export default function TransactionStatistics({
  reportData,
}: SalesStatisticsProps) {
  // Prepare chart data from reportData
  const prepareChartData = () => {
    if (!reportData || !reportData.transactions) {
      return {
        categories: [],
        seriesData: [],
      };
    }

    // Group transactions by date and count them
    const transactionsCountByDate: Record<string, number> = {};

    reportData.transactions.forEach((transaction) => {
      const date = new Date(transaction.created_at).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      );

      transactionsCountByDate[date] = (transactionsCountByDate[date] || 0) + 1;
    });

    // Sort dates chronologically
    const sortedDates = Object.keys(transactionsCountByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return {
      categories: sortedDates,
      seriesData: sortedDates.map((date) => transactionsCountByDate[date]),
    };
  };

  const chartData = prepareChartData();

  const options: ApexOptions = {
    legend: {
      show: false,
    },
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 1,
      },
    },
    markers: {
      size: 5,
      colors: ["#3B82F6"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    tooltip: {
      enabled: true,
      x: {
        format: "dd MMM yyyy",
      },
      y: {
        formatter: function (value) {
          return `${value}`;
        },
      },
    },
    xaxis: {
      type: "category",
      categories: chartData.categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
        formatter: function (value) {
          return Math.floor(value).toString(); // Whole numbers only
        },
      },
      title: {
        text: "Transactions",
        style: {
          fontSize: "12px",
          color: "#6B7280",
        },
      },
      min: 0, // Start y-axis from 0
      forceNiceScale: true,
    },
  };

  const series = [
    {
      name: "Transactions",
      data: chartData.seriesData,
    },
  ];

  const getDateRangeText = () => {
    if (!reportData) return "Transaction data";

    if (reportData.period === "custom") {
      return `Transactions from ${reportData.start_date} to ${reportData.end_date}`;
    }

    return `Transactions for the ${reportData.period} period (${reportData.start_date} to ${reportData.end_date})`;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Transaction Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {getDateRangeText()}
          </p>
        </div>
      </div>

      <div className="max-w-full overflow-hidden">
        <div className="min-w-[1000px] xl:min-w-full">
          {chartData.categories.length > 0 ? (
            <Chart options={options} series={series} type="line" height={310} />
          ) : (
            <div className="flex items-center justify-center h-[310px] text-gray-500">
              No transaction data available for the selected period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
