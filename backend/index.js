// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const { fromPath } = require("pdf2pic");
const pdfParse = require("pdf-parse");
const helmet = require("helmet");
const RateLimit = require("express-rate-limit");
const compression = require("compression");

const app = express();
const PORT = 3000;
const limiter = RateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
});

// Enable CORS so React can communicate with your server
app.use(cors());
app.use(helmet());
app.use(limiter);
app.use(compression()); // Compress all routes

// Set up multer for file uploads
const upload = multer({ dest: "uploads/" });

// Utility to remove files/directories recursively
const deleteFolderRecursive = (folderPath) => {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
};

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // Set response headers for a zip file download with the original name
  const originalName = req.file.originalname;
  const zipName = originalName.replace(/\.[^/.]+$/, "") + ".zip";

  const pdfPath = req.file.path;
  const outputDir = path.join(__dirname, "output", path.parse(req.file.filename).name);

  // Create the output directory if it doesn't exist
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // Read the PDF file into a buffer
    const dataBuffer = fs.readFileSync(pdfPath);

    // Use pdf-parse to get PDF metadata, including the number of pages.
    const pdfData = await pdfParse(dataBuffer);
    const numPages = pdfData.numpages;
    if (!numPages || numPages === 0) {
      throw new Error("Failed to determine number of pages.");
    }

    // Set conversion options for pdf2pic
    const options = {
      width: undefined,
      height: undefined,
      density: 330,
      saveFilename: "page", // Files will be named page_1.png, page_2.png, etc.
      savePath: outputDir,
      format: "png",
    };

    const convert = fromPath(pdfPath, options);

    // Convert each page
    for (let i = 1; i <= numPages; i++) {
      console.log(`Converting page ${i} of ${numPages}...`);
      await convert(i);
    }

    console.log(zipName);
    // Expose Content-Disposition header to the client
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // Pipe the archive data to the response
    archive.pipe(res);

    // Append PNG files to the archive from the output directory
    archive.directory(outputDir, false);

    // Finalize the archive (this sends the ZIP file)
    await archive.finalize();

    // Clean up temporary files after the archive is done streaming.
    archive.on("end", () => {
      fs.unlinkSync(pdfPath);
      deleteFolderRecursive(outputDir);
    });
  } catch (err) {
    console.error("Error during processing:", err);
    res.status(500).send("Error processing PDF.");
    // Clean up the uploaded PDF and output directory if they exist
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    if (fs.existsSync(outputDir)) deleteFolderRecursive(outputDir);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
