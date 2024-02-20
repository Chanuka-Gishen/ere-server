import mongoose from "mongoose";

const Schema = mongoose.Schema;

const constantSchema = new Schema({
  constantCode: {
    type: String,
    required: true,
  },
  constantIsAvailable: {
    type: Boolean,
    default: true,
  },
});

const ConstantModel = mongoose.model("Constants", constantSchema);

export default ConstantModel;
