import { Readable } from "stream";
import {
  INSTALLATION_SEQ,
  REPAIR_SEQ,
  SERVICE_SEQ,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";

export const generateWorkOrderNumber = (type, sequenceValue) => {
  // Set the desired length of the sequence number (e.g., 4 digits for "S0001")
  const sequenceLength = 4;

  // Convert the sequenceValue to a string and pad with leading zeros
  const stringValue = sequenceValue.toString();
  const formattedSequence = stringValue.padStart(sequenceLength, "0");

  // Convert the first letter of the type to uppercase
  const formattedType = type.charAt(0).toUpperCase();

  // Combine the type and formatted sequence to create the work order number
  const workOrderNumber = `${formattedType}-${formattedSequence}`;

  return workOrderNumber;
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
