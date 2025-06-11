import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { MetricsData } from "./Home";

interface DashboardTransactionStatisticsProps {
  reportData: MetricsData | null;
}

export default function DashboardTransactionStatistics({
  reportData,
}: DashboardTransactionStatisticsProps) {
  const prepareChartData = () => {
    if (!reportData?.transactions?.length) {
      return {
        categories: [],
        seriesData: [],
      };
    }

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
    colors: ["#465FFF", "#9CB9FF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "straight",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
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
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      x: {
        format: "dd MMM yyyy",
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
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
      },
      title: {
        text: "",
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  const series = [
    {
      name: "Transactions",
      data: chartData.seriesData,
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Transaction Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {reportData
              ? `Transactions from ${reportData.start_date} to ${reportData.end_date}`
              : "Loading transaction data..."}
          </p>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          {chartData.categories.length > 0 ? (
            <Chart options={options} series={series} type="area" height={310} />
          ) : (
            <div className="flex items-center justify-center h-[310px] text-gray-500">
              No transaction data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
