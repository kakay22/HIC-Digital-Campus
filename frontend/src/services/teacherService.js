
import api from "./api";

const teacherService = {
  // Get teachers with optional filters.
  async getTeachers(filters = {}) {
    const response = await api.get("/admin/teachers/", {
      params: filters,
    });

    // Supports both normal arrays and DRF pagination.
    return Array.isArray(response.data)
      ? response.data
      : response.data.results || [];
  },

  // Get one teacher.
  async getTeacher(id) {
    const response = await api.get(`/admin/teachers/${id}/`);
    return response.data;
  },

  // Create teacher.
  async createTeacher(data) {
    const response = await api.post("/admin/teachers/", data);
    return response.data;
  },

  // Update teacher.
  async updateTeacher(id, data) {
    const response = await api.patch(`/admin/teachers/${id}/`, data);
    return response.data;
  },

  // Archive teacher without deleting evaluation history.
  async archiveTeacher(id) {
    const response = await api.post(`/admin/teachers/${id}/archive/`);
    return response.data;
  },

  // Get available courses.
  async getCourses() {
    const response = await api.get("/admin/courses/");

    return Array.isArray(response.data)
      ? response.data
      : response.data.results || [];
  },
};

export default teacherService;
