import api from "./api";

const studentService = {
  // Get registered student IDs with optional filters.
  async getStudents(filters = {}) {
    const response = await api.get("/admin/students/", { params: filters });

    // Supports both normal arrays and DRF pagination.
    return Array.isArray(response.data)
      ? response.data
      : response.data.results || [];
  },

  // Register one student ID.
  async createStudent(data) {
    const response = await api.post("/admin/students/", data);
    return response.data;
  },

  // Register many student IDs at once. Returns { created, skipped }.
  async bulkCreateStudents(data) {
    const response = await api.post("/admin/students/bulk/", data);
    return response.data;
  },

  // Update a student ID or division.
  async updateStudent(id, data) {
    const response = await api.patch(`/admin/students/${id}/`, data);
    return response.data;
  },

  // Deactivate a student ID without deleting anything.
  async archiveStudent(id) {
    const response = await api.post(`/admin/students/${id}/archive/`);
    return response.data;
  },

  // Reactivate a student ID.
  async restoreStudent(id) {
    const response = await api.post(`/admin/students/${id}/restore/`);
    return response.data;
  },
};

export default studentService;