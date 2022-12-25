const config = require("./config");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const storage = multer.diskStorage({
  destination: function (request, file, cb) {
    cb(null, "tmp/");
  },
  filename: function (request, file, cb) {
    const uniqueSuffix = Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ".png");
  },
});

cloudinary.config({
  cloud_name: config.CLOUD_NAME,
  api_key: config.API_KEY,
  api_secret: config.API_SECRET,
});

const upload = multer({ storage });

const cloudinaryImageUpload = async (file) => {
  return new Promise((resolve) => {
    cloudinary.uploader.upload(file, (err, result) => {
      if (err) return result.status(500).send("upload image error");
      resolve({
        url: result.secure_url,
        photo_id: result.public_id,
      });
    });
  });
};

const cloudinaryImageDeletion = (file) => cloudinary.uploader.destroy(file);

module.exports = {
  upload,
  cloudinaryImageUpload,
  cloudinaryImageDeletion,
};
