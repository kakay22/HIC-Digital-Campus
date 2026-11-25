
import api from "./api";

const suggestionsService = {
  async getSuggestions(filters = {}) {
    const params = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params[key] = value;
      }
    });

    const response = await api.get("/admin/suggestions/", { params });
    return response.data;
  },

  async getSuggestion(id) {
    const response = await api.get(`/admin/suggestions/${id}/`);
    return response.data;
  },

  async updateSuggestion(id, data) {
    const response = await api.patch(`/admin/suggestions/${id}/`, data);
    return response.data;
  },
};

export default suggestionsService;
