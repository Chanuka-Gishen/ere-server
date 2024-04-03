import { formatCurrency, getExactFilePath } from "./commonServices.js";

let y = 450;

const incrementYAndCheck = (doc) => {
  y += 30;
  if (y >= 750) {
    doc.addPage();
    y = 40; // Reset y for the new page
  }
  return y;
};

// Function to create PDF
export const generateInvoicePDF = (doc, customer, unit, workOrder, invoice) => {
  const logoPath = getExactFilePath("assets/ere-logo.jpg");

  // Logo and company information
  doc.image(logoPath, 40, 20, { width: 250 }); // Adjust position and size as needed
  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("E R Engineers", 370, 30, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("No: 70/1A,, Koralawella Rd,", 370, 60, {
      align: "left",
    })
    .text("Koralawella, Moratuwa.", 370, 80, {
      align: "left",
    });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("0112645675 (WorkShop)", 370, 100, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("0773878080 | 0716092000", 370, 120, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("erengineersere@gmail.com", 370, 140, { align: "left" });

  // Divider
  doc.moveTo(50, 160).lineTo(550, 160).stroke();

  // Bill To and Unit Reference
  doc.font("Helvetica-Bold").fontSize(12).text("Bill To", 50, 170);
  doc.font("Helvetica").fontSize(12).text(customer.customerName, 50, 190);
  doc.font("Helvetica-Bold").fontSize(12).text("Unit Reference", 50, 210);
  doc
    .font("Helvetica")
    .fontSize(12)
    .text(`${unit.unitBrand}-${unit.unitModel}-${unit.unitSerialNo}`, 50, 230);

  // JobCode#, Invoice#, Completed Date#
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Job Code #", 420, 170, { align: "right" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text(workOrder.workOrderCode, 420, 190, { align: "right" });
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Invoice No #", 420, 210, { align: "right" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text(workOrder.workOrderInvoiceNumber, 420, 230, { align: "right" });
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Completed Date #", 420, 250, { align: "right" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text(
      workOrder.workOrderCompletedDate
        ? new Date(workOrder.workOrderCompletedDate).toLocaleDateString({
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-",
      420,
      270,
      { align: "right" }
    );

  // Divider
  doc.moveTo(50, 290).lineTo(550, 290).stroke();

  doc.font("Helvetica-Bold").fontSize(12).text("Bank account details", 50, 310);
  doc.font("Helvetica-Bold").fontSize(12).text("Bank name", 50, 330);
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("Nations Trust Bank - Moratuwa", 200, 330);
  doc.font("Helvetica-Bold").fontSize(12).text("Account holder name", 50, 350);
  doc.font("Helvetica").fontSize(12).text("ER Engineers", 200, 350);
  doc.font("Helvetica-Bold").fontSize(12).text("Account number", 50, 370);
  doc.font("Helvetica").fontSize(12).text("014212025778", 200, 370);

  // Divider
  doc.moveTo(50, 390).lineTo(550, 390).stroke();

  // Table headers
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Item", 50, 410)
    //.text("Description", 150, 320)
    .text("Qty", 280, 410)
    .text("Unit Price", 350, 410)
    .text("Total Price", 450, 410, { align: "right" });

  doc.moveTo(50, 430).lineTo(550, 430).stroke();

  // Table rows
  invoice.items.forEach((item) => {
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(item.item, 50, y, { width: 200 })
      //.text(item.itemDescription, 150, y)
      .text(item.itemQty, 280, y, { width: 100 })
      .text(formatCurrency(item.itemGrossPrice), 350, y, { width: 100 })
      .text(formatCurrency(item.itemQty * item.itemGrossPrice), 450, y, {
        align: "right",
        width: 100,
      });
    y = incrementYAndCheck(doc);
  });

  //y += 20;

  // Service Chargers
  doc.font("Helvetica-Bold").fontSize(11).text("Service Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.serviceCharges.amount), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(doc);

  // Labour Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Labour Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.labourCharges.amount), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(doc);

  // Transport Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Transport Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.transportCharges.amount), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(doc);

  // Other Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Other Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.otherCharges.amount), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(doc);

  // Discount
  doc.font("Helvetica-Bold").fontSize(11).text("Discount", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(`${invoice.discount.percentage} %`, 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(doc);

  // Grand Total
  doc.font("Helvetica-Bold").fontSize(12).text("Grand Total", 250, y);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(formatCurrency(invoice.grandTotal), 450, y, { align: "right" });

  // Return the stream
  return doc;
};
