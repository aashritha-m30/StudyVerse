/*
   StudyVerse UI Components Module
   Manages rendering, DOM creation, and event bindings for
   dynamic app sections (Chat, Quizzes, Flashcards, Planner, Toasts)
*/

/**
 * Creates and displays a toast notification
 * @param {string} message 
 * @param {string} type (success | danger | warning | info)
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Icon selector
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'danger') icon = 'fa-circle-xmark';
  if (type === 'warning') icon = 'fa-circle-exclamation';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Auto-remove toast after 4s
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

/**
 * Appends a chat bubble to the message board
 * @param {HTMLElement} chatContainer 
 * @param {string} role (user | system)
 * @param {string} text Markdown or plaintext content
 */
export function renderChatBubble(chatContainer, role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  
  const avatarIcon = role === 'user' ? 'fa-user-graduate' : 'fa-robot';
  
  bubble.innerHTML = `
    <div class="avatar"><i class="fa-solid ${avatarIcon}"></i></div>
    <div class="bubble-content">
      ${parseMarkdown(text)}
    </div>
  `;
  
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Appends a typing animation bubble
 * @param {HTMLElement} chatContainer 
 * @returns {HTMLElement} typing bubble element
 */
export function renderTypingIndicator(chatContainer) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble system typing-indicator-bubble';
  bubble.innerHTML = `
    <div class="avatar"><i class="fa-solid fa-robot"></i></div>
    <div class="bubble-content">
      <div class="typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return bubble;
}

/**
 * Helper to parse basic markdown elements client-side
 * @param {string} text 
 * @returns {string} HTML parsed string
 */
function parseMarkdown(text) {
  if (!text) return "";
  
  // Escape HTML tags to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Code block parsing
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Blockquotes
  html = html.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');
  
  // Bullet lists
  html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  
  // Simple paragraph conversions
  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<ul') || p.trim().startsWith('<ol') || p.trim().startsWith('<pre') || p.trim().startsWith('<block')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  
  // Heading parsing
  html = html.replace(/### (.*?)(?:<br>|$)/g, '<h3>$1</h3>');
  html = html.replace(/## (.*?)(?:<br>|$)/g, '<h2>$1</h2>');
  html = html.replace(/# (.*?)(?:<br>|$)/g, '<h1>$1</h1>');
  
  return html;
}

/**
 * Renders a Quiz Question
 * @param {Object} questionObj 
 * @param {number} activeIndex 
 * @param {Function} onSelectOption Callback when option selected (index)
 */
export function renderQuizQuestion(questionObj, activeIndex, onSelectOption) {
  const questionTextEl = document.getElementById('quiz-question-text');
  const optionsContainer = document.getElementById('quiz-options-container');
  
  if (!questionTextEl || !optionsContainer) return;
  
  questionTextEl.textContent = questionObj.question;
  optionsContainer.innerHTML = '';
  
  const alphabet = ['A', 'B', 'C', 'D'];
  
  questionObj.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.innerHTML = `
      <span class="option-badge">${alphabet[idx]}</span>
      <span class="option-text">${opt}</span>
    `;
    
    btn.addEventListener('click', () => {
      onSelectOption(idx);
    });
    
    optionsContainer.appendChild(btn);
  });
}

/**
 * Render the final score results for a quiz
 * @param {Array} quizQuestions 
 * @param {Array} userAnswers 
 * @param {number} score 
 */
export function renderQuizResults(quizQuestions, userAnswers, score) {
  const displayScore = document.getElementById('quiz-score-display');
  const displayVerdictTitle = document.getElementById('quiz-verdict-title');
  const displayVerdictDesc = document.getElementById('quiz-verdict-desc');
  const reviewList = document.getElementById('quiz-review-list');
  
  if (!displayScore || !reviewList) return;
  
  displayScore.textContent = `${score}/${quizQuestions.length}`;
  
  // Score evaluations
  const pct = (score / quizQuestions.length) * 100;
  if (pct >= 90) {
    displayVerdictTitle.textContent = "Outstanding Mastery! 🏆";
    displayVerdictDesc.textContent = "You have fully grasped the details of these study materials. Excellent work!";
  } else if (pct >= 70) {
    displayVerdictTitle.textContent = "Great Job! 🥳";
    displayVerdictDesc.textContent = "Solid understanding of the concepts. Review the explanations below to top your score.";
  } else if (pct >= 50) {
    displayVerdictTitle.textContent = "Keep Practicing! 📖";
    displayVerdictDesc.textContent = "You're getting there! Take some time to review key flashcards and notes, then try again.";
  } else {
    displayVerdictTitle.textContent = "Review Recommended! 🧐";
    displayVerdictDesc.textContent = "The concepts seem a bit fresh. Go back to your documents, read the summaries, and re-attempt the quiz.";
  }
  
  reviewList.innerHTML = '';
  
  quizQuestions.forEach((q, idx) => {
    const isCorrect = userAnswers[idx] === q.correctOptionIndex;
    const reviewItem = document.createElement('div');
    reviewItem.className = `review-item ${isCorrect ? 'correct-item' : 'incorrect-item'}`;
    
    reviewItem.innerHTML = `
      <div class="review-q-text">Q${idx+1}: ${q.question}</div>
      <div class="review-answers">
        <div><i class="fa-solid fa-check text-success"></i> Correct Answer: <strong>${q.options[q.correctOptionIndex]}</strong></div>
        ${!isCorrect ? `<div><i class="fa-solid fa-xmark text-danger"></i> Your Answer: <strong>${q.options[userAnswers[idx]] || 'None'}</strong></div>` : ''}
      </div>
      <div class="explanation-text">
        <strong>Explanation:</strong> ${q.explanation}
      </div>
    `;
    
    reviewList.appendChild(reviewItem);
  });
}

/**
 * Render study planner daily roadmap list
 * @param {Array} planSteps 
 * @param {Function} onToggleSubtask Callback when subtask checkbox toggled
 */
export function renderPlannerTimeline(planSteps, onToggleSubtask) {
  const container = document.getElementById('planner-timeline-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  planSteps.forEach((step, stepIdx) => {
    const node = document.createElement('div');
    node.className = 'timeline-node';
    
    const isStepDone = step.subtasks.every((_, subIdx) => step.completedSubtasks?.includes(subIdx));
    
    node.innerHTML = `
      <div class="node-status ${isStepDone ? 'completed' : ''}" data-step="${stepIdx}">
        ${isStepDone ? '<i class="fa-solid fa-check"></i>' : ''}
      </div>
      <div class="node-content">
        <div class="node-header">
          <span class="node-day">${step.day}</span>
          <span class="node-time"><i class="fa-solid fa-clock"></i> ${step.duration}</span>
        </div>
        <h5 class="node-title">${step.title}</h5>
        <p class="node-desc">${step.description}</p>
        <ul class="node-subtasks">
          ${step.subtasks.map((task, subIdx) => {
            const isChecked = step.completedSubtasks?.includes(subIdx);
            return `
              <li class="subtask-item ${isChecked ? 'done' : ''}">
                <label>
                  <input type="checkbox" class="subtask-checkbox" data-step="${stepIdx}" data-sub="${subIdx}" ${isChecked ? 'checked' : ''}>
                  <span>${task}</span>
                </label>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
    
    // Bind checkbox listeners
    node.querySelectorAll('.subtask-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        onToggleSubtask(stepIdx, subIdx, e.target.checked);
      });
    });
    
    container.appendChild(node);
  });
}
