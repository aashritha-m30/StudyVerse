# StudyVerse 🎓✨

Live Demo Link : https://aashritha-m30.github.io/StudyVerse/

StudyVerse is a premium, intelligent, client-side web application designed to help students learn more efficiently. Upload study materials (PDFs, text files, and markdown notes) and immediately unlock interactive study companions.

StudyVerse is styled in a beautiful **White and Lavender theme**, featuring elegant glassmorphism, fluid typography, responsive flex/grid layouts, and interactive animations (including 3D flipping flashcards).

---

## 🚀 Key Features

*   📂 **Materials Vault**: Drag & drop or browse your local file system to load materials. Text notes can also be saved permanently.
*   💬 **AI Chat Assistant**: Ask freeform natural language questions directly about your study context.
*   📝 **Summary Generator**: Automatically synthesize outlines, key high-yield bullet point lists, or structural glossary tables.
*   🎮 **Interactive Quizzes**: Generate custom multiple-choice assessments from documents with scoring feedback and detailed correct/incorrect explanations.
*   📑 **Smart Flashcards**: Review vocabulary and equations with interactive 3D card flips. Track mastered concepts.
*   🗺️ **Personalized Planner**: Build structured day-by-day roadmap timelines with checklists to track study completion milestones.
*   🔒 **Privacy First**: File parsing and analysis run client-side. API keys are saved locally in the browser's `localStorage` and sent directly to official Google servers.

---

## 🛠️ Technology Stack & Architecture

To support direct client-side execution with zero dependencies or node server configurations:
1.  **Core Interface**: Semantic HTML5 and modular ES6 JavaScript.
2.  **Theme & Styling**: Custom CSS Variables, keyframe micro-animations, and CSS 3D perspectives.
3.  **PDF Extractor**: `pdf.js` loaded via CDN.
4.  **AI Engine**: Native direct integration with the **Google Gemini API** (`gemini-1.5-flash` / `gemini-1.5-pro` model versions).
5.  **Demo fallback**: Robust simulated text-processing engines to preview all sections instantly without a key.

---

## 💻 Local Quickstart

Since StudyVerse is built as a static Single Page Application, running it locally requires no build steps or installs:

1.  Navigate into the `StudyVerse` folder.
2.  Open `index.html` directly in any web browser.
3.  *Alternative*: Start a simple local server if you'd like to test ES Module loading in strict security environments:
    *   Python: `python -m http.server 8000` (Access at `http://localhost:8000`)
    *   VS Code: Right-click `index.html` and select **Open with Live Server**.

---

## 🌐 How to Deploy to GitHub Pages (Live Link)

StudyVerse includes an automated GitHub Action to deploy your workspace directly to GitHub Pages for free.

### Step 1: Initialize Git and Commit
Open your command terminal (Command Prompt, Git Bash, or PowerShell) and run:
```bash
git init
git add .
git commit -m "Initialize StudyVerse AI Study Assistant"
```

### Step 2: Create Repository on GitHub
1.  Log in to [GitHub](https://github.com/).
2.  Create a **new public repository** named `StudyVerse`. Do **not** initialize it with a README, license, or `.gitignore` (as they are already provided here).

### Step 3: Link Repository and Push
Run the following commands in your terminal:
```bash
git remote add origin https://github.com/aashritha-m30/StudyVerse.git
git branch -M main
git push -u origin main
```

### Step 4: Enable Automated Deployment
1.  On your GitHub repository page, click the **Settings** tab.
2.  In the left sidebar, navigate to **Pages**.
3.  Under **Build and deployment** -> **Source**, select **GitHub Actions** from the dropdown menu.
4.  This triggers the automated workflow in `.github/workflows/deploy.yml`!
5.  After 1-2 minutes, you will receive a notification under the **Actions** tab, along with your live URL:
    *   **Live Link URL Format**: `https://aashritha-m30.github.io/StudyVerse/`


---

## 🔑 Activating Gemini API
1.  Obtain a free API Key at [Google AI Studio](https://aistudio.google.com/).
2.  Open StudyVerse, switch to the **Settings** tab.
3.  Paste your key, select your preferred model (Gemini 1.5 Flash is recommended), and click **Save API Key**.
4.  The indicator in the bottom-left sidebar will change to **API Connected**!
