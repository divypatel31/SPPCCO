const axios = require('axios');

exports.chatWithAI = async (req, res) => {
  try {
    const { prompt } = req.body;

    const systemPrompt = `You are a helpful, professional, and empathetic Medical AI Assistant for a Hospital Management System. 
    Your job is to help patients understand symptoms, explain medical terms in simple language, and guide them on when to book an appointment with a doctor.
    
    CRITICAL RULES:
    1. Always include a short disclaimer that you are an AI and not a substitute for a real doctor's diagnosis.
    2. If symptoms are severe (e.g., chest pain, severe bleeding, difficulty breathing, stroke signs), immediately tell them to go to the Emergency Room.
    3. Keep answers concise, structured (use bullet points), and easy to read. Do not write huge walls of text.
    4. Do not prescribe specific medicinal doses. Suggest general remedies or booking a consultation.`;

    const fullPrompt = `${systemPrompt}\n\nPatient asks: ${prompt}`;

    // 🔥 Changed from fetch() to axios() to prevent Node.js crashes!
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3', 
      prompt: fullPrompt,
      stream: false, 
    });

    res.json({ reply: response.data.response });

  } catch (error) {
    console.error("Ollama AI Error:", error.message);
    res.status(500).json({ message: "Failed to communicate with local AI. Ensure Ollama is running." });
  }
};