import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  userId: {
    type: String,
    requires: true,
  },
  firstName: {
    type: String,
    requires: true,
  },

  lastName: {
    type: String,
    requires: true,
  },
  email: {
    type: String,
    requires: true,
  },
  street: {
    type: String,
    requires: true,
  },
  city: { type: String, requires: true },
  state: { type: String, requires: true },
  zipcode: { type: Number, requires: true },
  country: { type: String, requires: true },
  phone: { type: String, requires: true },
});

const Address =
  mongoose.model.address || mongoose.model("address", addressSchema);

export default Address;
