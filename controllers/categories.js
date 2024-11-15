const categoryRouter = require("express").Router();
const Category = require("../models/category");
const cloudinary = require("../utils/cloudinary");

categoryRouter.get("/", async (request, response) => {
  const categories = await Category.find({});
  response.json(categories);
});

categoryRouter.post("/", async (request, response) => {
  const { name, icon, color, subcategories } = request.body;

  const subcategoriesArray = subcategories.map((element) => ({
    name: element,
  }));

  const category = new Category({
    name,
    icon,
    color,
    subcategories: subcategoriesArray,
  });

  const savedCategory = await category.save();

  response.status(201).json(savedCategory);
});

module.exports = categoryRouter;
