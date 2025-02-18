import { useState } from 'react'
import { useDropzone } from "react-dropzone";
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import './App.css'

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // onDrop callback when files are dragged & dropped or selected via file dialog
  const onDrop = (acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  // Set up dropzone options: only accept PDF files.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "application/pdf",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
  
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const response = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });

      if(!response.ok) {
        throw new Error("File upload failed");
      }

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "download.zip"; // default name

      // console.log(response);
      // console.log(contentDisposition);
  
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
  
      // Expecting a blob (ZIP file)
      const blob = await response.blob();
      // Create a URL for the blob and set it for download
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger the download automatically
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup: remove the link and revoke the object URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error: " + error.message + " \nPlease try a different file"); // Display the error message in a pop-up dialog
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box
      sx={{
        maxWidth: 600,
        mx: 'auto',
        mt: 4,
        p: 2,
      }}
    >
      <Typography variant="h4" align="center" gutterBottom>
        Upload PDF and Convert to PNG
      </Typography>

      {/* Drag & Drop Area */}
      <Paper
        {...getRootProps()}
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          border: '4px dashed white',
          backgroundColor: isDragActive ? '#242424': '#242424',
          cursor: 'pointer',
          mb: 2,
          minHeight: '40vh',
          color: 'white',
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <Typography variant="h6">Drop the file here...</Typography>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <FileOpenIcon style={{ fontSize: 40, marginBottom: 10 }} />
            <Typography variant="h6">
              Drag & drop a PDF here, or click to select a file
            </Typography>
          </div>
        )}
      </Paper>

      {/* Display selected file name */}
      {file && (
        <Typography variant="body1" align="center" sx={{ mb: 2 }}>
          Selected file: {file.name}
        </Typography>
      )}

      {/* Submit Button */}
      <Box textAlign="center" sx={{ position: 'relative' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!file || loading}
          sx={{ minWidth: 200, minHeight: 40 }}
        >
          Upload & Convert
        </Button>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default App
