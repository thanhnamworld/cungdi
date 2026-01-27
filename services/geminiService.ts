
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Fetches estimated route details from Gemini API.
 * @param originName The starting point of the route.
 * @param destinationName The ending point of the route.
 * @returns A promise that resolves to an object with distance, duration, and durationInMinutes, or null on error.
 */
export const getRouteDetails = async (originName: string, destinationName: string): Promise<{ distance: string; duration: string; durationInMinutes: number } | null> => {
  try {
    // FIX: Luôn sử dụng new GoogleGenAI({apiKey: process.env.API_KEY}) theo quy định mới nhất.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const schema = {
      type: Type.OBJECT,
      properties: {
        distance: {
          type: Type.STRING,
          description: "Quãng đường ước tính bằng xe ô tô, định dạng chuỗi. Ví dụ: '110 km'",
        },
        duration: {
          type: Type.STRING,
          description: "Thời gian lái xe ô tô ước tính, định dạng chuỗi. Ví dụ: '2 giờ 15 phút'",
        },
        durationInMinutes: {
          type: Type.INTEGER,
          description: "Tổng thời gian lái xe ước tính, tính bằng phút. Ví dụ: 135",
        },
      },
      required: ["distance", "duration", "durationInMinutes"],
    };

    const prompt = `Tính toán quãng đường và thời gian lái xe ô tô ước tính giữa hai địa điểm sau. Ưu tiên các tuyến đường chính, quốc lộ.
Điểm đi: "${originName}"
Điểm đến: "${destinationName}"
Chỉ trả về kết quả dưới dạng JSON tuân thủ theo schema đã cung cấp.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    // FIX: Truy cập trực tiếp thuộc tính .text (không phải là một phương thức).
    const text = response.text?.trim();
    if (!text) {
        console.error("Gemini API returned an empty response for route details.");
        return null;
    }

    return JSON.parse(text);

  } catch (error) {
    console.error("Error fetching route details from Gemini API:", error);
    return null;
  }
};
