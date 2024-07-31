import {
  CMP_SINGER,
  CMP_SINGER_DIR,
  CMP_SINHAGIRI,
  CMP_SINHAGIRI_DIR,
} from "../constants/commonConstants.js";
import { formatCurrency, getExactFilePath } from "./commonServices.js";

// Function to create PDF
export const generateInvoicePDF = (doc, customer, unit, workOrder, invoice) => {
  let y = 140;

  const incrementYAndCheck = (incrementBy) => {
    y += incrementBy ? incrementBy : 20;
    if (y >= 750) {
      doc.addPage();
      y = 40; // Reset y for the new page
    }
    return y;
  };

  const logoPath = getExactFilePath("assets/ere-logo.jpg");
  const abansLogoPath = getExactFilePath("assets/abans.jpg");

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

  if ([CMP_SINGER, CMP_SINGER_DIR].includes(workOrder.workOrderFrom)) {
    doc.image(abansLogoPath, 50, 157, { width: 100 });
    doc
      .font("Helvetica")
      .fontSize(12)
      .text("Authorized Agent", 160, 160, { align: "left" });

    incrementYAndCheck(40);
  } else {
    incrementYAndCheck();
  }

  // Divider
  doc.moveTo(50, y).lineTo(550, y).stroke();
  incrementYAndCheck(10);

  if ([CMP_SINHAGIRI, CMP_SINHAGIRI_DIR].includes(workOrder.workOrderFrom)) {
    doc.font("Helvetica-Bold").fontSize(14).text("Singhagiri (Pvt) Ltd", 50, y);
    incrementYAndCheck(30);
    // Bill To, Unit Reference, JobCode#, Invoice#, Completed Date#

    doc.font("Helvetica-Bold").fontSize(12).text("Bill To", 50, y);
    doc.font("Helvetica").fontSize(12).text(customer.customerName, 200, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Job Code #", 420, y, { align: "right" });

    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Job Site", 50, y);
    doc.font("Helvetica").fontSize(12).text(customer.customerAddress, 200, y);

    doc
      .font("Helvetica")
      .fontSize(12)
      .text(workOrder.workOrderCode, 420, y, { align: "right" });
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Contact Number", 50, y);

    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        customer.customerTel.mobile ? customer.customerTel.mobile : " - ",
        200,
        y
      );
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Invoice No #", 420, y, { align: "right" });

    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Unit Reference", 50, y);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(invoice.invoiceNumber, 420, y, { align: "right" });

    incrementYAndCheck();

    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`${unit.unitBrand}-${unit.unitModel}-${unit.unitSerialNo}`, 50, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)

      .text("Completed Date #", 420, y, { align: "right" });

    incrementYAndCheck();

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
        y,
        { align: "right" }
      );
  } else {
    // ERE, Singer Direct, Singhagiri Direct
    // Bill To , Unit Reference, JobCode#, Invoice#, Completed Date#

    doc.font("Helvetica-Bold").fontSize(12).text("Bill To", 50, y);
    doc.font("Helvetica").fontSize(12).text(customer.customerName, 200, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Job Code #", 420, y, { align: "right" });

    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Contact Number", 50, y);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        customer.customerTel.mobile ? customer.customerTel.mobile : " - ",
        200,
        y
      );

    doc
      .font("Helvetica")
      .fontSize(12)
      .text(workOrder.workOrderCode, 420, y, { align: "right" });
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Unit Reference", 50, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Invoice No #", 420, y, { align: "right" });
    incrementYAndCheck();
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`${unit.unitBrand}-${unit.unitModel}-${unit.unitSerialNo}`, 50, y);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(invoice.invoiceNumber, 420, y, { align: "right" });

    incrementYAndCheck();
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Completed Date #", 420, y, { align: "right" });

    incrementYAndCheck();
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
        y,
        { align: "right" }
      );
  }

  if (![CMP_SINHAGIRI, CMP_SINGER].includes(workOrder.workOrderFrom)) {
    // Divider
    incrementYAndCheck();
    doc.moveTo(50, y).lineTo(550, y).stroke();

    incrementYAndCheck(10);
    doc.font("Helvetica-Bold").fontSize(12).text("Bank account details", 50, y);
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Bank name", 50, y);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text("Nations Trust Bank - Moratuwa", 200, y);
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Account holder name", 50, y);
    doc.font("Helvetica").fontSize(12).text("ER Engineers", 200, y);
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Account number", 50, y);
    doc.font("Helvetica").fontSize(12).text("014212025778", 200, y);
  }

  // Divider
  incrementYAndCheck();
  doc.moveTo(50, y).lineTo(550, y).stroke();

  // Table headers
  incrementYAndCheck();
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Item", 50, y)
    //.text("Description", 150, 320)
    .text("Qty", 280, y)
    .text("Unit Price", 350, y)
    .text("Total Price", 450, y, { align: "right" });

  incrementYAndCheck();
  doc.moveTo(50, y).lineTo(550, y).stroke();

  // Table rows
  incrementYAndCheck(30);
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
    y = incrementYAndCheck(30);
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
  y = incrementYAndCheck(30);

  // Labour Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Labour Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.labourCharges.amount), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(30);

  // Transport Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Transport Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.transportCharges.amount), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(30);

  // Other Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Other Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.otherCharges.amount), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(30);

  // Discount
  doc.font("Helvetica-Bold").fontSize(11).text("Discount", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(`${invoice.discount.percentage} %`, 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(30);

  // Grand Total
  doc.font("Helvetica-Bold").fontSize(12).text("Grand Total", 250, y);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(formatCurrency(invoice.grandTotal), 450, y, { align: "right" });

  // Return the stream
  return doc;
};

// Function to create PDF for multiple invoices
export const generateMultipleInvoicePDF = (
  doc,
  customer,
  workOrder,
  invoice
) => {
  let y = 140;

  const incrementYAndCheck = (incrementBy) => {
    y += incrementBy ? incrementBy : 20;
    if (y >= 750) {
      doc.addPage();
      y = 40; // Reset y for the new page
    }
    return y;
  };

  const logoPath = getExactFilePath("assets/ere-logo.jpg");
  const abansLogoPath = getExactFilePath("assets/abans.jpg");

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

  if ([CMP_SINGER, CMP_SINGER_DIR].includes(workOrder.workOrderFrom)) {
    doc.image(abansLogoPath, 50, 157, { width: 100 });
    doc
      .font("Helvetica")
      .fontSize(12)
      .text("Authorized Agent", 160, 160, { align: "left" });

    incrementYAndCheck(40);
  } else {
    incrementYAndCheck();
  }

  // Divider
  doc.moveTo(50, y).lineTo(550, y).stroke();
  incrementYAndCheck(10);

  if ([CMP_SINHAGIRI, CMP_SINHAGIRI_DIR].includes(workOrder.workOrderFrom)) {
    doc.font("Helvetica-Bold").fontSize(14).text("Singhagiri (Pvt) Ltd", 50, y);
    // Bill To and Unit Reference
    incrementYAndCheck(30);
    doc.font("Helvetica-Bold").fontSize(12).text("Bill To", 50, y);
    doc.font("Helvetica").fontSize(12).text(customer.customerName, 200, y);
    // Completed Date#
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Completed Date #", 420, y, { align: "right" });

    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Job Site", 50, y);
    doc.font("Helvetica").fontSize(12).text(customer.customerAddress, 200, y);
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
        y,
        { align: "right" }
      );

    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Contact Number", 50, y);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        customer.customerTel.mobile ? customer.customerTel.mobile : " - ",
        200,
        y
      );
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Unit Reference", 50, y);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`${workOrder.workOrderLinked.length} Units`, 200, y);
  } else {
    // Bill To, Unit Reference, Completed Date#
    doc.font("Helvetica-Bold").fontSize(12).text("Bill To", 50, y);
    doc.font("Helvetica").fontSize(12).text(customer.customerName, 200, y);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Completed Date #", 420, y, { align: "right" });

    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Unit Reference", 50, y);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`${workOrder.workOrderLinked.length} Units`, 200, y);
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
        y,
        { align: "right" }
      );
  }

  if (![CMP_SINHAGIRI, CMP_SINGER].includes(workOrder.workOrderFrom)) {
    // Divider
    incrementYAndCheck();
    doc.moveTo(50, y).lineTo(550, y).stroke();

    incrementYAndCheck(10);
    doc.font("Helvetica-Bold").fontSize(12).text("Bank account details", 50, y);
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Bank name", 50, y);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text("Nations Trust Bank - Moratuwa", 200, y);
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Account holder name", 50, y);
    doc.font("Helvetica").fontSize(12).text("ER Engineers", 200, y);
    incrementYAndCheck();
    doc.font("Helvetica-Bold").fontSize(12).text("Account number", 50, y);
    doc.font("Helvetica").fontSize(12).text("014212025778", 200, y);
  }

  // Divider
  incrementYAndCheck();
  doc.moveTo(50, y).lineTo(550, y).stroke();

  // Table headers
  incrementYAndCheck();
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Item", 50, y)
    //.text("Description", 150, 320)
    .text("Qty", 280, y)
    .text("Unit Price", 350, y)
    .text("Total Price", 450, y, { align: "right" });

  incrementYAndCheck();
  doc.moveTo(50, y).lineTo(550, y).stroke();

  // Table rows
  incrementYAndCheck();
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
    y = incrementYAndCheck(30);
  });

  //y += 20;

  // Service Chargers
  doc.font("Helvetica-Bold").fontSize(11).text("Service Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.serviceCharges), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(30);

  // Labour Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Labour Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.labourCharges), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(30);

  // Transport Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Transport Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.transportCharges), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(30);

  // Other Chargers
  doc.font("Helvetica-Bold").fontSize(12).text("Other Chargers", 250, y);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(formatCurrency(invoice.otherCharges), 450, y, {
      align: "right",
    });
  y = incrementYAndCheck(30);

  // Discount
  // doc.font("Helvetica-Bold").fontSize(11).text("Discount", 250, y);
  // doc
  //   .font("Helvetica")
  //   .fontSize(11)
  //   .text(`${invoice.discount.percentage} %`, 450, y, {
  //     align: "right",
  //   });
  // y = incrementYAndCheck(doc);

  // Grand Total
  doc.font("Helvetica-Bold").fontSize(12).text("Grand Total", 250, y);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(formatCurrency(invoice.grandTotal), 450, y, { align: "right" });

  // Return the stream
  return doc;
};
