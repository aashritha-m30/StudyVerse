/*
   StudyVerse Application Orchestrator
   Main entry point mapping events, state management, and page actions.
*/

import { parsePDF, parseTextFile, formatBytes } from './js/documentProcessor.js';
import { askAssistant, generateSummary, generateQuiz, generateFlashcards, generatePlanner, hasApiKey } from './js/aiEngine.js';
import { showToast, renderChatBubble, renderTypingIndicator, renderQuizQuestion, renderQuizResults, renderPlannerTimeline } from './js/components.js';

// Application State
const state = {
  activeTab: 'dashboard',
  documents: [], // Array of { id, title, text, size, type, isPersistent }
  activeDocIds: new Set(),
  chatHistory: [],
  quiz: {
    questions: [],
    currentIndex: 0,
    userAnswers: [],
    score: 0,
    active: false
  },
  flashcards: {
    deck: [],
    currentIndex: 0,
    masteredDocIds: new Set(), // tracks cards user got right
    active: false
  },
  planner: {
    steps: [],
    active: false
  },
  stats: {
    quizzesCompleted: 0,
    flashcardsMastered: 0
  }
};

// DOM Elements cache
let DOM = {};

function initDOMElements() {
  DOM = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    tabPages: document.querySelectorAll('.tab-page'),
    sectionTitle: document.getElementById('section-title'),
    aiStatus: document.getElementById('ai-status'),
    
    // Stats
    statDocsCount: document.getElementById('stat-docs-count'),
    statQuizzesTaken: document.getElementById('stat-quizzes-taken'),
    statFlashcardsReviewed: document.getElementById('stat-flashcards-reviewed'),
    
    // Dashboard actions & elements
    btnUploadShortcut: document.getElementById('btn-upload-shortcut'),
    btnBannerAddMaterials: document.getElementById('btn-banner-add-materials'),
    btnBannerSetupApi: document.getElementById('btn-banner-setup-api'),
    linkManageVault: document.getElementById('link-manage-vault'),
    btnDashUpload: document.getElementById('btn-dash-upload'),
    dashEmptyVault: document.getElementById('dash-empty-vault'),
    dashMaterialsList: document.getElementById('dash-materials-list'),
    cardActionChat: document.getElementById('card-action-chat'),
    cardActionSummary: document.getElementById('card-action-summary'),
    cardActionQuizzes: document.getElementById('card-action-quizzes'),
    cardActionFlashcards: document.getElementById('card-action-flashcards'),
    
    // Vault Elements
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    noteTitle: document.getElementById('note-title'),
    noteContent: document.getElementById('note-content'),
    btnSaveNote: document.getElementById('btn-save-note'),
    vaultEmptyState: document.getElementById('vault-empty-state'),
    vaultList: document.getElementById('vault-list'),
    btnSelectAll: document.getElementById('btn-select-all'),
    btnClearVault: document.getElementById('btn-clear-vault'),
    
    // Chat Elements
    chatContextList: document.getElementById('chat-context-list'),
    chatActiveDocs: document.getElementById('chat-active-docs'),
    btnClearChat: document.getElementById('btn-clear-chat'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    btnSendMessage: document.getElementById('btn-send-message'),
    suggestBtns: document.querySelectorAll('.suggest-btn'),
    
    // Summary Elements
    summaryOptCards: document.querySelectorAll('.summary-opt-card'),
    btnGenerateSummary: document.getElementById('btn-generate-summary'),
    summaryResultsContainer: document.getElementById('summary-results-container'),
    summaryResultContent: document.getElementById('summary-result-content'),
    summaryEmpty: document.getElementById('summary-empty'),
    btnCopySummary: document.getElementById('btn-copy-summary'),
    btnDownloadSummary: document.getElementById('btn-download-summary'),
    
    // Quiz Elements
    quizSetupPanel: document.getElementById('quiz-setup-panel'),
    quizPlayPanel: document.getElementById('quiz-play-panel'),
    quizResultsPanel: document.getElementById('quiz-results-panel'),
    quizEmptyState: document.getElementById('quiz-empty-state'),
    quizQuestionsCount: document.getElementById('quiz-questions-count'),
    quizDifficulty: document.getElementById('quiz-difficulty'),
    btnGenerateQuiz: document.getElementById('btn-generate-quiz'),
    quizProgressFill: document.getElementById('quiz-progress-fill'),
    quizQuestionNumber: document.getElementById('quiz-question-number'),
    quizQuestionText: document.getElementById('quiz-question-text'),
    quizOptionsContainer: document.getElementById('quiz-options-container'),
    btnQuitQuiz: document.getElementById('btn-quit-quiz'),
    btnNextQuestion: document.getElementById('btn-next-question'),
    btnRestartQuiz: document.getElementById('btn-restart-quiz'),
    btnQuizToFlashcards: document.getElementById('btn-quiz-to-flashcards'),
    btnQuizEmptyGoVault: document.getElementById('btn-quiz-empty-go-vault'),
    
    // Flashcard Elements
    flashSetupPanel: document.getElementById('flash-setup-panel'),
    flashActivePanel: document.getElementById('flash-active-panel'),
    flashEmptyState: document.getElementById('flash-empty-state'),
    flashDeckSize: document.getElementById('flash-deck-size'),
    flashDeckFocus: document.getElementById('flash-deck-focus'),
    btnGenerateFlashcards: document.getElementById('btn-generate-flashcards'),
    deckProgress: document.getElementById('deck-progress'),
    deckMasteredCount: document.getElementById('deck-mastered-count'),
    flashcardElement: document.getElementById('flashcard-element'),
    cardFrontText: document.getElementById('card-front-text'),
    cardBackText: document.getElementById('card-back-text'),
    btnRateAgain: document.getElementById('btn-rate-again'),
    btnRateGotit: document.getElementById('btn-rate-gotit'),
    btnCloseDeck: document.getElementById('btn-close-deck'),
    btnPrevCard: document.getElementById('btn-prev-card'),
    btnNextCard: document.getElementById('btn-next-card'),
    btnFlashEmptyGoVault: document.getElementById('btn-flash-empty-go-vault'),
    
    // Planner Elements
    plannerSetupPanel: document.getElementById('planner-setup-panel'),
    plannerActivePanel: document.getElementById('planner-active-panel'),
    plannerEmptyState: document.getElementById('planner-empty-state'),
    plannerTimeframe: document.getElementById('planner-timeframe'),
    plannerHours: document.getElementById('planner-hours'),
    btnGeneratePlanner: document.getElementById('btn-generate-planner'),
    btnDownloadPlanner: document.getElementById('btn-download-planner'),
    roadDuration: document.getElementById('road-duration'),
    roadEffort: document.getElementById('road-effort'),
    roadProgressPercent: document.getElementById('road-progress-percent'),
    plannerTimelineContainer: document.getElementById('planner-timeline-container'),
    
    // Settings Elements
    settingsApiKey: document.getElementById('settings-api-key'),
    btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
    settingsAiModel: document.getElementById('settings-ai-model'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    btnClearSettings: document.getElementById('btn-clear-settings')
  };
}

/**
 * Switch SPA tabs
 * @param {string} tabId 
 */
export function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update navigation visual classes
  DOM.navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Hide all sections, display target
  DOM.tabPages.forEach(page => {
    if (page.id === `tab-${tabId}`) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });
  
  // Section title formatting
  const titleMap = {
    dashboard: 'Dashboard',
    vault: 'Materials Vault',
    chat: 'AI Chat Assistant',
    summary: 'Summary & Notes',
    quizzes: 'Interactive Quizzes',
    flashcards: 'Smart Flashcards',
    planner: 'Study Planner',
    settings: 'Settings'
  };
  DOM.sectionTitle.textContent = titleMap[tabId] || 'StudyVerse';
  
  // Actions on section load
  if (tabId === 'vault') {
    renderVaultList();
  } else if (tabId === 'chat') {
    renderChatContextSelector();
  } else if (tabId === 'quizzes') {
    refreshQuizTabState();
  } else if (tabId === 'flashcards') {
    refreshFlashcardTabState();
  } else if (tabId === 'planner') {
    refreshPlannerTabState();
  }
}

/* ==========================================
   STATE MANAGEMENT & VAULT ACTIONS
   ========================================== */

/**
 * Loads custom persistent notes from LocalStorage on launch
 */
function loadSavedNotes() {
  const saved = localStorage.getItem('studyverse_notes');
  if (saved) {
    try {
      const notes = JSON.parse(saved);
      notes.forEach(note => {
        state.documents.push({
          id: note.id,
          title: note.title,
          text: note.text,
          size: note.size,
          type: 'text',
          isPersistent: true,
          date: note.date
        });
        state.activeDocIds.add(note.id);
      });
    } catch (e) {
      console.error("Error loading saved notes: ", e);
    }
  }
  
  // Load Stats
  state.stats.quizzesCompleted = parseInt(localStorage.getItem('studyverse_stat_quizzes') || '0', 10);
  state.stats.flashcardsMastered = parseInt(localStorage.getItem('studyverse_stat_flashcards') || '0', 10);
  
  updateDashboardStats();
}

/**
 * Updates numbers displayed on Dashboard stats block
 */
function updateDashboardStats() {
  if (DOM.statDocsCount) DOM.statDocsCount.textContent = state.documents.length;
  if (DOM.statQuizzesTaken) DOM.statQuizzesTaken.textContent = state.stats.quizzesCompleted;
  if (DOM.statFlashcardsReviewed) DOM.statFlashcardsReviewed.textContent = state.stats.flashcardsMastered;
  
  // Show / Hide empty state inside Dashboard loaded materials list
  if (state.documents.length === 0) {
    DOM.dashEmptyVault.style.display = 'flex';
    DOM.dashMaterialsList.style.display = 'none';
  } else {
    DOM.dashEmptyVault.style.display = 'none';
    DOM.dashMaterialsList.style.display = 'flex';
    
    // Populate dashboard recent items list
    DOM.dashMaterialsList.innerHTML = '';
    state.documents.slice(0, 4).forEach(doc => {
      const li = document.createElement('li');
      li.className = 'materials-list-item';
      
      const fileIcon = doc.type === 'pdf' ? 'fa-file-pdf text-danger' : 'fa-file-lines text-primary';
      
      li.innerHTML = `
        <a href="#" class="dash-doc-link" data-id="${doc.id}">
          <i class="fa-solid ${fileIcon}"></i>
          <span>${doc.title}</span>
        </a>
        <span class="badge">${doc.type.toUpperCase()}</span>
      `;
      
      li.querySelector('.dash-doc-link').addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('vault');
      });
      
      DOM.dashMaterialsList.appendChild(li);
    });
  }
}

/**
 * Renders file list items inside Materials Vault
 */
function renderVaultList() {
  if (state.documents.length === 0) {
    DOM.vaultEmptyState.style.display = 'flex';
    DOM.vaultList.style.display = 'none';
  } else {
    DOM.vaultEmptyState.style.display = 'none';
    DOM.vaultList.style.display = 'flex';
    
    DOM.vaultList.innerHTML = '';
    
    state.documents.forEach(doc => {
      const item = document.createElement('div');
      const isSelected = state.activeDocIds.has(doc.id);
      item.className = `vault-item ${isSelected ? 'selected' : ''}`;
      
      const fileIcon = doc.type === 'pdf' ? 'fa-file-pdf' : 'fa-file-lines';
      
      item.innerHTML = `
        <div class="vault-item-left">
          <input type="checkbox" class="vault-item-checkbox" data-id="${doc.id}" ${isSelected ? 'checked' : ''}>
          <i class="fa-solid ${fileIcon} file-icon"></i>
          <div class="file-info">
            <span class="file-name">${doc.title}</span>
            <span class="file-meta">${formatBytes(doc.size)} | Added ${new Date(doc.date).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="vault-item-right">
          <button class="btn-delete-file" data-id="${doc.id}" title="Delete material">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
      
      // Checkbox event
      item.querySelector('.vault-item-checkbox').addEventListener('change', (e) => {
        toggleDocumentActive(doc.id, e.target.checked);
      });
      
      // Delete button event
      item.querySelector('.btn-delete-file').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteDocument(doc.id);
      });
      
      DOM.vaultList.appendChild(item);
    });
  }
  
  updateDashboardStats();
}

/**
 * Toggles a document inclusion status inside the AI prompt context
 */
function toggleDocumentActive(id, isActive) {
  if (isActive) {
    state.activeDocIds.add(id);
  } else {
    state.activeDocIds.delete(id);
  }
  renderVaultList();
}

/**
 * Deletes a document from the workspace list
 */
function deleteDocument(id) {
  const index = state.documents.findIndex(d => d.id === id);
  if (index === -1) return;
  
  const doc = state.documents[index];
  
  // If persistent, remove from localStorage
  if (doc.isPersistent) {
    const saved = localStorage.getItem('studyverse_notes');
    if (saved) {
      const notes = JSON.parse(saved);
      const updatedNotes = notes.filter(n => n.id !== id);
      localStorage.setItem('studyverse_notes', JSON.stringify(updatedNotes));
    }
  }
  
  // Remove from state
  state.documents.splice(index, 1);
  state.activeDocIds.delete(id);
  
  showToast(`"${doc.title}" removed from vault.`, 'info');
  renderVaultList();
}

/**
 * Handles adding raw uploaded files to application memory
 */
async function processUploadedFile(file) {
  try {
    let text = "";
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (extension === 'pdf') {
      showToast(`Extracting text from PDF: ${file.name}...`, 'info');
      text = await parsePDF(file);
    } else {
      // txt or md
      text = await parseTextFile(file);
    }
    
    const newDoc = {
      id: 'doc_' + Date.now() + Math.random().toString(36).substr(2, 4),
      title: file.name,
      text: text,
      size: file.size,
      type: extension,
      isPersistent: false, // in-memory session only to avoid LocalStorage quota constraints
      date: Date.now()
    };
    
    state.documents.push(newDoc);
    state.activeDocIds.add(newDoc.id);
    
    showToast(`"${file.name}" uploaded successfully!`, 'success');
    renderVaultList();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

/**
 * Adds a manually pasted text note to LocalStorage
 */
function saveCustomNote() {
  const title = DOM.noteTitle.value.trim();
  const content = DOM.noteContent.value.trim();
  
  if (!title || !content) {
    showToast("Please provide both a title and content for your note.", "warning");
    return;
  }
  
  const noteId = 'note_' + Date.now();
  const bytesSize = new Blob([content]).size;
  
  const newNote = {
    id: noteId,
    title: title + ".txt",
    text: content,
    size: bytesSize,
    type: 'txt',
    isPersistent: true,
    date: Date.now()
  };
  
  // Add to LocalStorage
  const saved = localStorage.getItem('studyverse_notes');
  const notesArray = saved ? JSON.parse(saved) : [];
  notesArray.push({
    id: noteId,
    title: newNote.title,
    text: content,
    size: bytesSize,
    date: newNote.date
  });
  localStorage.setItem('studyverse_notes', JSON.stringify(notesArray));
  
  // Add to state
  state.documents.push(newNote);
  state.activeDocIds.add(noteId);
  
  // Clear forms
  DOM.noteTitle.value = '';
  DOM.noteContent.value = '';
  
  showToast(`Note "${title}" saved permanently to Vault!`, 'success');
  renderVaultList();
}

/**
 * Selects all documents inside Vault
 */
function selectAllVaultItems() {
  state.documents.forEach(doc => state.activeDocIds.add(doc.id));
  renderVaultList();
}

/**
 * Clears vault of all loaded materials
 */
function clearAllVaultItems() {
  if (state.documents.length === 0) return;
  
  // Prompt confirm
  if (confirm("Are you sure you want to delete all study materials from the vault?")) {
    localStorage.removeItem('studyverse_notes');
    state.documents = [];
    state.activeDocIds.clear();
    showToast("Vault cleared completely.", "info");
    renderVaultList();
  }
}

/* ==========================================
   AI CHAT PAGE
   ========================================== */

/**
 * Populates chat sidebar context options checklist
 */
function renderChatContextSelector() {
  DOM.chatContextList.innerHTML = '';
  
  if (state.documents.length === 0) {
    DOM.chatContextList.innerHTML = '<span class="subtitle">No documents loaded.</span>';
    DOM.chatActiveDocs.textContent = "Active Context: 0 files";
    return;
  }
  
  state.documents.forEach(doc => {
    const isChecked = state.activeDocIds.has(doc.id);
    const label = document.createElement('label');
    label.className = 'context-checkbox-item';
    
    label.innerHTML = `
      <input type="checkbox" class="chat-context-cb" data-id="${doc.id}" ${isChecked ? 'checked' : ''}>
      <span>${doc.title}</span>
    `;
    
    label.querySelector('input').addEventListener('change', (e) => {
      toggleDocumentActive(doc.id, e.target.checked);
      updateChatContextCount();
    });
    
    DOM.chatContextList.appendChild(label);
  });
  
  updateChatContextCount();
}

function updateChatContextCount() {
  DOM.chatActiveDocs.textContent = `Active Context: ${state.activeDocIds.size} files`;
}

/**
 * Handles sending messages to chat
 */
async function handleSendChatMessage() {
  const text = DOM.chatInput.value.trim();
  if (!text) return;
  
  // Clear text input
  DOM.chatInput.value = '';
  DOM.chatInput.style.height = '48px'; // reset textarea height
  
  // Render user bubble
  renderChatBubble(DOM.chatMessages, 'user', text);
  
  // Add to state logs
  state.chatHistory.push({ role: 'user', content: text });
  
  // Create typing indicator
  const indicator = renderTypingIndicator(DOM.chatMessages);
  
  // Fetch active documents content
  const activeDocs = state.documents.filter(doc => state.activeDocIds.has(doc.id));
  
  try {
    const response = await askAssistant(text, activeDocs, state.chatHistory.slice(0, -1));
    indicator.remove();
    renderChatBubble(DOM.chatMessages, 'system', response);
    state.chatHistory.push({ role: 'system', content: response });
  } catch (err) {
    indicator.remove();
    renderChatBubble(DOM.chatMessages, 'system', `⚠️ **Error receiving AI response:** \n\n ${err.message}`);
  }
}

/* ==========================================
   SUMMARY PAGE
   ========================================== */

/**
 * Triggers summary generator
 */
async function handleGenerateSummary() {
  const activeDocs = state.documents.filter(doc => state.activeDocIds.has(doc.id));
  
  if (activeDocs.length === 0) {
    showToast("Please select at least one study material in your Vault first.", "warning");
    switchTab('vault');
    return;
  }
  
  // Get active summary type
  let type = 'comprehensive';
  DOM.summaryOptCards.forEach(card => {
    if (card.classList.contains('active')) {
      type = card.getAttribute('data-type');
    }
  });
  
  // Toggle displays to loading state
  DOM.summaryEmpty.style.display = 'none';
  DOM.summaryResultsContainer.style.display = 'none';
  
  // Show standard loading message on Chat or as Toast
  showToast("Synthesizing document outline. Please wait...", "info");
  
  // Disable button
  DOM.btnGenerateSummary.disabled = true;
  DOM.btnGenerateSummary.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Summary...';
  
  try {
    const summaryText = await generateSummary(activeDocs, type);
    
    // Populate results
    DOM.summaryResultContent.innerHTML = parseHTMLFromMarkdown(summaryText);
    DOM.summaryResultsContainer.style.display = 'block';
    
    showToast("Summary synthesized successfully!", "success");
  } catch (err) {
    DOM.summaryEmpty.style.display = 'flex';
    showToast(`Failed to generate summary: ${err.message}`, "danger");
  } finally {
    DOM.btnGenerateSummary.disabled = false;
    DOM.btnGenerateSummary.innerHTML = '<i class="fa-solid fa-file-circle-plus"></i> Generate Summary';
  }
}

/**
 * Client side markdown to html converter helper specifically for summaries
 */
function parseHTMLFromMarkdown(md) {
  // Leverage components renderer helper
  const chatBoard = document.createElement('div');
  renderChatBubble(chatBoard, 'system', md);
  return chatBoard.querySelector('.bubble-content').innerHTML;
}

function copySummaryToClipboard() {
  const text = DOM.summaryResultContent.innerText;
  navigator.clipboard.writeText(text)
    .then(() => showToast("Summary copied to clipboard!", "success"))
    .catch(() => showToast("Failed to copy text.", "danger"));
}

function downloadSummaryMarkdown() {
  const text = DOM.summaryResultContent.innerText;
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `StudyVerse_Summary_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Summary downloaded as Markdown file.", "success");
}

/* ==========================================
   QUIZZES PAGE
   ========================================== */

function refreshQuizTabState() {
  if (state.documents.length === 0) {
    DOM.quizEmptyState.style.display = 'flex';
    DOM.quizSetupPanel.style.display = 'none';
    DOM.quizPlayPanel.style.display = 'none';
    DOM.quizResultsPanel.style.display = 'none';
    return;
  }
  
  DOM.quizEmptyState.style.display = 'none';
  if (!state.quiz.active) {
    DOM.quizSetupPanel.style.display = 'block';
    DOM.quizPlayPanel.style.display = 'none';
    DOM.quizResultsPanel.style.display = 'none';
  }
}

async function handleGenerateQuiz() {
  const activeDocs = state.documents.filter(doc => state.activeDocIds.has(doc.id));
  if (activeDocs.length === 0) {
    showToast("Please select active study documents in the vault first.", "warning");
    switchTab('vault');
    return;
  }
  
  const count = parseInt(DOM.quizQuestionsCount.value, 10);
  const diff = DOM.quizDifficulty.value;
  
  DOM.btnGenerateQuiz.disabled = true;
  DOM.btnGenerateQuiz.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Questions...';
  showToast("Compiling quiz questions based on active files...", "info");
  
  try {
    const questions = await generateQuiz(activeDocs, count, diff);
    
    // Setup state
    state.quiz.questions = questions;
    state.quiz.currentIndex = 0;
    state.quiz.userAnswers = [];
    state.quiz.score = 0;
    state.quiz.active = true;
    
    DOM.quizSetupPanel.style.display = 'none';
    DOM.quizPlayPanel.style.display = 'block';
    
    showQuizQuestion();
  } catch (err) {
    showToast(`Failed to generate quiz: ${err.message}`, "danger");
  } finally {
    DOM.btnGenerateQuiz.disabled = false;
    DOM.btnGenerateQuiz.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Build My Quiz';
  }
}

function showQuizQuestion() {
  const q = state.quiz.questions[state.quiz.currentIndex];
  
  DOM.quizQuestionNumber.textContent = `Question ${state.quiz.currentIndex + 1} of ${state.quiz.questions.length}`;
  DOM.quizProgressFill.style.width = `${((state.quiz.currentIndex) / state.quiz.questions.length) * 100}%`;
  
  DOM.btnNextQuestion.disabled = true;
  
  renderQuizQuestion(q, state.quiz.currentIndex, (selectedIdx) => {
    handleQuizOptionSelected(selectedIdx);
  });
}

function handleQuizOptionSelected(selectedIdx) {
  const q = state.quiz.questions[state.quiz.currentIndex];
  const optionButtons = DOM.quizOptionsContainer.querySelectorAll('.quiz-option-btn');
  
  // Prevent double clicks
  optionButtons.forEach(btn => btn.disabled = true);
  
  state.quiz.userAnswers[state.quiz.currentIndex] = selectedIdx;
  
  const isCorrect = selectedIdx === q.correctOptionIndex;
  if (isCorrect) {
    state.quiz.score++;
    optionButtons[selectedIdx].classList.add('correct');
    showToast("Correct Answer! 🎉", "success");
  } else {
    optionButtons[selectedIdx].classList.add('incorrect');
    optionButtons[q.correctOptionIndex].classList.add('correct');
    showToast("Incorrect Answer.", "danger");
  }
  
  DOM.btnNextQuestion.disabled = false;
}

function handleNextQuizQuestion() {
  state.quiz.currentIndex++;
  
  if (state.quiz.currentIndex < state.quiz.questions.length) {
    showQuizQuestion();
  } else {
    // End of quiz!
    state.quiz.active = false;
    state.stats.quizzesCompleted++;
    localStorage.setItem('studyverse_stat_quizzes', state.stats.quizzesCompleted);
    
    DOM.quizPlayPanel.style.display = 'none';
    DOM.quizResultsPanel.style.display = 'flex';
    
    renderQuizResults(state.quiz.questions, state.quiz.userAnswers, state.quiz.score);
    updateDashboardStats();
    showToast("Quiz finished! Review your results.", "success");
  }
}

function quitQuizSession() {
  if (confirm("Are you sure you want to quit the active quiz? All progress will be lost.")) {
    state.quiz.active = false;
    refreshQuizTabState();
  }
}

/* ==========================================
   FLASHCARDS PAGE
   ========================================== */

function refreshFlashcardTabState() {
  if (state.documents.length === 0) {
    DOM.flashEmptyState.style.display = 'flex';
    DOM.flashSetupPanel.style.display = 'none';
    DOM.flashActivePanel.style.display = 'none';
    return;
  }
  
  DOM.flashEmptyState.style.display = 'none';
  if (!state.flashcards.active) {
    DOM.flashSetupPanel.style.display = 'block';
    DOM.flashActivePanel.style.display = 'none';
  }
}

async function handleGenerateFlashcards() {
  const activeDocs = state.documents.filter(doc => state.activeDocIds.has(doc.id));
  if (activeDocs.length === 0) {
    showToast("Please select active study documents in the vault first.", "warning");
    switchTab('vault');
    return;
  }
  
  const size = parseInt(DOM.flashDeckSize.value, 10);
  const focus = DOM.flashDeckFocus.value;
  
  DOM.btnGenerateFlashcards.disabled = true;
  DOM.btnGenerateFlashcards.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Cards...';
  showToast("Formulating smart flashcard concepts...", "info");
  
  try {
    const cards = await generateFlashcards(activeDocs, size, focus);
    
    state.flashcards.deck = cards;
    state.flashcards.currentIndex = 0;
    state.flashcards.masteredDocIds.clear();
    state.flashcards.active = true;
    
    DOM.flashSetupPanel.style.display = 'none';
    DOM.flashActivePanel.style.display = 'flex';
    
    showFlashcard();
  } catch (err) {
    showToast(`Failed to generate flashcards: ${err.message}`, "danger");
  } finally {
    DOM.btnGenerateFlashcards.disabled = false;
    DOM.btnGenerateFlashcards.innerHTML = '<i class="fa-solid fa-wand-magic"></i> Generate Cards';
  }
}

function showFlashcard() {
  const card = state.flashcards.deck[state.flashcards.currentIndex];
  
  DOM.deckProgress.textContent = `Card ${state.flashcards.currentIndex + 1} of ${state.flashcards.deck.length}`;
  DOM.deckMasteredCount.textContent = state.flashcards.masteredDocIds.size;
  
  // Reset card rotation visual state
  DOM.flashcardElement.classList.remove('flipped');
  
  // Set card contents
  DOM.cardFrontText.textContent = card.front;
  DOM.cardBackText.textContent = card.back;
  
  // Update nav buttons disabled statuses
  DOM.btnPrevCard.disabled = state.flashcards.currentIndex === 0;
  DOM.btnNextCard.disabled = state.flashcards.currentIndex === state.flashcards.deck.length - 1;
}

function handleFlashcardFlipped() {
  DOM.flashcardElement.classList.toggle('flipped');
}

function handleRateFlashcard(isMastered) {
  if (isMastered) {
    state.flashcards.masteredDocIds.add(state.flashcards.currentIndex);
    state.stats.flashcardsMastered++;
    localStorage.setItem('studyverse_stat_flashcards', state.stats.flashcardsMastered);
    showToast("Marked as Mastered! 🌟", "success");
  } else {
    state.flashcards.masteredDocIds.delete(state.flashcards.currentIndex);
    showToast("Added back to study rotations.", "info");
  }
  
  // Auto advance if there are cards remaining
  if (state.flashcards.currentIndex < state.flashcards.deck.length - 1) {
    setTimeout(() => {
      state.flashcards.currentIndex++;
      showFlashcard();
    }, 400);
  } else {
    showFlashcard();
    showToast("You've completed this deck! Feel free to exit or review cards again.", "success");
  }
  
  updateDashboardStats();
}

function handleCloseDeck() {
  if (confirm("Exit study deck and return to builder?")) {
    state.flashcards.active = false;
    refreshFlashcardTabState();
  }
}

/* ==========================================
   STUDY PLANNER PAGE
   ========================================== */

function refreshPlannerTabState() {
  if (state.documents.length === 0) {
    DOM.plannerEmptyState.style.display = 'flex';
    DOM.plannerSetupPanel.style.display = 'none';
    DOM.plannerActivePanel.style.display = 'none';
    return;
  }
  
  DOM.plannerEmptyState.style.display = 'none';
  if (!state.planner.active) {
    DOM.plannerSetupPanel.style.display = 'block';
    DOM.plannerActivePanel.style.display = 'none';
  }
}

async function handleGeneratePlanner() {
  const activeDocs = state.documents.filter(doc => state.activeDocIds.has(doc.id));
  if (activeDocs.length === 0) {
    showToast("Please select active study documents in the vault first.", "warning");
    switchTab('vault');
    return;
  }
  
  const timeframe = parseInt(DOM.plannerTimeframe.value, 10);
  const hours = parseInt(DOM.plannerHours.value, 10);
  
  DOM.btnGeneratePlanner.disabled = true;
  DOM.btnGeneratePlanner.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Roadmap...';
  showToast("Planning custom daily syllabus checkpoints...", "info");
  
  try {
    const steps = await generatePlanner(activeDocs, timeframe, hours);
    
    // Prepare completed indices keys
    steps.forEach(step => step.completedSubtasks = []);
    
    state.planner.steps = steps;
    state.planner.active = true;
    
    DOM.plannerSetupPanel.style.display = 'none';
    DOM.plannerActivePanel.style.display = 'block';
    
    // Set road summaries
    DOM.roadDuration.textContent = `${timeframe} Days`;
    DOM.roadEffort.textContent = `${hours} Hours / Day`;
    
    renderPlanner();
  } catch (err) {
    showToast(`Failed to generate planner: ${err.message}`, "danger");
  } finally {
    DOM.btnGeneratePlanner.disabled = false;
    DOM.btnGeneratePlanner.innerHTML = '<i class="fa-solid fa-road"></i> Draft Study Plan';
  }
}

function renderPlanner() {
  renderPlannerTimeline(state.planner.steps, (stepIdx, subIdx, isChecked) => {
    handleTogglePlannerSubtask(stepIdx, subIdx, isChecked);
  });
  
  recalculatePlannerProgress();
}

function handleTogglePlannerSubtask(stepIdx, subIdx, isChecked) {
  const step = state.planner.steps[stepIdx];
  
  if (isChecked) {
    if (!step.completedSubtasks.includes(subIdx)) {
      step.completedSubtasks.push(subIdx);
    }
  } else {
    step.completedSubtasks = step.completedSubtasks.filter(idx => idx !== subIdx);
  }
  
  renderPlanner();
}

function recalculatePlannerProgress() {
  let totalTasks = 0;
  let completedTasks = 0;
  
  state.planner.steps.forEach(step => {
    totalTasks += step.subtasks.length;
    completedTasks += step.completedSubtasks.length;
  });
  
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  DOM.roadProgressPercent.textContent = `${pct}%`;
}

function downloadPlannerMarkdown() {
  let md = `# StudyVerse Personalized Study Roadmap 🗺️\n\n`;
  md += `*Timeframe: ${DOM.roadDuration.textContent} | Effort Target: ${DOM.roadEffort.textContent}*\n\n`;
  
  state.planner.steps.forEach(step => {
    md += `## ${step.day} - ${step.title}\n`;
    md += `**Duration target:** ${step.duration}\n\n`;
    md += `> ${step.description}\n\n`;
    md += `### Subtasks milestones:\n`;
    step.subtasks.forEach((task, idx) => {
      const isDone = step.completedSubtasks.includes(idx);
      md += `- [${isDone ? 'x' : ' '}] ${task}\n`;
    });
    md += `\n---\n\n`;
  });
  
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `StudyVerse_Roadmap_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Roadmap exported as Markdown file.", "success");
}

/* ==========================================
   SETTINGS ACTIONS
   ========================================== */

function loadSettings() {
  const savedKey = localStorage.getItem('studyverse_api_key');
  if (savedKey) {
    DOM.settingsApiKey.value = savedKey;
    updateAiStatusIndicator(true);
  } else {
    updateAiStatusIndicator(false);
  }
  
  const savedModel = localStorage.getItem('studyverse_model');
  if (savedModel) {
    DOM.settingsAiModel.value = savedModel;
  }
}

function saveSettings() {
  const key = DOM.settingsApiKey.value.trim();
  const model = DOM.settingsAiModel.value;
  
  if (key) {
    localStorage.setItem('studyverse_api_key', key);
    localStorage.setItem('studyverse_model', model);
    updateAiStatusIndicator(true);
    showToast("Gemini settings saved! Premium AI mode active.", "success");
  } else {
    showToast("API Key cannot be blank. Cleared instead.", "warning");
    clearSettings();
  }
}

function clearSettings() {
  localStorage.removeItem('studyverse_api_key');
  DOM.settingsApiKey.value = '';
  updateAiStatusIndicator(false);
  showToast("API configuration wiped. Reverted to Demo Mode.", "info");
}

function toggleApiKeyVisibility() {
  const input = DOM.settingsApiKey;
  const icon = DOM.btnToggleKeyVisibility.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
}

function updateAiStatusIndicator(isConnected) {
  const indicator = DOM.aiStatus;
  const statusText = indicator.querySelector('.status-text');
  
  if (isConnected) {
    indicator.className = 'status-indicator connected';
    statusText.textContent = 'API Connected';
  } else {
    indicator.className = 'status-indicator simulated';
    statusText.textContent = 'Demo Mode';
  }
}

/* ==========================================
   INITIALIZATION & EVENTS MAPS
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  initDOMElements();
  loadSavedNotes();
  loadSettings();
  
  // SPA Sidebar links
  DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
  
  // Dashboard shortcuts
  if (DOM.btnUploadShortcut) DOM.btnUploadShortcut.addEventListener('click', () => switchTab('vault'));
  if (DOM.btnBannerAddMaterials) DOM.btnBannerAddMaterials.addEventListener('click', () => switchTab('vault'));
  if (DOM.btnBannerSetupApi) DOM.btnBannerSetupApi.addEventListener('click', () => switchTab('settings'));
  if (DOM.linkManageVault) DOM.linkManageVault.addEventListener('click', (e) => { e.preventDefault(); switchTab('vault'); });
  if (DOM.btnDashUpload) DOM.btnDashUpload.addEventListener('click', () => switchTab('vault'));
  if (DOM.cardActionChat) DOM.cardActionChat.addEventListener('click', () => switchTab('chat'));
  if (DOM.cardActionSummary) DOM.cardActionSummary.addEventListener('click', () => switchTab('summary'));
  if (DOM.cardActionQuizzes) DOM.cardActionQuizzes.addEventListener('click', () => switchTab('quizzes'));
  if (DOM.cardActionFlashcards) DOM.cardActionFlashcards.addEventListener('click', () => switchTab('flashcards'));
  
  // File upload drag & drop events
  DOM.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.add('drag-over');
  });
  DOM.dropZone.addEventListener('dragleave', () => {
    DOM.dropZone.classList.remove('drag-over');
  });
  DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  });
  DOM.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  });
  
  // Custom note save button
  DOM.btnSaveNote.addEventListener('click', saveCustomNote);
  
  // Vault Action Buttons
  DOM.btnSelectAll.addEventListener('click', selectAllVaultItems);
  DOM.btnClearVault.addEventListener('click', clearAllVaultItems);
  
  // Chat input height adjustments & Submit key shortcuts
  DOM.chatInput.addEventListener('input', () => {
    DOM.chatInput.style.height = 'auto';
    DOM.chatInput.style.height = DOM.chatInput.scrollHeight + 'px';
  });
  DOM.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  });
  DOM.btnSendMessage.addEventListener('click', handleSendChatMessage);
  DOM.btnClearChat.addEventListener('click', () => {
    DOM.chatMessages.innerHTML = '';
    state.chatHistory = [];
    renderChatBubble(DOM.chatMessages, 'system', "Chat history cleared. Send a message to start over!");
  });
  
  // Chat suggested prompt buttons
  DOM.suggestBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      DOM.chatInput.value = prompt;
      handleSendChatMessage();
    });
  });
  
  // Summary Tab option controls
  DOM.summaryOptCards.forEach(card => {
    card.addEventListener('click', () => {
      DOM.summaryOptCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
  DOM.btnGenerateSummary.addEventListener('click', handleGenerateSummary);
  DOM.btnCopySummary.addEventListener('click', copySummaryToClipboard);
  DOM.btnDownloadSummary.addEventListener('click', downloadSummaryMarkdown);
  
  // Quiz Tab controls
  DOM.btnGenerateQuiz.addEventListener('click', handleGenerateQuiz);
  DOM.btnQuitQuiz.addEventListener('click', quitQuizSession);
  DOM.btnNextQuestion.addEventListener('click', handleNextQuizQuestion);
  DOM.btnRestartQuiz.addEventListener('click', () => {
    state.quiz.active = false;
    refreshQuizTabState();
  });
  DOM.btnQuizToFlashcards.addEventListener('click', () => {
    switchTab('flashcards');
  });
  DOM.btnQuizEmptyGoVault.addEventListener('click', () => switchTab('vault'));
  
  // Flashcard Tab controls
  DOM.btnGenerateFlashcards.addEventListener('click', handleGenerateFlashcards);
  DOM.flashcardElement.addEventListener('click', handleFlashcardFlipped);
  DOM.btnRateAgain.addEventListener('click', () => handleRateFlashcard(false));
  DOM.btnRateGotit.addEventListener('click', () => handleRateFlashcard(true));
  DOM.btnCloseDeck.addEventListener('click', handleCloseDeck);
  DOM.btnPrevCard.addEventListener('click', () => {
    if (state.flashcards.currentIndex > 0) {
      state.flashcards.currentIndex--;
      showFlashcard();
    }
  });
  DOM.btnNextCard.addEventListener('click', () => {
    if (state.flashcards.currentIndex < state.flashcards.deck.length - 1) {
      state.flashcards.currentIndex++;
      showFlashcard();
    }
  });
  DOM.btnFlashEmptyGoVault.addEventListener('click', () => switchTab('vault'));
  
  // Planner Tab controls
  DOM.btnGeneratePlanner.addEventListener('click', handleGeneratePlanner);
  DOM.btnDownloadPlanner.addEventListener('click', downloadPlannerMarkdown);
  
  // Settings Tab controls
  DOM.btnSaveSettings.addEventListener('click', saveSettings);
  DOM.btnClearSettings.addEventListener('click', clearSettings);
  DOM.btnToggleKeyVisibility.addEventListener('click', toggleApiKeyVisibility);
});

// Attach helper to global scope for any inline triggers
window.app = {
  switchTab: switchTab
};
