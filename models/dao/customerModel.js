import mongoose from "mongoose";

const Schema = mongoose.Schema;

const customerSchema = new Schema({
  customerName: {
    type: String,
    required: true,
    unique: true,
  },
  customerAddress: {
    type: String,
    required: true,
  },
  customerTel: {
    mobile: {
      type: String,
      required: true,
    },
    landline: {
      type: String,
    },
  },
  customerEmail: {
    type: String,
  },
});

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
