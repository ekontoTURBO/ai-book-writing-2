// Story Generator Chat App
// Secure API integration via Render backend

const GEMINI_ENDPOINT = 'https://cognibook-geminiapi.onrender.com/api/generate';


const inputPrompts = [
  { key: 'topic', label: "What's your story about?" },
  { key: 'theme', label: "What themes should it explore?" },
  { key: 'language', label: "Which language?" },
  { key: 'style', label: "What writing style do you prefer?" },
  { key: 'vibe', label: "What mood/atmosphere?" },
  { key: 'length', label: "How many chapters? (1-50)" }
];

let userInputs = {};
let chapters = [];
let summaries = [];
let currentChapter = 1;
let feedback = { liked: '', disliked: '' };
let isGenerating = false;
let history = [];

const appContainer = document.getElementById('app-container');
const chatArea = document.getElementById('chat-area');
const inputForm = document.getElementById('input-form');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');

function showLoading(show) {
  loadingIndicator.classList.toggle('hidden', !show);
}
function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
}
function hideError() {
  errorMessage.classList.add('hidden');
}

function scrollToBottom() {
  setTimeout(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  }, 300);
}

function renderMainPage() {
  appContainer.innerHTML = `
    <div class="main-layout">
      <div class="main-welcome">
        <h1>Welcome to Story Generator</h1>
        <p class="subtitle">Create immersive serialized stories with AI. Enter your preferences and let the AI craft a novel for you, chapter by chapter.</p>
        <ul class="welcome-info">
          <li>Powered by Gemini 2.5 Flash Thinking model</li>
          <li>Responsive, distraction-free reading experience</li>
          <li>Book history saved locally for easy access</li>
          <li>Feedback system to guide the story direction</li>
          <li>Green-themed, modern chat interface</li>
        </ul>
        <button id="start-btn" class="button">Start Generating</button>
      </div>
    </div>
  `;
  document.getElementById('start-btn').onclick = () => {
    window.location.href = './generation.html';
  };
}

function renderHistory() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<li class="empty">No books generated yet.</li>';
    return;
  }
  history.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `<strong>${item.topic}</strong> <span>(${item.length} chapters)</span>`;
    li.onclick = () => showHistoryBook(idx);
    historyList.appendChild(li);
  });
}

function showHistoryBook(idx) {
  const book = history[idx];
  appContainer.innerHTML = `
    <div class="main-layout">
      <div class="main-welcome">
        <h1>${book.topic}</h1>
        <p class="subtitle">${book.theme} | ${book.language} | ${book.style} | ${book.vibe}</p>
        <button id="back-btn" class="button">Back</button>
      </div>
      <aside class="history-sidebar">
        <h2>Book History</h2>
        <ul id="history-list"></ul>
      </aside>
    </div>
    <main id="chat-area"></main>
  `;
  document.getElementById('back-btn').onclick = renderMainPage;
  renderHistory();
  const chatArea = document.getElementById('chat-area');
  book.chapters.forEach((chapter, i) => {
    const header = document.createElement('div');
    header.className = 'chapter-header';
    header.textContent = `Chapter ${i+1} of ${book.length}`;
    chatArea.appendChild(header);
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble bubble-ai';
    bubble.innerHTML = chapter;
    chatArea.appendChild(bubble);
  });
}

function renderInputForm() {
  appContainer.innerHTML = `
    <div class="main-layout">
      <main id="chat-area"></main>
      <aside class="history-sidebar">
        <h2>Book History</h2>
        <ul id="history-list"></ul>
      </aside>
    </div>
    <form id="input-form" class="full-form">
      ${inputPrompts.map(p => `
        <div class="input-row">
          <label for="${p.key}" class="input-label">${p.label}</label>
          <input type="text" id="${p.key}" name="${p.key}" class="input-field" required />
        </div>
      `).join('')}
      <button type="submit" class="button">Generate Story</button>
    </form>
    <div id="loading-indicator" class="hidden">
      <span>Writing your story<span class="dots"></span></span>
    </div>
    <div id="error-message" class="hidden"></div>
  `;
  renderHistory();
  document.getElementById('input-form').onsubmit = handleFormSubmit;
}

function handleFormSubmit(e) {
  e.preventDefault();
  userInputs = {};
  inputPrompts.forEach(p => {
    userInputs[p.key] = document.getElementById(p.key).value.trim();
  });
  chapters = [];
  summaries = [];
  currentChapter = 1;
  feedback = { liked: '', disliked: '' };
  startStoryGeneration();
}


function renderMessageBubble(text, sender = 'ai', options = {}) {
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble ' + (sender === 'user' ? 'bubble-user' : sender === 'system' ? 'bubble-system' : 'bubble-ai');
  bubble.innerHTML = text;
  chatArea.appendChild(bubble);
  scrollToBottom();
}

function renderChapterHeader(chapterNum, total) {
  const header = document.createElement('div');
  header.className = 'chapter-header';
  header.textContent = `Chapter ${chapterNum} of ${total}`;
  chatArea.appendChild(header);
}

function renderProgressBar(current, total) {
  let bar = document.getElementById('progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'progress-bar';
    bar.className = 'progress-bar';
    appContainer.insertBefore(bar, chatArea);
    const progress = document.createElement('div');
    progress.className = 'progress';
    progress.style.width = `${(current/total)*100}%`;
    bar.appendChild(progress);
  } else {
    bar.querySelector('.progress').style.width = `${(current/total)*100}%`;
  }
}

function renderWordCount(words) {
  let wc = document.getElementById('word-count');
  if (!wc) {
    wc = document.createElement('div');
    wc.id = 'word-count';
    wc.className = 'word-count';
    appContainer.insertBefore(wc, chatArea.nextSibling);
  }
  wc.textContent = `Word count: ${words} | ~${Math.ceil(words/250)} min read`;
}


function startStoryGeneration() {
  hideError();
  chapters = [];
  summaries = [];
  currentChapter = 1;
  feedback = { liked: '', disliked: '' };
  renderProgressBar(0, userInputs.length);
  document.getElementById('chat-area').innerHTML = '';
  generateChapter();
}

function buildSystemPrompt() {
  return `You are a highly skilled and experienced **Master Storyteller and Author**, renowned for crafting immersive, complex, and emotionally resonant narratives across various genres. Your current task is to write a complete serialized novel based *precisely* on the topic and genre provided by the user in their initial request.

**NARRATIVE CONCEPT & STYLE ADAPTATION:**
- **Story Topic:** You will strictly adhere to the specific book topic, high-level plot, and any key character details: ${userInputs.topic}
- **Genre:** The story must fit the specified genre and thematic elements: ${userInputs.theme}
- **Language:** Write in the specified language: ${userInputs.language}
- **Tone and Style:** You must meticulously emulate the specific tone and style: ${userInputs.style}. Pay close attention to nuances in language, character voice, descriptive depth, and narrative perspective that define the requested style.
- **Atmosphere/Vibe:** Maintain the requested mood throughout: ${userInputs.vibe}

**SERIALIZATION SYSTEM:**
The complete story *must* be delivered in **exactly ${userInputs.length} distinct parts**. Each part will be numbered sequentially (e.g., 1/${userInputs.length}, 2/${userInputs.length}, etc.).

**PREVIOUS STORY CONTEXT:**
${summaries.join('\n\n')}

**USER FEEDBACK FROM LAST CHAPTER:**
- What they liked: ${feedback.liked}
- What they wanted changed: ${feedback.disliked}
(Incorporate this feedback while maintaining story consistency)

**CURRENT CHAPTER:** ${currentChapter}/${userInputs.length}

**OUTPUT FORMAT:**
Write approximately 2000 words of high-quality story content that:
- Advances the plot meaningfully
- Develops characters with depth and authenticity
- Maintains the specified style and atmosphere
- Incorporates user feedback naturally
- Builds toward the overall story conclusion

Then provide a detailed summary for future context building (separate from main content).

Create immersive, emotionally resonant content that keeps readers engaged and eager for the next chapter.`;
}

async function generateChapter() {
  if (isGenerating) return;
  isGenerating = true;
  showLoading(true);
  renderChapterHeader(currentChapter, userInputs.length);
  renderMessageBubble('Writing your story...', 'system');
  try {
    const prompt = buildSystemPrompt();
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt
      })
    });
    const data = await response.json();
    if (!data.text) {
      throw new Error('No story content received.');
    }
    let fullText = data.text;
    let storyText = fullText;
    let summary = '';
    // Try to split summary from story using multiple possible separators
    // 1. English or Polish 'Summary' keyword
    // 2. ---
    // 3. **Summary for future context building:**
    // 4. *Summary for future context building:*
    // 5. Newline + bullet points
    let summaryIdx = -1;
    let summaryRegexes = [
      /\n\s*Summary for future context building:?\s*\*?\*?(.*)$/is,
      /\n\s*Summary:?\s*\*?\*?(.*)$/is,
      /---\s*\n(.*)$/is,
      /\n\s*Podsumowanie:?\s*\*?\*?(.*)$/is,
      /\n\s*\*\s*Podsumowanie(.*)$/is
    ];
    for (let rx of summaryRegexes) {
      let m = fullText.match(rx);
      if (m) {
        summary = m[1].trim();
        summaryIdx = m.index;
        storyText = fullText.substring(0, m.index).trim();
        break;
      }
    }
    // Fallback: if summary still not found, try to split at first bullet point after a long story
    if (!summary && fullText.length > 1000) {
      let bulletIdx = fullText.indexOf('\n* ');
      if (bulletIdx > 0) {
        storyText = fullText.substring(0, bulletIdx).trim();
        summary = fullText.substring(bulletIdx).trim();
      }
    }
    chapters.push(storyText);
    summaries.push(summary); // Only store summary for next prompt, do not display
    // Remove loading bubble
    const systemBubbles = document.getElementById('chat-area').querySelectorAll('.bubble-system');
    systemBubbles.forEach(b => b.remove());
    renderChapterHeader(currentChapter, userInputs.length);
    renderMessageBubble(storyText, 'ai');
    renderWordCount(storyText.split(/\s+/).length);
    renderProgressBar(currentChapter, userInputs.length);
    showLoading(false);
    isGenerating = false;
    if (currentChapter < userInputs.length) {
      renderFeedbackForm();
    } else {
      renderMessageBubble('The story is complete! Thank you for reading.', 'system');
      // Save to history
      history.unshift({
        topic: userInputs.topic,
        theme: userInputs.theme,
        language: userInputs.language,
        style: userInputs.style,
        vibe: userInputs.vibe,
        length: userInputs.length,
        chapters: [...chapters]
      });
      renderHistory();
    }
  } catch (err) {
    showLoading(false);
    isGenerating = false;
    showError('Error generating story. Please try again.');
  }
}

function renderFeedbackForm() {
  inputForm.innerHTML = '';
  const likedBubble = document.createElement('div');
  likedBubble.className = 'input-bubble';
  const likedLabel = document.createElement('div');
  likedLabel.className = 'input-label';
  likedLabel.textContent = 'What did you like?';
  const likedInput = document.createElement('input');
  likedInput.className = 'input-field';
  likedInput.type = 'text';
  likedInput.placeholder = 'Share what you liked';
  likedBubble.appendChild(likedLabel);
  likedBubble.appendChild(likedInput);

  const dislikedBubble = document.createElement('div');
  dislikedBubble.className = 'input-bubble';
  const dislikedLabel = document.createElement('div');
  dislikedLabel.className = 'input-label';
  dislikedLabel.textContent = 'What would you improve?';
  const dislikedInput = document.createElement('input');
  dislikedInput.className = 'input-field';
  dislikedInput.type = 'text';
  dislikedInput.placeholder = 'Share what could be better';
  dislikedBubble.appendChild(dislikedLabel);
  dislikedBubble.appendChild(dislikedInput);

  const nextButton = document.createElement('button');
  nextButton.className = 'button';
  nextButton.textContent = 'Generate Next Chapter';
  nextButton.onclick = () => {
    feedback.liked = likedInput.value.trim();
    feedback.disliked = dislikedInput.value.trim();
    inputForm.innerHTML = '';
    currentChapter++;
    generateChapter();
  };

  inputForm.appendChild(likedBubble);
  inputForm.appendChild(dislikedBubble);
  inputForm.appendChild(nextButton);
}


// Initial render
window.onload = renderMainPage;
