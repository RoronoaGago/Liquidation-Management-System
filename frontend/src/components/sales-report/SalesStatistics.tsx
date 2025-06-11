import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { SalesReportData } from "@/api/reportService";

interface SalesStatisticsProps {
  reportData: SalesReportData | null;
}

export default function SalesStatistics({ reportData }: SalesStatisticsProps) {
  console.log(reportData);
  // Prepare chart data from reportData

  const prepareChartData = () => {
    if (!reportData || !reportData.transactions) {
      return {
        categories: [],
        seriesData: [],
      };
    }

    // Group transactions by date
    const transactionsByDate: Record<string, number> = {};

    reportData.transactions.forEach((transaction) => {
      const date = new Date(transaction.created_at).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      );

      if (!transactionsByDate[date]) {
        transactionsByDate[date] = 0;
      }

      // Convert grand_total to number before adding
      const amount =
        typeof transaction.grand_total === "string"
          ? parseFloat(transaction.grand_total)
          : transaction.grand_total;

      transactionsByDate[date] = parseFloat(
        (transactionsByDate[date] + amount).toFixed(2)
      );
    });

    // Sort dates chronologically
    const sortedDates = Object.keys(transactionsByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return {
      categories: sortedDates,
      seriesData: sortedDates.map((date) => transactionsByDate[date]),
    };
  };

  const chartData = prepareChartData();

  const options: ApexOptions = {
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "bar", // Changed from 'area'
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%", // Adjust width as needed
        borderRadius: 5,
        borderRadiusApplication: "end",
        distributed: false,
      },
    },
    // Remove stroke and fill options as they're not needed for bar charts
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
      y: {
        formatter: function (value) {
          return "₱" + value.toFixed(2);
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
        formatter: function (value) {
          return "₱" + value.toFixed(2);
        },
      },
      title: {
        text: "Sales",
        style: {
          fontSize: "12px",
          color: "#6B7280",
        },
      },
    },
  };

  const series = [
    {
      name: "Sales",
      data: chartData.seriesData,
    },
  ];

  const getDateRangeText = () => {
    if (!reportData) return "Sales data";

    if (reportData.period === "custom") {
      return `Sales data from ${reportData.start_date} to ${reportData.end_date}`;
    }

    return `Sales data for the ${reportData.period} period (${reportData.start_date} to ${reportData.end_date})`;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {getDateRangeText()}
          </p>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          {chartData.categories.length > 0 ? (
            <Chart options={options} series={series} type="bar" height={310} />
          ) : (
            <div className="flex items-center justify-center h-[310px] text-gray-500">
              No sales data available for the selected period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
