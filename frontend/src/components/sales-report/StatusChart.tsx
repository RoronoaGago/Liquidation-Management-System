// src/components/reports/StatusChart.tsx
import React from 'react';
import { Card } from 'antd';
import { StatusBreakdown } from '@/api/reportService';
import { Bar } from '@ant-design/charts';

interface StatusChartProps {
  data: StatusBreakdown;
}

const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'in_progress': 'In Progress',
    'ready_for_pickup': 'Ready for Pickup',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return statusMap[status] || status;
};

const StatusChart: React.FC<StatusChartProps> = ({ data }) => {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status: formatStatus(status),
    count,
  }));

  const config = {
    data: chartData,
    xField: 'count',
    yField: 'status',
    seriesField: 'status',
    legend: { position: 'top-left' },
    meta: {
      count: { alias: 'Number of Transactions' },
      status: { alias: 'Status' },
    },
  };

  return (
    <Card title="Transactions by Status" bordered={false}>
      <Bar {...config} />
    </Card>
  );
};

export default StatusChart;