import { axiosInstance } from "../api";

export const uploadCsv = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

    const res = await axiosInstance.post("/lead/bulk-upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        }
    });
    return res.data;
    } catch (err) {
        console.log("error from uploadCsv----->>>", err);
        throw new Error(err.res.message);
    }
};