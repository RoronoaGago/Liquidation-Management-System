// src/components/reports/TransactionsTable.tsx
import React from "react";
import { Table, Tag } from "antd";
import { Transaction } from "../../api/reportService";
import { formatCurrency, formatDate } from "@/lib/helpers";


interface TransactionsTableProps {
  transactions: Transaction[];
}

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    sorter: (a: Transaction, b: Transaction) => a.id - b.id,
  },
  {
    title: "Customer",
    dataIndex: "customer",
    key: "customer",
    render: (customer: Transaction["customer"]) =>
      `${customer.first_name} ${customer.last_name}`,
    sorter: (a: Transaction, b: Transaction) =>
      `${a.customer.first_name} ${a.customer.last_name}`.localeCompare(
        `${b.customer.first_name} ${b.customer.last_name}`
      ),
  },
  {
    title: "Service Type",
    dataIndex: "service_type",
    key: "service_type",
    render: (type: string) => (
      <Tag color={type === "standard" ? "blue" : "gold"}>
        {type === "standard" ? "Standard" : "Express"}
      </Tag>
    ),
    filters: [
      { text: "Standard", value: "standard" },
      { text: "Express", value: "express" },
    ],
    onFilter: (value: any, record: Transaction) =>
      record.service_type === value as string,
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: string) => {
      let color = "default";
      if (status === "completed") color = "green";
      if (status === "in_progress") color = "blue";
      if (status === "pending") color = "orange";
      if (status === "cancelled") color = "red";

      return <Tag color={color}>{status.replace("_", " ").toUpperCase()}</Tag>;
    },
    filters: [
      { text: "Pending", value: "pending" },
      { text: "In Progress", value: "in_progress" },
      { text: "Ready for Pickup", value: "ready_for_pickup" },
      { text: "Completed", value: "completed" },
      { text: "Cancelled", value: "cancelled" },
    ],
    onFilter: (value: any, record: Transaction) => record.status === value as string,
  },
  {
    title: "Total",
    dataIndex: "grand_total",
    key: "grand_total",
    render: (total: number) => formatCurrency(total),
    align: "right" as "right",
    sorter: (a: Transaction, b: Transaction) => a.grand_total - b.grand_total,
  },
  {
    title: "Date",
    dataIndex: "created_at",
    key: "created_at",
    render: (date: string) => formatDate(date),
    sorter: (a: Transaction, b: Transaction) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  },
];

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
}) => {
  return (
    <Table<Transaction>
      columns={columns}
      dataSource={transactions}
      rowKey="id"
      pagination={{ pageSize: 10 }}
      scroll={{ x: true }}
    />
  );
};

export default TransactionsTable;
