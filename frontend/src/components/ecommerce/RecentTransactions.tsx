import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { RecentTransaction } from "@/pages/Dashboard/Home";
import { formatCurrency } from "@/lib/helpers";
import { Loading } from "../common/Loading";

type RecentTransactionsProps = {
  transactionData: RecentTransaction[];
  loading: boolean;
};

export default function RecentTransactions({
  transactionData = [],
  loading,
}: RecentTransactionsProps) {
  if (loading) return <Loading />;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-4 p-6 pb-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Transactions
          </h3>
        </div>

        {/* Future filter controls can go here */}
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-t border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  ID
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Customer Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Phone
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Grand Total
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {transactionData.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                        #{transaction.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-gray-400">
                        {transaction.customer.first_name}{" "}
                        {transaction.customer.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                    {transaction.customer.contact_number}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                    {formatCurrency(transaction.grand_total)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-800 text-start text-theme-sm dark:text-gray-400">
                    <Badge
                      size="sm"
                      color={
                        transaction.status === "completed"
                          ? "success"
                          : transaction.status === "ready_for_pickup"
                          ? "primary"
                          : transaction.status === "in_progress"
                          ? "info"
                          : transaction.status === "cancelled"
                          ? "error"
                          : "warning"
                      }
                    >
                      {transaction.status_display}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {transactionData.length > 0 && (
        <div className="border-t border-gray-100 px-6 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Showing {transactionData.length} most recent transactions
        </div>
      )}
    </div>
  );
}
