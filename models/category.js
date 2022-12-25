const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: String,
  icon: String,
  color: String,
  subcategories: [
    {
      name: String,
    },
  ],
});

categorySchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

module.exports = mongoose.model("Category", categorySchema);
