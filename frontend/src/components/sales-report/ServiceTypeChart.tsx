// src/components/reports/ServiceTypeChart.tsx
import React from 'react';
import { Pie } from '@ant-design/charts';
import { Card } from 'antd';
import { ServiceTypeBreakdown } from '@/api/reportService';
import { formatCurrency } from '@/lib/helpers';


interface ServiceTypeChartProps {
  data: ServiceTypeBreakdown;
}

const ServiceTypeChart: React.FC<ServiceTypeChartProps> = ({ data }) => {
  const chartData = Object.entries(data).map(([serviceType, values]) => ({
    type: serviceType === 'standard' ? 'Standard' : 'Express',
    value: values.total,
    count: values.count,
  }));

  const config = {
    data: chartData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}\n{value}',
      formatter: (datum: any) => {
        return `${datum.type}\n${formatCurrency(datum.value)}`;
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.type,
          value: `${formatCurrency(datum.value)} (${datum.count} transactions)`,
        };
      },
    },
    interactions: [{ type: 'element-active' }],
  };

  return (
    <Card title="Sales by Service Type">
      <Pie {...config} />
    </Card>
  );
};

export default ServiceTypeChart;