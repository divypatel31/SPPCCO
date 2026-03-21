const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ==============================================
   1️⃣ DEFINE THE TOOLS FOR GEMINI
================================================= */
const tools = [
  {
    functionDeclarations: [
      {
        name: "getAvailableDoctors",
        description: "Find available doctors for a specific medical department.",
        parameters: {
          type: "OBJECT",
          properties: {
            department: { type: "STRING", description: "Medical department (e.g., Cardiology, Neurology, General Medicine)" }
          },
          required: ["department"]
        }
      },
      {
        name: "bookAppointment",
        description: "Book an appointment. Call this IMMEDIATELY when the patient provides a doctor's name, date, and time.",
        parameters: {
          type: "OBJECT",
          properties: {
            doctorName: { type: "STRING", description: "The name of the doctor (e.g., 'Smith' or 'Vedant')" },
            date: { type: "STRING", description: "The date of the appointment in YYYY-MM-DD format" },
            time: { type: "STRING", description: "The time of the appointment in HH:MM format (e.g., 10:00)" }
          },
          required: ["doctorName", "date", "time"]
        }
      }
    ]
  }
];

/* ==============================================
   2️⃣ THE CHAT CONTROLLER
================================================= */
exports.chatWithAI = async (req, res) => {
  try {
    const { prompt, history = [] } = req.body;
    const patientId = req.user?.id || req.user?.user_id;

    if (!patientId) {
      return res.status(401).json({ reply: "Please log in to use the AI Booking Assistant." });
    }

    // Initialize the Gemini 2.5 Flash Model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: tools,
      // 🔥 THE FIX: Stricter rules so it knows exactly what to do when you say "yes"
      systemInstruction: `You are the MediCare HMS Autonomous AI Agent.
      
      CRITICAL RULES:
      1. If a patient lists symptoms, use 'getAvailableDoctors' to find specialists.
      2. When suggesting a doctor, ALWAYS ask the patient for their preferred Date (YYYY-MM-DD) and Time (HH:MM).
      3. If the patient agrees to book (e.g. says "yes") BUT hasn't given a date/time, ASK THEM for the Date and Time. Do not reset the conversation.
      4. Once you have the Doctor's Name, Date, and Time, IMMEDIATELY call the 'bookAppointment' tool.
      5. Never say "I can't book with a doctor's name". You HAVE the tool to do it. Just use the 'bookAppointment' tool with the doctorName parameter.
      6. Be concise, friendly, and helpful.`
    });

    // Start Chat with the clean text history
    const chat = model.startChat({ history: history });
    
    // Send message
    let result = await chat.sendMessage(prompt);
    let functionCalls = result.response.functionCalls();

    // 3️⃣ EXECUTE TOOLS IF GEMINI ASKS FOR THEM
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let apiResponse = {};

      if (call.name === 'getAvailableDoctors') {
        const [doctors] = await db.execute(
          "SELECT full_name, department FROM users WHERE role = 'doctor' AND department = ? AND status = 'active'",
          [call.args.department]
        );
        apiResponse = { available_doctors: doctors.length > 0 ? doctors : "No doctors available in this department right now." };
      } 
      
      else if (call.name === 'bookAppointment') {
        const { doctorName, date, time } = call.args;

        const [docRes] = await db.execute(
          "SELECT user_id, full_name, department FROM users WHERE full_name LIKE ? AND role = 'doctor'", 
          [`%${doctorName}%`]
        );
        
        if (docRes.length === 0) {
           apiResponse = { success: false, message: "Doctor not found in the database." };
        } else {
           const doctorId = docRes[0].user_id;
           const department = docRes[0].department || "General";

           await db.execute(
             `INSERT INTO appointments (patient_id, doctor_id, department, appointment_date, appointment_time, status) 
              VALUES (?, ?, ?, ?, ?, 'pending')`,
             [patientId, doctorId, department, date, time]
           );
           
           apiResponse = { success: true, message: `Appointment successfully booked with Dr. ${docRes[0].full_name} for ${date} at ${time}.` };
        }
      }

      // Send the Database Result back to Gemini
      result = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: apiResponse
        }
      }]);
    }

    // 🔥 THE FIX: Sanitize the history! 
    // This strips out complex database objects so the AI only remembers pure text, guaranteeing it never loses context.
    const rawHistory = await chat.getHistory();
    let sanitizedHistory = [];
    let lastRole = null;

    for (const h of rawHistory) {
        const textPart = h.parts.find(p => p.text);
        if (textPart && textPart.text.trim() !== '') {
            if (h.role !== lastRole) {
                sanitizedHistory.push({ role: h.role, parts: [{ text: textPart.text }] });
                lastRole = h.role;
            } else {
                // Combine text if the role is the same to ensure strict User -> Model alternation
                sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += "\n" + textPart.text;
            }
        }
    }

    res.json({ 
      reply: result.response.text(), 
      history: sanitizedHistory 
    });

  } catch (error) {
    console.error("Gemini AI Agent Error:", error);
    res.status(500).json({ message: "AI Agent encountered an error. Please try again." });
  }
};