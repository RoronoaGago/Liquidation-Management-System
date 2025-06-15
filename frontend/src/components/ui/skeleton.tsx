import { TableCell, TableRow } from "./table";

const SkeletonRow = () => (
  <TableRow>
    {[...Array(9)].map((_, i) => (
      <TableCell key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </TableCell>
    ))}
  </TableRow>
);

export default SkeletonRow;
