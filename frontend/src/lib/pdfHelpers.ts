import jsPDF from "jspdf";
import { depedLogoBase64 } from "@/lib/depedLogo";
import { Submission } from "./types";


//TODO - name ng file is pangalan ng school ex (TALLAOEN_LUNA_LA_UNION_LOP)

export const handleExport = (submission: Submission) => {
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
        depedLogoBase64,
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
        "TALLAOEN, LUNA, LA UNION",
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
            depedLogoBase64,
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
            "TALLAOEN, LUNA, LA UNION",
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
    doc.text("JORGE M. REINANTE, CSEE, CEO VI, CESO V", 18, y);
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
    doc.text(
        `Requesting for cash advance to School MOOE for the month of June 2025, amounting to Php ${totalAmount.toLocaleString(
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
    const monthYear = "June 2025";
    doc.text(monthYear, pageWidth / 2, y, { align: "center" });

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
        // Check if next row fits
        if (currentY + rowHeight > pageHeight - bottomMargin) {
            doc.addPage();
            lineY = drawHeader();
            currentY = lineY + 16;
            // Optionally, re-draw "LIST OF PRIORITIES" and monthYear here if you want them on every page
            drawTableHeader(currentY);
            currentY += rowHeight;
        }
        // Row borders
        doc.rect(col1X, currentY, col1Width, rowHeight);
        doc.rect(col1X + col1Width, currentY, col2Width, rowHeight);
        // Expense (left)
        doc.text(priority.priority.expenseTitle, col1X + 2, currentY + 6);
        // Amount (centered)
        doc.text(
            Number(priority.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            col1X + col1Width + col2Width / 2,
            currentY + 6,
            { align: "center" }
        );
        currentY += rowHeight;
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
    doc.text("JAN LESTER RIVERA", leftX, lineY2 + 7);
    doc.text("JOMARI FONTAWA", rightX, lineY2 + 7);
    doc.setFont(bodyFont, "normal");
    doc.text("School Head", leftX, lineY2 + 14);
    doc.text("Accountant III", rightX, lineY2 + 14);

    doc.save(`priority_submission_${submission.request_id}.pdf`);
};