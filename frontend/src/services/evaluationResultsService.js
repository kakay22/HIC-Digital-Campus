import api from "./api";

const evaluationResultsService = {
  // Aggregate evaluation results
  async getResults(filters = {}) {
    const params = {};

    if (filters.education_level) {
      params.education_level = filters.education_level;
    }

    if (filters.academic_year) {
      params.academic_year = filters.academic_year;
    }

    if (filters.semester) {
      params.semester = filters.semester;
    }

    const response = await api.get("/admin/evaluation-results/", {
      params,
    });

    return response.data;
  },

  // Institutional reports and division comparisons
  async getInstitutionalReports(filters = {}) {
    const params = {};

    if (filters.education_level) {
      params.education_level = filters.education_level;
    }

    if (filters.academic_year) {
      params.academic_year = filters.academic_year;
    }

    if (filters.semester) {
      params.semester = filters.semester;
    }

    const response = await api.get("/admin/reports/institutional/", {
      params,
    });

    return response.data;
  },

  // List submitted evaluations
  async getEvaluations(filters = {}) {
    const params = {};

    if (filters.education_level) {
      params.education_level = filters.education_level;
    }

    if (filters.academic_year) {
      params.academic_year = filters.academic_year;
    }

    if (filters.semester) {
      params.semester = filters.semester;
    }

    if (filters.search) {
      params.search = filters.search;
    }

    if (filters.page) {
      params.page = filters.page;
    }

    if (filters.page_size) {
      params.page_size = filters.page_size;
    }

    const response = await api.get("/admin/evaluations/", {
      params,
    });

    return response.data;
  },

  // Get one submitted evaluation report
  async getEvaluationDetails(id) {
    const response = await api.get(`/admin/evaluations/${id}/`);

    return response.data;
  },
};

export default evaluationResultsService;