
import api from "./api";

const profileService = {
  async getProfile() {
    const response = await api.get("/auth/me/");
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.patch("/auth/me/", data);
    return response.data;
  },

  async changePassword(data) {
    const response = await api.post("/auth/change-password/", data);
    return response.data;
  },
};

export default profileService;
