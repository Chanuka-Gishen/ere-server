import mongoose from "mongoose";

const Schema = mongoose.Schema;

const airConditionerSchema = new Schema({
  brand: {
    type: String,
    required: true,
  },
  models: [
    {
      type: String,
      required: true,
    },
  ],
});

const AirConditionerModel = mongoose.model(
  "AirConditioner",
  airConditionerSchema
);

export default AirConditionerModel;
