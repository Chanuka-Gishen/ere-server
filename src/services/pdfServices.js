import { formatCurrency, getExactFilePath } from "./commonServices.js";

// Function to create PDF
export const generateInvoicePDF = (doc, customer, unit, workOrder, invoice) => {
  const logoPath = getExactFilePath("assets/ere-logo.jpg");

  // Logo and company information
  doc.image(logoPath, 40, 20, { width: 200 }); // Adjust position and size as needed
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("E R Engineers", 390, 30, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("No: 70/1A,, Koralawella Rd,", 390, 60, {
      align: "left",
    })
    .text("Koralawella, Moratuwa.", 390, 80, {
      align: "left",
    });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("0112645675 (WorkShop)", 390, 100, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("0773878080 | 0716092000", 390, 120, { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(12)
    .text("erengineersere@gmail.com", 390, 140, { align: "left" });

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

  // Table headers
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Item", 50, 320)
    //.text("Description", 150, 320)
    .text("Qty", 280, 320)
    .text("Unit Price", 350, 320)
    .text("Total Price", 450, 320, { align: "right" });

  doc.moveTo(50, 340).lineTo(550, 340).stroke();

  // Table rows
  let y = 360;
  invoice.items.forEach((item) => {
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(item.item, 50, y, { width: 200 })
      //.text(item.itemDescription, 150, y)
      .text(item.itemQty, 280, y, { width: 100 })
      .text(formatCurrency(item.itemGrossPrice), 350, y, { width: 100 })
      .text(formatCurrency(item.itemQty * item.itemGrossPrice), 450, y, {
        align: "right",
        width: 100,
      });
    y += 30;
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 20;
  });

  y += 20;

  // Service Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Service Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(12)
    .text(formatCurrency(invoice.serviceCharges.amount), 450, y, {
      align: "right",
    });
  y += 20;

  // Labour Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Labour Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(12)
    .text(formatCurrency(invoice.labourCharges.amount), 450, y, {
      align: "right",
    });
  y += 20;

  // Transport Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Transport Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(12)
    .text(formatCurrency(invoice.transportCharges.amount), 450, y, {
      align: "right",
    });
  y += 20;

  // Other Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Other Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(12)
    .text(formatCurrency(invoice.otherCharges.amount), 450, y, {
      align: "right",
    });
  y += 20;

  // Grand Total
  doc.font("Helvetica-Bold").fontSize(12).text("Grand Total", 250, y);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(formatCurrency(invoice.grandTotal), 450, y, { align: "right" });

  // Return the stream
  return doc;
};
