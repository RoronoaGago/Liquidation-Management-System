import { useParams } from "react-router";
import { useEffect, useState } from "react";
import api from "@/api/axios";
import { Liquidation } from "@/components/tables/BasicTables/LiquidationReportTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

const LiquidationDetailsPage = () => {
  const { liquidationId } = useParams<{ liquidationId: string }>();
  const [liquidation, setLiquidation] = useState<Liquidation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiquidation = async () => {
      try {
        const res = await api.get(`/liquidations/${liquidationId}/`);
        setLiquidation(res.data);
      } catch (err) {
        console.error("Failed to fetch liquidation details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLiquidation();
  }, [liquidationId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!liquidation) {
    return <div>Liquidation not found</div>;
  }

  return (
    <div className="container mx-auto px-5 py-10">
      <PageBreadcrumb
        pageTitle={`Liquidation Details: ${liquidation.LiquidationID}`}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">
          Liquidation ID: {liquidation.LiquidationID}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Basic Information</h2>
            <p>Status: {liquidation.status}</p>
            <p>
              Created At:{" "}
              {liquidation.created_at
                ? new Date(liquidation.created_at).toLocaleString()
                : "N/A"}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Request Details</h2>
            {liquidation.request && (
              <>
                <p>Request ID: {liquidation.request.request_id}</p>
                <p>
                  School Head: {liquidation.request.user?.first_name}{" "}
                  {liquidation.request.user?.last_name}
                </p>
                <p>
                  School:{" "}
                  {liquidation.request.user?.school?.schoolName || "N/A"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Add more sections for documents, expenses, etc. */}
      </div>
    </div>
  );
};

export default LiquidationDetailsPage;
