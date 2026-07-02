/*
   StudyVerse AI Engine Module
   Interfaces directly with Google Gemini API (1.5 Flash/Pro)
   And implements a robust mock fallback for Demo Mode.
*/

/**
 * Checks if a Gemini API key is configured
 * @returns {boolean}
 */
export function hasApiKey() {
  const key = localStorage.getItem('studyverse_api_key');
  return !!key && key.trim().length > 0;
}

/**
 * Gets the configured API key
 * @returns {string}
 */
function getApiKey() {
  return localStorage.getItem('studyverse_api_key') || '';
}

/**
 * Gets the configured AI Model
 * @returns {string}
 */
function getAiModel() {
  return localStorage.getItem('studyverse_model') || 'gemini-1.5-flash';
}

/**
 * Call Gemini API directly using fetch
 * @param {string} prompt 
 * @param {boolean} jsonMode 
 * @returns {Promise<any>} response text or JSON object
 */
async function callGemini(prompt, jsonMode = false) {
  const apiKey = getApiKey();
  const model = getAiModel();
  
  if (!apiKey) {
    throw new Error("No Gemini API key found. Switch to Settings to configure one.");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };
  
  if (jsonMode) {
    payload.generationConfig = {
      responseMimeType: "application/json"
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Gemini API Error: ${errMsg}`);
    }
    
    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error("Empty response from Gemini API.");
    }
    
    if (jsonMode) {
      return JSON.parse(textResponse);
    }
    
    return textResponse;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error;
  }
}

/**
 * Sends a message to the Chat Assistant
 * @param {string} userMessage 
 * @param {Array<{title: string, text: string}>} contextDocs 
 * @param {Array<{role: string, content: string}>} chatHistory 
 * @returns {Promise<string>} AI response
 */
export async function askAssistant(userMessage, contextDocs = [], chatHistory = []) {
  if (!hasApiKey()) {
    return simulateChatResponse(userMessage, contextDocs);
  }
  
  let systemPrompt = "You are StudyVerse AI, an intelligent, helpful, and premium study assistant. ";
  
  if (contextDocs.length > 0) {
    systemPrompt += "Analyze the following user-provided study materials to answer the question. If the answer cannot be found in these documents, use your general knowledge to answer, but clearly state that the information was not in the uploaded documents. Keep your answer clear, accurate, and format it nicely using Markdown.\n\n";
    systemPrompt += "=== UPLOADED STUDY MATERIALS CONTEXT ===\n";
    contextDocs.forEach(doc => {
      systemPrompt += `[Document: ${doc.title}]\n${doc.text}\n\n`;
    });
    systemPrompt += "=== END OF STUDY MATERIALS CONTEXT ===\n\n";
  } else {
    systemPrompt += "Answer the student's question accurately. Format your response beautifully using Markdown with bolding, lists, or tables where appropriate. Encourage them to upload documents in the Materials Vault for personalized study aids.\n\n";
  }
  
  // Format past history for Gemini
  let prompt = `${systemPrompt}\nChat History:\n`;
  chatHistory.forEach(msg => {
    prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
  });
  prompt += `User: ${userMessage}\nAssistant:`;
  
  return callGemini(prompt);
}

/**
 * Generates summary from documents
 * @param {Array<{title: string, text: string}>} contextDocs 
 * @param {string} summaryType (comprehensive | bullets | glossary)
 * @returns {Promise<string>} Markdown summary
 */
export async function generateSummary(contextDocs, summaryType = 'comprehensive') {
  if (contextDocs.length === 0) {
    throw new Error("No study materials active in vault.");
  }
  
  if (!hasApiKey()) {
    return simulateSummary(contextDocs, summaryType);
  }
  
  let docsText = "";
  contextDocs.forEach(doc => {
    docsText += `[Document Name: ${doc.title}]\n${doc.text}\n\n`;
  });
  
  let prompt = `You are a professional study synthesiser. Summarize the following study materials.\n\nMaterials:\n${docsText}\n\n`;
  
  if (summaryType === 'comprehensive') {
    prompt += "Create a Comprehensive Summary. Organize it with clear headings, subheadings, and detailed explanations of core arguments, methodologies, and findings. Use Markdown format.";
  } else if (summaryType === 'bullets') {
    prompt += "Create a Bulleted Key Takeaways list. List the most critical facts, numbers, dates, rules, and core highlights. Keep bullets concise and high-yield. Use Markdown format.";
  } else {
    prompt += "Create a Glossary Table. List all major academic terms, vocabulary, variables, formula definitions, or laws mentioned in the text. Format it as a Markdown table with columns: 'Term', 'Definition / Significance', 'Context'.";
  }
  
  return callGemini(prompt);
}

/**
 * Generates an interactive quiz
 * @param {Array<{title: string, text: string}>} contextDocs 
 * @param {number} numQuestions 
 * @param {string} difficulty 
 * @returns {Promise<Array>} Quiz questions array
 */
export async function generateQuiz(contextDocs, numQuestions = 10, difficulty = 'medium') {
  if (contextDocs.length === 0) {
    throw new Error("No materials selected for Quiz building.");
  }
  
  if (!hasApiKey()) {
    return simulateQuiz(contextDocs, numQuestions, difficulty);
  }
  
  let docsText = "";
  contextDocs.forEach(doc => {
    docsText += `[Document: ${doc.title}]\n${doc.text}\n\n`;
  });
  
  const prompt = `You are an academic test maker. Create a practice quiz based on the following materials.
  
  Materials:
  ${docsText}
  
  Parameters:
  - Number of questions: ${numQuestions}
  - Difficulty: ${difficulty}
  
  You MUST return ONLY a JSON array of objects. Do not wrap in markdown blocks like \`\`\`json.
  Each object in the array must strictly match this schema:
  {
    "question": "The question string",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 0, // Integer (0 to 3) representing correct option
    "explanation": "Detailed explanation of why the correct option is right, referencing details from the text."
  }`;
  
  return callGemini(prompt, true);
}

/**
 * Generates flashcards
 * @param {Array<{title: string, text: string}>} contextDocs 
 * @param {number} size 
 * @param {string} focus 
 * @returns {Promise<Array>} Flashcards array
 */
export async function generateFlashcards(contextDocs, size = 12, focus = 'general') {
  if (contextDocs.length === 0) {
    throw new Error("No documents loaded to generate flashcards.");
  }
  
  if (!hasApiKey()) {
    return simulateFlashcards(contextDocs, size, focus);
  }
  
  let docsText = "";
  contextDocs.forEach(doc => {
    docsText += `[Document: ${doc.title}]\n${doc.text}\n\n`;
  });
  
  const prompt = `You are a study card creator. Generate a flashcard deck from the following materials.
  
  Materials:
  ${docsText}
  
  Parameters:
  - Number of cards: ${size}
  - Focus: ${focus} (general = terms & definitions, equations = laws & formulas, qa = question & short answers)
  
  You MUST return ONLY a JSON array of objects. Do not wrap in markdown blocks.
  Each object in the array must strictly match this schema:
  {
    "front": "Question, formula name, or term to display on the front face",
    "back": "Detailed answer, formula definition, or concept breakdown to display on the back face"
  }`;
  
  return callGemini(prompt, true);
}

/**
 * Generates personalized study plan
 * @param {Array<{title: string, text: string}>} contextDocs 
 * @param {number} timeframe (days)
 * @param {number} hoursPerDay 
 * @returns {Promise<Array>} Study Plan array
 */
export async function generatePlanner(contextDocs, timeframe = 7, hoursPerDay = 2) {
  if (contextDocs.length === 0) {
    throw new Error("No documents loaded to construct a roadmap.");
  }
  
  if (!hasApiKey()) {
    return simulatePlanner(contextDocs, timeframe, hoursPerDay);
  }
  
  let docsText = "";
  contextDocs.forEach(doc => {
    docsText += `[Document: ${doc.title}]\n${doc.text}\n\n`;
  });
  
  const prompt = `You are a master academic coach. Design a structured daily study plan timeline based on these materials.
  
  Materials:
  ${docsText}
  
  Parameters:
  - Total Plan Duration: ${timeframe} Days
  - Effort: ${hoursPerDay} Hours per Day
  
  You MUST return ONLY a JSON array of objects. Do not wrap in markdown blocks.
  Each object in the array must strictly match this schema:
  {
    "day": "Day 1",
    "title": "Topic or Module title to cover",
    "duration": "${hoursPerDay} Hours",
    "description": "General summary of the daily objective",
    "subtasks": ["Milestone task 1", "Milestone task 2", "Milestone task 3"] // Array of 3-4 strings detailing study tasks
  }`;
  
  return callGemini(prompt, true);
}

/* ==========================================
   HEURISTIC SIMULATIONS FOR DEMO MODE
   ========================================== */

/**
 * Clean up text, extract noun phrases and sentences for smart mock generators
 */
function processTextKeywords(docs) {
  if (!docs || docs.length === 0) return { terms: [], sentences: [], topic: "Study Topic" };
  
  const fullText = docs.map(d => d.text).join(' ');
  const title = docs[0].title.split('.')[0].replace(/_/g, ' ');
  
  // Basic sentence tokenizer
  const sentences = fullText
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 200);
  
  // Extract capitalized words as potential glossary items
  const words = fullText.match(/\b[A-Z][a-z]{3,12}\b/g) || [];
  const uniqWords = [...new Set(words)].filter(w => !['This', 'That', 'With', 'From', 'They', 'Then', 'Their', 'What', 'Where', 'When', 'Page', 'Date'].includes(w));
  
  return {
    terms: uniqWords.slice(0, 30),
    sentences: sentences.slice(0, 50),
    topic: title
  };
}

function simulateChatResponse(message, docs) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (docs.length === 0) {
        resolve("I'm running in **Demo Mode** right now. Go to **Settings** to enter your Gemini API Key for active queries.\n\nMeanwhile, ask me anything! (Hint: Upload notes/PDFs in the **Materials Vault** first so I can analyze them, even in demo mode!)");
        return;
      }
      
      const analysis = processTextKeywords(docs);
      const msgLower = message.toLowerCase();
      
      let matchedSentence = "";
      for (const sent of analysis.sentences) {
        // Find a sentence that shares words with the user query
        const words = msgLower.split(/\W+/).filter(w => w.length > 4);
        const match = words.some(w => sent.toLowerCase().includes(w));
        if (match) {
          matchedSentence = sent;
          break;
        }
      }
      
      if (!matchedSentence && analysis.sentences.length > 0) {
        matchedSentence = analysis.sentences[Math.floor(Math.random() * analysis.sentences.length)];
      }
      
      let response = `### StudyVerse Demo Assistant Response 💡\n\n`;
      response += `*Note: Currently running in simulated Demo Mode (no API Key configured).* \n\n`;
      response += `Based on your active study material **"${analysis.topic}"**, here is the matched concept:\n\n`;
      response += `> "${matchedSentence || "No specific matching sentence found in the document content."}"\n\n`;
      response += `#### Key takeaways from this section:\n`;
      if (analysis.terms.length >= 2) {
        response += `- **${analysis.terms[0] || 'Concept A'}**: Often analyzed in relation to the main text context.\n`;
        response += `- **${analysis.terms[1] || 'Concept B'}**: Crucial factor mentioned in study guidelines.\n`;
      } else {
        response += `- Core points are highlighted in the document text.\n`;
      }
      response += `\nTo ask actual freeform questions and receive accurate synthesis, please enter a **Gemini API Key** in the **Settings** tab.`;
      
      resolve(response);
    }, 1200);
  });
}

function simulateSummary(docs, type) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const analysis = processTextKeywords(docs);
      let content = "";
      
      if (type === 'comprehensive') {
        content = `# Comprehensive Summary: ${analysis.topic} 📖\n\n`;
        content += `*Generated in Demo Mode (Simulated Content)*\n\n`;
        content += `## 1. Overview and Core Scope\n`;
        content += `The study document covers key topics related to **${analysis.topic}**. The primary thesis focuses on structuring these concepts for academic review and mastery.\n\n`;
        content += `## 2. Key Arguments & Concepts\n`;
        if (analysis.sentences.length > 2) {
          content += `- **Primary Premise**: ${analysis.sentences[0]}.\n`;
          content += `- **Secondary Concept**: ${analysis.sentences[1]}.\n`;
          content += `- **Analytical Takeaway**: ${analysis.sentences[2]}.\n`;
        } else {
          content += `- Standard definitions and text guides extracted from loaded materials.\n`;
        }
        content += `\n## 3. Conclusions & Synthesis\n`;
        content += `Students should focus on terms such as ${analysis.terms.slice(0, 4).join(', ') || 'key topics'} to succeed in assessments.\n`;
      } 
      else if (type === 'bullets') {
        content = `# Key Study Takeaways: ${analysis.topic} 📌\n\n`;
        content += `*Generated in Demo Mode (Simulated Content)*\n\n`;
        const count = Math.min(analysis.sentences.length, 5);
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            content += `- **Point ${i+1}**: ${analysis.sentences[i]}\n`;
          }
        } else {
          content += `- Core item: Review material topics and glossary.\n- Core item: Upload PDFs to get detailed bullets.\n`;
        }
      } 
      else {
        content = `# Study Glossary Table: ${analysis.topic} 🏷️\n\n`;
        content += `*Generated in Demo Mode (Simulated Content)*\n\n`;
        content += `| Term | Simulated Significance / Definition | Context Level |\n`;
        content += `| :--- | :--- | :--- |\n`;
        
        const termCount = Math.min(analysis.terms.length, 6);
        if (termCount > 0) {
          for (let i = 0; i < termCount; i++) {
            content += `| **${analysis.terms[i]}** | Academic concept referenced in the text relating to ${analysis.topic}. | High Yield |\n`;
          }
        } else {
          content += `| **ExampleTerm** | Concept definition extracted from pages. | Review Required |\n`;
        }
      }
      
      resolve(content);
    }, 1000);
  });
}

function simulateQuiz(docs, count, diff) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const analysis = processTextKeywords(docs);
      const quiz = [];
      
      // Seed terms for options
      const seedOptions = analysis.terms.length >= 8 ? analysis.terms : ['Term A', 'Term B', 'Term C', 'Term D', 'Term E', 'Term F'];
      
      for (let i = 0; i < count; i++) {
        const questionText = analysis.sentences[i % analysis.sentences.length] || `Select the correct statement regarding study topic ${i+1}.`;
        const correctTerm = seedOptions[i % seedOptions.length];
        
        // Shuffle other options
        const incorrect = seedOptions.filter(o => o !== correctTerm).sort(() => 0.5 - Math.random()).slice(0, 3);
        const options = [correctTerm, ...incorrect].sort(() => 0.5 - Math.random());
        const correctIndex = options.indexOf(correctTerm);
        
        quiz.push({
          question: `Which term best correlates with the following concept: "${questionText}"?`,
          options: options,
          correctOptionIndex: correctIndex,
          explanation: `In the study material "${analysis.topic}", the term "${correctTerm}" directly corresponds to this definition/context.`
        });
      }
      
      resolve(quiz);
    }, 1500);
  });
}

function simulateFlashcards(docs, size, focus) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const analysis = processTextKeywords(docs);
      const cards = [];
      
      const cardCount = Math.min(size, Math.max(analysis.terms.length, 5));
      
      for (let i = 0; i < size; i++) {
        const term = analysis.terms[i % analysis.terms.length] || `Concept #${i+1}`;
        let sentence = analysis.sentences[(i + 2) % analysis.sentences.length] || `Critical study explanation for ${term}.`;
        
        cards.push({
          front: focus === 'qa' ? `Question: What role does ${term} play in this context?` : term,
          back: focus === 'equations' ? `Formula/Law explaining: ${sentence}` : sentence
        });
      }
      
      resolve(cards);
    }, 1200);
  });
}

function simulatePlanner(docs, timeframe, hours) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const analysis = processTextKeywords(docs);
      const plan = [];
      
      const topics = analysis.terms.length >= timeframe ? analysis.terms : ['Introduction', 'Core Variables', 'Methodologies', 'Detailed Systems', 'Secondary Factors', 'Review Section', 'Final Practice'];
      
      for (let d = 1; d <= timeframe; d++) {
        const focusTopic = topics[(d - 1) % topics.length];
        plan.push({
          day: `Day ${d}`,
          title: `Focus Area: ${focusTopic}`,
          duration: `${hours} Hours`,
          description: `Devote this day's effort to understanding the fundamentals of "${focusTopic}" and how it connects to the broader theme of ${analysis.topic}.`,
          subtasks: [
            `Read and highlight notes on ${focusTopic}`,
            `Review flashcards for key terms in ${focusTopic}`,
            `Generate a 5-question mock quiz on this subtopic`
          ]
        });
      }
      
      resolve(plan);
    }, 1000);
  });
}
