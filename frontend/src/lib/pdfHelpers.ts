import jsPDF from "jspdf";
import { depedLogoBase64 } from "@/lib/depedLogo";
import { Submission } from "./types";
import { getDistrictLogoFilename } from "./helpers";
import api from "@/services/api"; // or your axios instance
import { generateApprovedRequestPDF, canGeneratePDF } from "@/services/pdfService";

// Usage in your code



//TODO - name ng file is pangalan ng school ex (TALLAOEN_LUNA_LA_UNION_LOP)

/**
 * NEW: Server-side PDF generation with actual e-signatures (RECOMMENDED)
 * This function generates PDFs on the server with real signatures and timestamps
 */
export const handleServerSideExport = async (submission: Submission): Promise<{ success: boolean; message?: string; error?: string }> => {
    // Check if request is approved
    if (!canGeneratePDF(submission)) {
        return {
            success: false,
            error: 'Request must be approved first to generate PDF'
        };
    }

    try {
        const result = await generateApprovedRequestPDF(submission.request_id);
        return result;
    } catch (error) {
        console.error('Error in server-side PDF generation:', error);
        return {
            success: false,
            error: 'Failed to generate PDF. Please try again.'
        };
    }
};

/**
 * LEGACY: Client-side PDF generation (DEPRECATED)
 * This function is kept for backward compatibility but should not be used for approved requests
 * Use handleServerSideExport instead for approved requests
 */
export const handleExport = async (submission: Submission, first_name: string, last_name: string) => {
    // Fetch signatories
    const { data: signatories } = await api.get("/division-signatories/");
    const superintendent = signatories.superintendent;
    const accountant = signatories.accountant;

    const logoFilename = getDistrictLogoFilename(submission.user.school?.district.districtName ?? ""); // e.g. "agoo-east-district.png"

    const logoPath = `/src/images/district-logos/${logoFilename}`;
    const districtLogoBase64 = await getLogoBase64(logoPath);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Logo settings
    const logoWidth = 28;
    const logoHeight = 28;
    const logoY = 22; // Only for logos
    const headerBaseY = 20; // Only for header text

    // Place logos closer to the center horizontally
    const logoMarginFromCenter = 55;

    // Left logo
    const leftLogoX = pageWidth / 2 - logoMarginFromCenter - logoWidth;
    doc.addImage(
        depedLogoBase64,
        "PNG",
        leftLogoX,
        logoY,
        logoWidth,
        logoHeight
    );
    // Right logo
    const rightLogoX = pageWidth / 2 + logoMarginFromCenter;
    doc.addImage(
        districtLogoBase64,
        "PNG",
        rightLogoX,
        logoY,
        logoWidth,
        logoHeight
    );

    // Header text (use headerBaseY)
    const centerText = (
        text: string,
        y: number,
        font: string,
        style: string,
        size: number
    ) => {
        doc.setFont(font, style);
        doc.setFontSize(size);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // Header (tighter vertical spacing, closer to logos)
    centerText(
        "Republic of the Philippines",
        headerBaseY + 0,
        "oldenglishtextmt",
        "normal",
        12
    );
    centerText(
        "Department of Education",
        headerBaseY + 8,
        "oldenglishtextmt",
        "normal",
        18
    );
    centerText("Region 1", headerBaseY + 13, "arial_black", "normal", 10);
    centerText(
        "Schools Division of La Union",
        headerBaseY + 18,
        "arial_black",
        "normal",
        10
    );
    centerText(
        (submission.user.school?.schoolName || "").toUpperCase(),
        headerBaseY + 23,
        "arial_black",
        "normal",
        11
    );
    centerText(
        `${(submission.user.school?.municipality || "").toUpperCase()}, LA UNION`,
        headerBaseY + 28,
        "arial_black",
        "normal",
        10
    );

    // Helper to draw the header (call this on every new page)
    const drawHeader = () => {
        // Draw logos
        doc.addImage(
            depedLogoBase64,
            "PNG",
            leftLogoX,
            logoY,
            logoWidth,
            logoHeight
        );
        doc.addImage(
            districtLogoBase64,
            "PNG",
            rightLogoX,
            logoY,
            logoWidth,
            logoHeight
        );

        // Header text
        centerText(
            "Republic of the Philippines",
            headerBaseY + 0,
            "oldenglishtextmt",
            "normal",
            12
        );
        centerText(
            "Department of Education",
            headerBaseY + 8,
            "oldenglishtextmt",
            "normal",
            18
        );
        centerText("Region 1", headerBaseY + 13, "arial_black", "normal", 10);
        centerText(
            "Schools Division of La Union",
            headerBaseY + 18,
            "arial_black",
            "normal",
            10
        );
        centerText(
            (submission.user.school?.schoolName || "").toUpperCase(),
            headerBaseY + 23,
            "arial_black",
            "normal",
            11
        );
        centerText(
            `${(submission.user.school?.municipality || "").toUpperCase()}, LA UNION`,
            headerBaseY + 28,
            "arial_black",
            "normal",
            10
        );

        // Draw a horizontal line below the header
        let lineY = headerBaseY + 32;
        doc.setLineWidth(0.5);
        doc.setDrawColor(80, 80, 80);
        doc.line(18, lineY, pageWidth - 18, lineY);

        return lineY;
    };

    let lineY = drawHeader();
    let y = lineY + 16;

    // Set Calibri (Body) font, fallback to 'helvetica' if Calibri is not available in jsPDF
    const bodyFont = "calibri" in doc.getFontList() ? "calibri" : "helvetica";
    const bodyFontStyle = "normal";
    const bodyFontSize = 11;

    // Date (left aligned)
    doc.setFont(bodyFont, bodyFontStyle);
    doc.setFontSize(bodyFontSize);
    const dateStr = new Date(submission.created_at).toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
        }
    );
    doc.text(dateStr, 18, y);

    y += 10;

    // Heading (Recipient)
    doc.setFont(bodyFont, "bold");
    doc.text(`${(superintendent?.first_name + " " + superintendent?.last_name).toUpperCase()}`, 18, y);
    doc.setFont(bodyFont, bodyFontStyle);
    y += 6;
    doc.text("Schools Division Superintendent", 18, y);
    y += 6;
    doc.text("DEPED La Union Schools Division", 18, y);
    y += 6;
    doc.text("San Fernando City, La Union", 18, y);

    y += 14; // Increased space between heading and salutation

    // Salutation
    doc.text("Sir:", 18, y);

    y += 10;

    // Introduction
    const totalAmount = submission.priorities.reduce(
        (sum, p) => sum + Number(p.amount),
        0
    );
    // Dynamic month/year
    const submissionDate = new Date(submission.created_at);
    const monthYear = submissionDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });

    doc.text(
        `Requesting for cash advance to School MOOE for the month of ${monthYear}, amounting to Php ${totalAmount.toLocaleString(
            undefined,
            { minimumFractionDigits: 2 }
        )}.`,
        18,
        y,
        { maxWidth: pageWidth - 36 }
    );

    y += 16;

    // Body - Centered and Bold Heading
    doc.setFont(bodyFont, "bold");
    doc.text("LIST OF PRIORITIES", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFont(bodyFont, "bold");
    const submissionDate2 = new Date(submission.created_at); // or use another relevant date field
    const monthYear2 = submissionDate2.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });
    doc.text(monthYear2, pageWidth / 2, y, { align: "center" });

    y += 10;

    // Table setup
    const col1X = 30;
    const col2X = pageWidth - 30;
    const tableWidth = col2X - col1X;
    const col1Width = tableWidth * 0.6;
    const col2Width = tableWidth * 0.4;
    const rowHeight = 8;
    let tableY = y;

    // Draw table header
    const drawTableHeader = (tableY: number) => {
        doc.setLineWidth(0.5);
        doc.rect(col1X, tableY, col1Width, rowHeight);
        doc.rect(col1X + col1Width, tableY, col2Width, rowHeight);
        doc.setFont(bodyFont, "bold");
        doc.text("Expense", col1X + 2, tableY + 6);
        doc.text("Amount", col1X + col1Width + col2Width / 2, tableY + 6, {
            align: "center",
        });
    };

    drawTableHeader(tableY);

    // Table Rows with page break handling
    doc.setFont(bodyFont, bodyFontStyle);
    let currentY = tableY + rowHeight;
    const bottomMargin = 36; // leave space for signatures or just for margin

    submission.priorities.forEach((priority) => {
        // Wrap expense title
        const expenseText = doc.splitTextToSize(
            priority.priority.expenseTitle,
            col1Width - 4
        );
        const lines = expenseText.length;
        const rowHeightDynamic = rowHeight * lines;

        // Check if next row fits
        if (currentY + rowHeightDynamic > pageHeight - bottomMargin) {
            doc.addPage();
            lineY = drawHeader();
            currentY = lineY + 16;
            drawTableHeader(currentY);
            currentY += rowHeight;
        }

        // Row borders
        doc.rect(col1X, currentY, col1Width, rowHeightDynamic);
        doc.rect(col1X + col1Width, currentY, col2Width, rowHeightDynamic);

        // Expense (left)
        // Calculate vertical offset to center the block of text
        const textHeight = lines * rowHeight;
        const verticalOffset = (rowHeightDynamic - textHeight) / 2;

        // Start Y position for the text block
        const expenseTextY = currentY + 2 + verticalOffset;

        doc.text(expenseText, col1X + 2, expenseTextY, { baseline: "top" });

        // Amount (centered, vertically centered)
        doc.text(
            Number(priority.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            col1X + col1Width + col2Width / 2,
            currentY + 6 + ((rowHeightDynamic - rowHeight) / 2),
            { align: "center" }
        );

        currentY += rowHeightDynamic;
    });

    // Total Row (check if it fits, else new page)
    if (currentY + rowHeight > pageHeight - bottomMargin) {
        doc.addPage();
        lineY = drawHeader();
        currentY = lineY + 16;
        drawTableHeader(currentY);
        currentY += rowHeight;
    }
    doc.setFont(bodyFont, "bold");
    doc.rect(col1X, currentY, col1Width, rowHeight);
    doc.rect(col1X + col1Width, currentY, col2Width, rowHeight);
    doc.text("TOTAL", col1X + 2, currentY + 6);
    doc.text(
        totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        col1X + col1Width + col2Width / 2,
        currentY + 6,
        { align: "center" }
    );

    // --- Signature Section ---
    let signatureY = currentY + 80;
    // If signatures don't fit, add a new page
    if (signatureY + 20 > pageHeight - 10) {
        doc.addPage();
        lineY = drawHeader();
        signatureY = lineY + 40;
    }
    const leftX = 36;
    const rightX = pageWidth - 100;
    doc.setFont(bodyFont, "normal");
    doc.text("Prepared by:", leftX, signatureY);
    doc.text("Certified Correct:", rightX, signatureY);
    const lineLength = 60;
    let lineY2 = signatureY + 8;
    doc.line(leftX, lineY2, leftX + lineLength, lineY2);
    doc.line(rightX, lineY2, rightX + lineLength, lineY2);
    doc.setFont(bodyFont, "bold");
    doc.text(
        `${submission.user.first_name.toUpperCase()} ${submission.user.last_name.toUpperCase()}`,
        leftX,
        lineY2 + 7
    );
    doc.text(
        `${accountant?.first_name?.toUpperCase() || ""} ${accountant?.last_name?.toUpperCase() || ""}`,
        rightX,
        lineY2 + 7
    );
    doc.setFont(bodyFont, "normal");
    doc.text("School Head", leftX, lineY2 + 14);
    doc.text("Accountant III", rightX, lineY2 + 14);

    doc.save(`${submission.user.school?.schoolName.toUpperCase()}_${submission.request_id}.pdf`);
};

async function getLogoBase64(logoPath: string): Promise<string> {
    const response = await fetch(logoPath);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}