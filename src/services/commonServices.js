import dotenv from "dotenv";
import { Readable } from "stream";
import {
  INSTALLATION_SEQ,
  REPAIR_SEQ,
  SERVICE_SEQ,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";
dotenv.config();

export const isValidString = (str) => {
  return typeof str === "string" && str.trim() !== "";
};

export const generateWorkOrderNumber = (type, sequenceValue, scheduledDate) => {
  // Set the desired length of the sequence number (e.g., 4 digits for "S0001")
  const sequenceLength = 4;

  // Convert the sequenceValue to a string and pad with leading zeros
  const stringValue = sequenceValue.toString();
  const formattedSequence = stringValue.padStart(sequenceLength, "0");

  const date = new Date(scheduledDate);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Adding 1 because getMonth() returns 0-based month
  const day = String(date.getDate()).padStart(2, "0");

  const formattedDate = `${year}${month}${day}`;

  // Convert the first letter of the type to uppercase
  const formattedType = type.charAt(0).toUpperCase();

  // Combine the type and formatted sequence to create the work order number
  const workOrderNumber = `${formattedType}-${formattedDate}-${formattedSequence}`;

  return workOrderNumber;
};

export const updateDateInWorkOrderCode = (type, scheduledDate, value) => {
  const date = new Date(scheduledDate);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Adding 1 because getMonth() returns 0-based month
  const day = String(date.getDate()).padStart(2, "0");

  const formattedDate = `${year}${month}${day}`;

  const workOrderNumber = `${type}-${formattedDate}-${value}`;

  return workOrderNumber;
};

export const generateInvoiceNumber = (sequenceValue) => {
  // Set the desired length of the sequence number (e.g., 4 digits for "S0001")
  const sequenceLength = 4;

  // Convert the sequenceValue to a string and pad with leading zeros
  const stringValue = sequenceValue.toString();
  const formattedSequence = stringValue.padStart(sequenceLength, "0");

  const invoiceNumber = `INV${formattedSequence}`;

  return invoiceNumber;
};

export const generateQrCodeFileName = (sequenceValue) => {
  const sequenceLength = 4;

  const stringValue = sequenceValue.toString();
  const formattedSequence = stringValue.padStart(sequenceLength, "0");

  const fileName = `QR-${formattedSequence}`;

  return fileName;
};

export const getSequenceType = (workType) => {
  switch (workType) {
    case WORK_ORD_SERVICE:
      return SERVICE_SEQ;
    case WORK_ORD_REPAIR:
      return REPAIR_SEQ;
    case WORK_ORD_INSTALLATION:
      return INSTALLATION_SEQ;
    default:
      return null;
  }
};

export const createRandomPassword = () => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const length = 8;
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset.charAt(randomIndex);
  }

  return randomString;
};

export const createReadableStream = (imageData) => {
  const stream = new Readable();
  stream.push(Buffer.from(imageData, "base64"));
  stream.push(null);
  return stream;
};

const roundUpWithoutExceeding = (value) => {
  // Check if the value has a decimal part
  if (value % 1 === 0) {
    return value; // Return as-is if there's no decimal part
  } else {
    return Math.floor(value); // Round down to the nearest integer if there's a decimal part
  }
};

export const divideSalaryAmongEmployees = (
  technicianCount,
  helperCount,
  totalTips
) => {
  let perTechnicianAmount = 0;
  let perHelperAmount = 0;

  if (technicianCount > 0 && helperCount > 0) {
    const tech_ratio = 1.8;
    const total_weight = technicianCount * tech_ratio + helperCount;

    perTechnicianAmount = (totalTips * tech_ratio) / total_weight;
    perHelperAmount = totalTips / total_weight;
  } else if (technicianCount > 0) {
    // Only technicians, divide the total salary among technicians
    perTechnicianAmount = totalTips / technicianCount;
  } else if (helperCount > 0) {
    // Only helpers, divide the total salary among helpers
    perHelperAmount = totalTips / helperCount;
  }

  return {
    perTechnicianAmount: roundUpWithoutExceeding(perTechnicianAmount),
    perHelperAmount: roundUpWithoutExceeding(perHelperAmount),
  };
};

export const getGoogleKeyFilePath = () => {
  const isLocalhost = process.env.NODE_ENV === "development"; // Assuming you set NODE_ENV appropriately
  if (isLocalhost) {
    return "api_credentials.json";
  } else {
    return "/home/ec2-user/server/ere-server/api_credentials.json";
  }
};

export const getTempFolderPath = () => {
  const isLocalhost = process.env.NODE_ENV === "development"; // Assuming you set NODE_ENV appropriately
  if (isLocalhost) {
    return "tmp";
  } else {
    return "/home/ec2-user/server/ere-server/tmp";
  }
};

export const getExactFilePath = (path) => {
  const isLocalhost = process.env.NODE_ENV === "development"; // Assuming you set NODE_ENV appropriately
  if (isLocalhost) {
    return path;
  } else {
    return `/home/ec2-user/server/ere-server/${path}`;
  }
};

export const formatCurrency = (amount) => {
  const formattedAmount = amount
    .toLocaleString("en-IN", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    })
    .replace("LKR", "Rs.");
  return formattedAmount;
};
