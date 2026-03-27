import axios from 'axios';

// AUTH_TOKEN should be either generated from your server or temporary developer token from VideoSDK dashboard
// For now, using a placeholder. In a real app, this should be fetched or securely stored.
export const VIDEOSDK_TOKEN = "YOUR_VIDEOSDK_TOKEN"; // TODO: Replace with real token

const API_BASE_URL = "https://api.videosdk.live/v2";

export const videoSdkApi = {
  /**
   * Create a new meeting/room
   */
  createMeeting: async (token: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/rooms`,
        {},
        {
          headers: {
            authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      const { roomId } = response.data;
      return roomId;
    } catch (error) {
      console.error("Error creating meeting:", error);
      throw error;
    }
  },

  /**
   * Validate if a meeting/room exists
   */
  validateMeeting: async (meetingId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/rooms/validate/${meetingId}`,
        {
          headers: {
            authorization: token,
          },
        }
      );
      return response.data.roomId === meetingId;
    } catch (error) {
      console.error("Error validating meeting:", error);
      return false;
    }
  },
};
