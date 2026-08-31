const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "public", "uploads", "aduan");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },

    filename(req, file, cb) {
        const ext = path.extname(file.originalname);

        const filename =
            "ADUAN-" +
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            ext;

        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {

    const allowed = [
        ".jpg",
        ".jpeg",
        ".png",
        ".pdf",
        ".doc",
        ".docx"
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Format file tidak didukung"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const uploadAduanMiddleware = upload.single("lampiran");

function hapusFile(fileName) {

    if (!fileName) return;

    const filePath = path.join(uploadDir, fileName);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

module.exports = {
    uploadAduanMiddleware,
    hapusFile
};