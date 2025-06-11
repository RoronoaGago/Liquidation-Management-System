// src/components/reports/ReportSummary.tsx
import React from 'react';
import { Statistic, Row, Col, Typography } from 'antd';
import { SalesReportData } from '@/api/reportService';
import { formatCurrency } from '@/lib/helpers';


const { Title } = Typography;

interface ReportSummaryProps {
  data: SalesReportData;
}

const ReportSummary: React.FC<ReportSummaryProps> = ({ data }) => {
  return (
    <div className="report-summary">
      <Title level={4} className="report-period">
        {data.period === 'custom' 
          ? `${data.start_date} to ${data.end_date}`
          : `${data.period.charAt(0).toUpperCase() + data.period.slice(1)} Report (${data.start_date} to ${data.end_date})`}
      </Title>
      
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="Total Sales"
            value={formatCurrency(data.total_sales)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Total Transactions"
            value={data.total_transactions}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Average Sale"
            value={formatCurrency(data.average_sale)}
          />
        </Col>
      </Row>
    </div>
  );
};

export default ReportSummary;