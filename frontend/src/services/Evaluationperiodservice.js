import api from "./api";

const evaluationPeriodService = {
  // Get all evaluation periods.
  async getPeriods(filters = {}) {
    const response = await api.get("/admin/periods/", { params: filters });

    // Supports both normal arrays and DRF pagination.
    return Array.isArray(response.data)
      ? response.data
      : response.data.results || [];
  },

  // Create a period.
  async createPeriod(data) {
    const response = await api.post("/admin/periods/", data);
    return response.data;
  },

  // Update a period.
  async updatePeriod(id, data) {
    const response = await api.patch(`/admin/periods/${id}/`, data);
    return response.data;
  },

  // Open a period. Any other open period in the same division is closed.
  async openPeriod(id) {
    const response = await api.post(`/admin/periods/${id}/open/`);
    return response.data;
  },

  // Close a period.
  async closePeriod(id) {
    const response = await api.post(`/admin/periods/${id}/close/`);
    return response.data;
  },
};

export default evaluationPeriodService;