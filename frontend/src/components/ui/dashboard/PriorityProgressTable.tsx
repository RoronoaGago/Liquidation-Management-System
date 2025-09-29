import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

interface PriorityProgress {
  priorityId: string;
  priorityName: string;
  status: "not_started" | "in_progress" | "completed";
  documentsRequired: number;
  documentsUploaded: number;
  completionPercentage: number;
}

interface PriorityProgressTableProps {
  priorities: PriorityProgress[];
  getPriorityColor: (priorityName: string, fallbackIndex?: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  onViewDetails?: () => void;
  className?: string;
}

const PriorityProgressTable: React.FC<PriorityProgressTableProps> = ({
  priorities,
  getPriorityColor,
  getStatusBadge,
  onViewDetails,
  className = "",
}) => {
  return (
    <Card className={`mb-6 ${className}`}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>List of Priority Document Progress</CardTitle>
        {onViewDetails && (
          <a href="/liquidation">
            <Button className="mb-4" size="sm" variant="outline">
              View Details
            </Button>
          </a>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Priority</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Documents</th>
                <th className="p-3 text-left font-medium">Completion</th>
              </tr>
            </thead>
            <tbody>
              {priorities.map((priority) => (
                <tr key={priority.priorityId} className="border-b">
                  <td className="p-3 font-medium">{priority.priorityName}</td>
                  <td className="p-3">{getStatusBadge(priority.status)}</td>
                  <td className="p-3">
                    {priority.documentsUploaded} of {priority.documentsRequired}
                  </td>
                  <td className="p-3">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${priority.completionPercentage}%`,
                          backgroundColor: getPriorityColor(priority.priorityName),
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {priority.completionPercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriorityProgressTable;
