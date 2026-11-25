import api from "./api";

const BASE_URL = "/admin/questionnaire/";

const questionnaireService = {
  get: async (division = "COLLEGE") => {
    const response = await api.get(BASE_URL, {
      params: { education_level: division },
    });

    return response.data;
  },

  createSection: async (data) => {
    const response = await api.post(`${BASE_URL}sections/`, data);
    return response.data;
  },

  updateSection: async (id, data) => {
    const response = await api.patch(`${BASE_URL}sections/${id}/`, data);
    return response.data;
  },

  createQuestion: async (data) => {
    const response = await api.post(`${BASE_URL}questions/`, data);
    return response.data;
  },

  updateQuestion: async (id, data) => {
    const response = await api.patch(`${BASE_URL}questions/${id}/`, data);
    return response.data;
  },

  toggleQuestion: async (id, isActive) => {
    const response = await api.post(`${BASE_URL}questions/${id}/toggle/`, {
      is_active: isActive,
    });

    return response.data;
  },

  reorderSections: async (division, sectionIds) => {
    const response = await api.post(`${BASE_URL}sections/reorder/`, {
      education_level: division,
      section_ids: sectionIds,
    });

    return response.data;
  },

  reorderQuestions: async (sectionId, questionIds) => {
    const response = await api.post(`${BASE_URL}questions/reorder/`, {
      section: sectionId,
      question_ids: questionIds,
    });

    return response.data;
  },

  applyBoth: async (sourceDivision) => {
    const response = await api.post(`${BASE_URL}apply-both/`, {
      source_division: sourceDivision,
    });

    return response.data;
  },
};

export default questionnaireService;