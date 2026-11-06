import { axiosInstance } from "../services/api";

/**
 * Global search utility for GET requests with search_text and other query params.
 * @param {string} baseUrl - The base endpoint URL (e.g., '/lead/my-rejected-leads')
 * @param {object} params - Query params as an object (e.g., { page, limit, search_text })
 * @returns {Promise<any>} - The API response data
 */
export async function searchWithQueryParams(baseUrl, params = {}) {
  try {
    // Remove undefined or empty params
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    );
    const queryString = new URLSearchParams(filteredParams).toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    const res = await axiosInstance.get(url);
    if (res.status === 200) {
      return res.data;
    }
    throw new Error(res.statusText);
  } catch (err) {
    console.log("error from searchWithQueryParams----->>>", err);
    throw new Error(err.response?.message || "Failed to fetch data");
  }
}