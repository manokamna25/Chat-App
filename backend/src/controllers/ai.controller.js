import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export const getAIResponse = async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                message: "Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file."
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an adaptive and smart AI assistant. Your goal is to match the user's energy and tone:
        
        1. **Professional Mode**: If the user asks a serious question, seeks information, or speaks formally, respond as a helpful, knowledgeable, and polite professional.
        2. **Fun Mode**: If the user is casual, uses slang, cracks jokes, or is just chatting for fun, respond as a witty, sarcastic, and funny friend. Feel free to use emojis and humor.

        User: ${message}
        AI:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ response: text });
    } catch (error) {
        console.error("Error in AI Chat:", error);
        res.status(500).json({ message: error.message || "Failed to fetch AI response" });
    }
};

export const summarizeCall = async (req, res) => {
    try {
        const { transcript } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                message: "Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file."
            });
        }

        if (!transcript || transcript.length === 0) {
            return res.status(400).json({ message: "Transcript is required for summarization." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are an expert meeting summarizer. Below is a transcript of a video call between two or more people. 
        Your goal is to provide a concise, clear, and professional summary of the conversation.
        
        Transcript:
        ${JSON.stringify(transcript)}

        Please provide:
        1. **Summary**: A high-level overview of what was discussed.
        2. **Key Points**: Bullet points of important topics or decisions.
        3. **Tone**: Describe the overall mood of the call (e.g., friendly, professional, heated).

        Summary:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ summary: text });
    } catch (error) {
        console.error("Error in Call Summarization:", error);
        res.status(500).json({ message: error.message || "Failed to summarize call" });
    }
};
