import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "canvas";
import { getTempFolderPath } from "./commonServices.js";

const qrFolderPath = getTempFolderPath();

export const generateQrCodes = async (fileName, url) => {
  try {
    // Generate the QR code as a PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(url, { type: "png" });

    if (!fs.existsSync(qrFolderPath)) {
      fs.mkdirSync(qrFolderPath, { recursive: true });
    }

    // Save the QR code buffer to a temporary file
    const tempFilePath = path.join(qrFolderPath, fileName);

    const qrCodeDataUrl = `data:image/png;base64,${qrCodeBuffer.toString(
      "base64"
    )}`;

    const title = fileName.split(".").slice(0, -1).join(".");

    const canvasWidth = 400;
    const canvasHeight = 420;
    const qrCodeSize = 360; // Adjust as needed
    const qrCodeMarginTop = 10; // Margin between QR code and title
    const titleFontSize = 24;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Load QR code image from data URL
    const qrCodeImg = await loadImage(qrCodeDataUrl);

    // Calculate position for QR code to be centered horizontally
    const qrCodeX = (canvasWidth - qrCodeSize) / 2;
    const qrCodeY = qrCodeMarginTop;

    // Draw QR code
    ctx.drawImage(qrCodeImg, qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);

    // Calculate position for title text to be centered horizontally below QR code
    const titleX = canvasWidth / 2;
    const titleY = qrCodeY + qrCodeSize + qrCodeMarginTop + titleFontSize;

    // Draw title below the QR code
    ctx.font = `${titleFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(title, titleX, titleY);

    // Convert canvas to data URL
    const dataURL = canvas.toDataURL("image/png");

    // Write data URL to file
    fs.writeFileSync(
      tempFilePath,
      dataURL.replace(/^data:image\/png;base64,/, ""),
      "base64"
    );

    //fs.writeFileSync(tempFilePath, qrCodeBuffer);

    // Delete the temporary QR code file
    //fs.unlinkSync(tempFilePath);

    return { qrCodeDataUrl, tempFilePath };
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};
