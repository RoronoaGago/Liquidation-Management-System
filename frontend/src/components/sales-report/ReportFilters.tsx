import React from 'react';
import { Select, Radio, DatePicker, Button, Space, Form } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs'; // Using Dayjs for dates

const { Option } = Select;
const { RangePicker } = DatePicker;

interface ReportFiltersProps {
  filters: {
    period: string;
    start_date: Dayjs | null;
    end_date: Dayjs | null;
    service_type: string | null;
    status: string | null;
  };
  onChange: (newFilters: {
    period?: string;
    start_date?: any | null;
    end_date?: any | null;
    service_type?: string | null;
    status?: string | null;
  }) => void;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({ filters, onChange }) => {
  const [form] = Form.useForm();

  const handlePeriodChange = (e: any): void => {
    onChange({ period: e.target.value });
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null): void => {
    if (dates) {
      onChange({
        start_date: dates[0],
        end_date: dates[1],
        period: 'custom'
      });
    } else {
      onChange({
        start_date: null,
        end_date: null,
        period: 'monthly'
      });
    }
  };

  const handleServiceTypeChange = (value: string | null): void => {
    onChange({ service_type: value });
  };

  const handleStatusChange = (value: string | null): void => {
    onChange({ status: value });
  };

  const handleExport = (): void => {
    // Implement export functionality
    console.log('Exporting report with filters:', filters);
  };

  return (
    <Form form={form} layout="inline" className="report-filters">
      <Form.Item label="Period">
        <Radio.Group 
          value={filters.period} 
          onChange={handlePeriodChange}
        >
          <Radio.Button value="daily">Daily</Radio.Button>
          <Radio.Button value="weekly">Weekly</Radio.Button>
          <Radio.Button value="monthly">Monthly</Radio.Button>
          <Radio.Button value="custom">Custom</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {(filters.period === 'custom') && (
        <Form.Item label="Date Range">
          <RangePicker 
            value={[filters.start_date, filters.end_date]}
            onChange={handleDateChange}
          />
        </Form.Item>
      )}

      <Form.Item label="Service Type">
        <Select
          style={{ width: 150 }}
          allowClear
          placeholder="All Services"
          value={filters.service_type}
          onChange={handleServiceTypeChange}
        >
          <Option value="standard">Standard</Option>
          <Option value="express">Express</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Status">
        <Select
          style={{ width: 150 }}
          allowClear
          placeholder="All Statuses"
          value={filters.status}
          onChange={handleStatusChange}
        >
          <Option value="pending">Pending</Option>
          <Option value="in_progress">In Progress</Option>
          <Option value="ready_for_pickup">Ready for Pickup</Option>
          <Option value="completed">Completed</Option>
          <Option value="cancelled">Cancelled</Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          Export
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ReportFilters;