import jsPDF from "jspdf";
import { depedLogoBase64 } from "@/lib/depedLogo";

// Types can be imported or redefined if needed
export type Priority = {
    expense: string;
    amount: number;
};

export type Submission = {
    id: number;
    submitted_by: {
        id: number;
        name: string;
        school: string;
    };
    priorities: Priority[];
    status: "pending" | "approved" | "rejected";
    submitted_at: string;
};

export const handleExport = (submission: Submission) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

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
        submission.submitted_by.school.toUpperCase(),
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

    const lineY = headerBaseY + 32; // Adjusted line position
    doc.setLineWidth(0.7);
    doc.line(leftLogoX, lineY, rightLogoX + logoWidth, lineY);

    // --- Salutation, Introduction, and Body Section ---

    // Set Calibri (Body) font, fallback to 'helvetica' if Calibri is not available in jsPDF
    const bodyFont = "calibri" in doc.getFontList() ? "calibri" : "helvetica";
    const bodyFontStyle = "normal";
    const bodyFontSize = 11;

    let y = lineY + 16;

    // Date (left aligned)
    doc.setFont(bodyFont, bodyFontStyle);
    doc.setFontSize(bodyFontSize);
    const dateStr = new Date(submission.submitted_at).toLocaleDateString(
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
        (sum, p) => sum + p.amount,
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

    // Table Columns and Borders
    const col1X = 30;
    const col2X = pageWidth - 30;
    const tableWidth = col2X - col1X;
    const col1Width = tableWidth * 0.6; // 60% for Expense
    const col2Width = tableWidth * 0.4; // 40% for Amount
    const rowHeight = 8;
    let tableY = y;

    // Draw table header
    doc.setLineWidth(0.5);
    // Header row border
    doc.rect(col1X, tableY, col1Width, rowHeight);
    doc.rect(col1X + col1Width, tableY, col2Width, rowHeight);
    doc.setFont(bodyFont, "bold");
    doc.text("Expense", col1X + 2, tableY + 6);
    doc.text("Amount", col1X + col1Width + col2Width / 2, tableY + 6, {
        align: "center",
    });

    // Table Rows
    doc.setFont(bodyFont, bodyFontStyle);
    submission.priorities.forEach((priority, idx) => {
        const rowY = tableY + rowHeight * (idx + 1);
        // Row borders
        doc.rect(col1X, rowY, col1Width, rowHeight);
        doc.rect(col1X + col1Width, rowY, col2Width, rowHeight);
        // Expense (left)
        doc.text(priority.expense, col1X + 2, rowY + 6);
        // Amount (centered in its column)
        doc.text(
            priority.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            col1X + col1Width + col2Width / 2,
            rowY + 6,
            { align: "center" }
        );
    });

    // Total Row
    const totalRowY = tableY + rowHeight * (submission.priorities.length + 1);
    doc.setFont(bodyFont, "bold");
    doc.rect(col1X, totalRowY, col1Width, rowHeight);
    doc.rect(col1X + col1Width, totalRowY, col2Width, rowHeight);
    doc.text("TOTAL", col1X + 2, totalRowY + 6);
    doc.text(
        totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        col1X + col1Width + col2Width / 2,
        totalRowY + 6,
        { align: "center" }
    );

    doc.save(`priority_submission_${submission.id}.pdf`);
};