import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { uploadCsv } from "../../services/functions/marketing";

const Marketing = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const { mutate: uploadCsvFile, isPending } = useMutation({
    mutationFn: uploadCsv,
    onSuccess: () => {
      queryClient.invalidateQueries(["upload-csv-file"]);
      toast.success("Leads uploaded successfully");
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to upload leads");
    },
  });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes

    if (file) {
      if (file.size > maxSize) {
        setError("File size exceeds 25MB limit");
        setSelectedFile(null);
        event.target.value = "";
        return;
      }

      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file");
        setSelectedFile(null);
        event.target.value = "";
        return;
      }

      setSelectedFile(file);
      setError("");
    } else {
      setSelectedFile(null);
      setError("");
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      // setError("Please select a file first");
      return;
    }
    uploadCsvFile(selectedFile);
  };

  return (
    <div className="p-8 mt-25 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Upload Marketing Leads
        </h2>
        <p className="text-gray-600">
          Upload your CSV file containing lead information
        </p>
        <p className="text-red-600 mt-2">
          * CSV must contain the following fields: Full name, Email, Mobile, PAN
        </p>
      </div>

      <div className="relative group">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-all duration-200"
        >
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              {selectedFile
                ? selectedFile.name
                : "Drag & drop your CSV file here, or click to browse"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Maximum file size: 25MB
            </p>
          </div>
        </label>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={handleUpload}
          disabled={isPending}
          className={`
                        relative px-6 py-3 rounded-full text-sm font-medium text-white
                        transition-all duration-200 transform hover:scale-105 cursor-pointer
                        ${
                          selectedFile && !isPending
                            ? "bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
                            : "bg-gray-400 cursor-not-allowed"
                        }
                    `}
        >
          {isPending ? (
            <div className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Uploading...
            </div>
          ) : (
            "Upload CSV"
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="flex items-center text-sm text-red-600">
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        </div>
      )}

      {selectedFile && !error && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="flex items-center text-sm text-green-600">
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            File selected: {selectedFile.name}
          </p>
        </div>
      )}
    </div>
  );
};

export default Marketing;
