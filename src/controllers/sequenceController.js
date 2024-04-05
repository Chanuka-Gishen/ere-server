import {
  INSTALLATION_SEQ,
  INVOICE_SEQUENCE,
  QR_SEQUENCE,
  REPAIR_SEQ,
  SERVICE_SEQ,
} from "../constants/commonConstants.js";
import Sequence from "../models/sequenceModel.js";

export const addSequence = async () => {
  const existingSequences = await Sequence.find();

  const list = [
    INSTALLATION_SEQ,
    SERVICE_SEQ,
    REPAIR_SEQ,
    QR_SEQUENCE,
    INVOICE_SEQUENCE,
  ];

  for (const type of list) {
    const existingSequence = existingSequences.find(
      (sequence) => sequence.sequenceType === type
    );

    if (!existingSequence) {
      await Sequence.create({ sequenceType: type });
    }
  }

  return;
};

export const getSequenceValue = async (type) => {
  const result = await Sequence.findOne({ sequenceType: type });
  return result.sequenceValue;
};

export const updateSequenceValue = async (type) => {
  const sequence = await Sequence.findOne({ sequenceType: type });
  sequence.sequenceValue += 1;

  return await sequence.save();
};
