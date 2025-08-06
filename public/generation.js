// New Generation System - Clean and Simple
const GEMINI_API_KEY = 'AIzaSyBpBc5dNQzOgm8se_neUXwPGxS2_Nk9rRU';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
let isGenerating = false;

// DOM Elements
const generationApp = document.getElementById('generation-app');

function initGeneration() {
  console.log('Initializing generation page...');
  renderInputForm();
}

function renderInputForm() {
  generationApp.innerHTML = `
    <div class="generation-container">
      <div class="input-section">
        <h2>Create Your Story</h2>
        <div class="input-fields">
          ${inputPrompts.map(p => `
            <div class="input-group">
              <label for="${p.key}">${p.label}</label>
              <input type="text" id="${p.key}" placeholder="Enter ${p.label.toLowerCase()}" required />
            </div>
          `).join('')}
        </div>
        <button id="generate-btn" class="generate-button">Generate Story</button>
        <div id="error-display" class="error-message hidden"></div>
      </div>
      
      <div id="generation-area" class="generation-area hidden">
        <div id="loading-animation" class="loading-container">
          <div class="book-animation">
            <div class="book">
              <div class="book-cover">
                <div class="book-spine"></div>
                <div class="book-pages">
                  <div class="page"></div>
                  <div class="page"></div>
                  <div class="page"></div>
                </div>
              </div>
            </div>
            <p class="loading-text">✍️ Writing your story...</p>
          </div>
        </div>
        
        <div id="story-display" class="story-display hidden">
          <div class="story-header">
            <h3 id="chapter-title">Chapter 1</h3>
            <div class="progress-bar">
              <div id="progress-fill" class="progress-fill"></div>
            </div>
          </div>
          
          <div class="book-page">
            <div id="story-content" class="story-content"></div>
          </div>
          
          <div class="story-controls">
            <button id="next-chapter-btn" class="control-btn">Generate Next Chapter</button>
            <button id="back-to-start-btn" class="control-btn secondary">Start New Story</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Attach event listeners
  document.getElementById('generate-btn').addEventListener('click', startGeneration);
}

function startGeneration() {
  console.log('Starting story generation...');
  
  // Collect and validate inputs
  userInputs = {};
  let allFilled = true;
  
  inputPrompts.forEach(p => {
    const input = document.getElementById(p.key);
    if (input) {
      userInputs[p.key] = input.value.trim();
      if (!userInputs[p.key]) {
        allFilled = false;
      }
    }
  });
  
  // Validate chapter count
  const chapterCount = parseInt(userInputs.length);
  if (!chapterCount || chapterCount < 1 || chapterCount > 50) {
    showErrorMessage('Please enter a valid number of chapters (1-50)');
    return;
  }
  userInputs.length = chapterCount;
  
  if (!allFilled) {
    showErrorMessage('Please fill in all fields');
    return;
  }
  
  // Reset story state
  chapters = [];
  summaries = [];
  currentChapter = 1;
  isGenerating = false;
  
  // Hide input form and show generation area
  document.querySelector('.input-section').classList.add('hidden');
  document.getElementById('generation-area').classList.remove('hidden');
  
  // Start generating first chapter
  generateChapter();
}

function generateChapter() {
  if (isGenerating) return;
  isGenerating = true;
  
  console.log(`Generating chapter ${currentChapter}/${userInputs.length}`);
  
  // Show loading animation
  document.getElementById('loading-animation').classList.remove('hidden');
  document.getElementById('story-display').classList.add('hidden');
  
  // Create the prompt and call API
  const prompt = createStoryPrompt();
  callGeminiAPI(prompt);
}

function createStoryPrompt() {
  const basePrompt = `You are a master storyteller. Write chapter ${currentChapter} of ${userInputs.length} for a story with these specifications:

Topic: ${userInputs.topic}
Themes: ${userInputs.theme}  
Language: ${userInputs.language}
Writing Style: ${userInputs.style}
Mood/Atmosphere: ${userInputs.vibe}

${summaries.length > 0 ? 'Previous story context:\n' + summaries.join('\n\n') + '\n\n' : ''}

Write approximately 1500-2000 words for this chapter. Make it engaging, well-structured, and include dialogue where appropriate. Format dialogue with proper indentation like a real book.

After the story content, provide a brief summary for continuity starting with "SUMMARY:" on a new line.`;

  return basePrompt;
}

async function callGeminiAPI(prompt) {
  try {
    console.log('Calling Gemini API...');
    
    const response = await fetch(GEMINI_ENDPOINT + `?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('No content received from API');
    }
    
    const fullText = data.candidates[0].content.parts[0].text || '';
    console.log('Received response from Gemini');
    
    // Process the response
    processStoryResponse(fullText);
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    showErrorMessage('Failed to generate story. Please try again.');
    isGenerating = false;
    
    // Show input form again on error
    document.getElementById('loading-animation').classList.add('hidden');
    document.querySelector('.input-section').classList.remove('hidden');
    document.getElementById('generation-area').classList.add('hidden');
  }
}

function processStoryResponse(fullText) {
  // Split story content from summary
  let storyText = fullText;
  let summary = '';
  
  const summaryMatch = fullText.match(/SUMMARY:\s*(.*?)$/s);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
    storyText = fullText.replace(/SUMMARY:\s*.*$/s, '').trim();
  }
  
  // Store the chapter and summary
  chapters.push(storyText);
  if (summary) {
    summaries.push(summary);
  }
  
  // Hide loading and show story
  document.getElementById('loading-animation').classList.add('hidden');
  document.getElementById('story-display').classList.remove('hidden');
  
  // Update the display
  updateStoryDisplay();
  
  isGenerating = false;
}

function updateStoryDisplay() {
  // Update chapter title
  document.getElementById('chapter-title').textContent = `Chapter ${currentChapter} of ${userInputs.length}`;
  
  // Update progress bar
  const progressPercent = (currentChapter / userInputs.length) * 100;
  document.getElementById('progress-fill').style.width = `${progressPercent}%`;
  
  // Format and display story content
  const storyContent = document.getElementById('story-content');
  const formattedText = formatStoryText(chapters[currentChapter - 1]);
  storyContent.innerHTML = formattedText;
  
  // Update controls
  const nextBtn = document.getElementById('next-chapter-btn');
  const backBtn = document.getElementById('back-to-start-btn');
  
  if (currentChapter < userInputs.length) {
    nextBtn.textContent = 'Generate Next Chapter';
    nextBtn.onclick = () => {
      currentChapter++;
      generateChapter();
    };
    nextBtn.style.display = 'block';
  } else {
    nextBtn.textContent = 'Story Complete!';
    nextBtn.onclick = () => saveStoryToHistory();
    nextBtn.classList.add('completed');
  }
  
  backBtn.onclick = () => {
    // Reset and go back to input form
    document.querySelector('.input-section').classList.remove('hidden');
    document.getElementById('generation-area').classList.add('hidden');
  };
}

function formatStoryText(text) {
  // Format text like a real book
  // Split into paragraphs and format dialogue
  const paragraphs = text.split(/\n\s*\n/);
  
  return paragraphs.map(paragraph => {
    paragraph = paragraph.trim();
    if (!paragraph) return '';
    
    // Check if it's dialogue (starts with quotes)
    if (paragraph.match(/^["'"]/)) {
      return `<p class="dialogue">${paragraph}</p>`;
    } else {
      return `<p>${paragraph}</p>`;
    }
  }).filter(p => p).join('\n');
}

function saveStoryToHistory() {
  const history = JSON.parse(localStorage.getItem('storyHistory') || '[]');
  
  const newStory = {
    id: Date.now(),
    topic: userInputs.topic,
    theme: userInputs.theme,
    language: userInputs.language,
    style: userInputs.style,
    vibe: userInputs.vibe,
    length: userInputs.length,
    chapters: [...chapters],
    createdAt: new Date().toISOString()
  };
  
  history.unshift(newStory);
  
  // Keep only the latest 10 stories
  if (history.length > 10) {
    history.splice(10);
  }
  
  localStorage.setItem('storyHistory', JSON.stringify(history));
  console.log('Story saved to history');
  
  // Show completion message
  showSuccessMessage('Story completed and saved to history!');
}

function showErrorMessage(message) {
  const errorDisplay = document.getElementById('error-display');
  errorDisplay.textContent = message;
  errorDisplay.classList.remove('hidden');
  setTimeout(() => {
    errorDisplay.classList.add('hidden');
  }, 5000);
}

function showSuccessMessage(message) {
  const storyContent = document.getElementById('story-content');
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  storyContent.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initGeneration);

const app = document.getElementById('generation-app');

function renderLayout() {
  app.innerHTML = `
    <div class="gen-layout">
      <aside class="gen-sidebar${sidebarOpen ? '' : ' closed'}">
        <div class="sidebar-header">
          <span>Book History</span>
          <button id="toggle-sidebar" class="sidebar-toggle">${sidebarOpen ? '⟨' : '⟩'}</button>
        </div>
        <ul id="history-list"></ul>
      </aside>
      <main class="gen-main">
        <form id="input-form" class="full-form">
          ${inputPrompts.map(p => `
            <div class="input-row">
              <label for="${p.key}" class="input-label">${p.label}</label>
              <input type="text" id="${p.key}" name="${p.key}" class="input-field" required />
            </div>
          `).join('')}
          <button type="submit" class="button">Generate Story</button>
        </form>
        <div id="chat-area"></div>
        <div id="loading-indicator" class="hidden">
          <span>Writing your story<span class="dots"></span></span>
        </div>
        <div id="error-message" class="hidden"></div>
      </main>
    </div>
  `;
  document.getElementById('toggle-sidebar').onclick = () => {
    sidebarOpen = !sidebarOpen;
    renderLayout();
  };
  renderHistory();
  document.getElementById('input-form').onsubmit = handleFormSubmit;
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
  const chatArea = document.getElementById('chat-area');
  chatArea.innerHTML = '';
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

window.startStoryGeneration = function() {
  hideError();
  chapters = [];
  summaries = [];
  currentChapter = 1;
  feedback = { liked: '', disliked: '' };
  document.getElementById('chat-area').innerHTML = '';
  renderProgressBar(0, userInputs.length);
  generateChapter();
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
  // Animate form out
  const form = document.getElementById('input-form');
  form.classList.add('fade-out');
  setTimeout(() => {
    form.style.display = 'none';
    showBookWritingAnimation();
    setTimeout(() => {
      window.startStoryGeneration();
    }, 2200);
  }, 700);
}

function showBookWritingAnimation() {
  const chatArea = document.getElementById('chat-area');
  chatArea.innerHTML = '';
  const anim = document.createElement('div');
  anim.className = 'book-writing-anim';
  anim.innerHTML = `
    <div class="book-cover">
      <div class="book-pages">
        <div class="book-page"></div>
        <div class="book-page"></div>
        <div class="book-page"></div>
      </div>
      <div class="book-title">Writing your story...</div>
    </div>
  `;
  chatArea.appendChild(anim);
  // Remove animation after 2s
  setTimeout(() => {
    anim.classList.add('fade-out');
    setTimeout(() => {
      anim.remove();
    }, 700);
  }, 1500);
}

function showLoading(show) {
  document.getElementById('loading-indicator').classList.toggle('hidden', !show);
}
function showError(msg) {
  const errorMessage = document.getElementById('error-message');
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
}
function hideError() {
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) errorMessage.classList.add('hidden');
}

function scrollToBottom() {
  setTimeout(() => {
    const chatArea = document.getElementById('chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
  }, 300);
}

function renderMessageBubble(text, sender = 'ai') {
  const chatArea = document.getElementById('chat-area');
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble ' + (sender === 'user' ? 'bubble-user' : sender === 'system' ? 'bubble-system' : 'bubble-ai');
  bubble.innerHTML = text;
  chatArea.appendChild(bubble);
  scrollToBottom();
}

function renderChapterHeader(chapterNum, total) {
  const chatArea = document.getElementById('chat-area');
  const header = document.createElement('div');
  header.className = 'chapter-header';
  header.textContent = `Chapter ${chapterNum} of ${total}`;
  chatArea.appendChild(header);
}

function renderProgressBar(current, total) {
  let bar = document.getElementById('progress-bar');
  const chatArea = document.getElementById('chat-area');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'progress-bar';
    bar.className = 'progress-bar';
    chatArea.parentNode.insertBefore(bar, chatArea);
    const progress = document.createElement('div');
    progress.className = 'progress';
    progress.style.width = `${(current/total)*100}%`;
    bar.appendChild(progress);
  } else {
    bar.querySelector('.progress').style.width = `${(current/total)*100}%`;
  }
}

function renderLayout() {
  app.innerHTML = `
    <div class="gen-layout">
      <aside class="gen-sidebar${sidebarOpen ? '' : ' closed'}">
        <div class="sidebar-header">
          <span>Book History</span>
          <button id="toggle-sidebar" class="sidebar-toggle">${sidebarOpen ? '⟨' : '⟩'}</button>
        </div>
        <ul id="history-list"></ul>
      </aside>
      <main class="gen-main">
        <form id="input-form" class="full-form fade-in">
          ${inputPrompts.map(p => `
            <div class="input-row">
              <label for="${p.key}" class="input-label">${p.label}</label>
              <input type="text" id="${p.key}" name="${p.key}" class="input-field" required />
            </div>
          `).join('')}
          <button type="submit" class="button">Generate Story</button>
        </form>
        <div id="chat-area" class="chat-scroll"></div>
        <div id="loading-indicator" class="hidden">
          <span>Writing your story<span class="dots"></span></span>
        </div>
        <div id="error-message" class="hidden"></div>
      </main>
    </div>
  `;
  document.getElementById('toggle-sidebar').onclick = () => {
    sidebarOpen = !sidebarOpen;
    renderLayout();
  };
  renderHistory();
  document.getElementById('input-form').onsubmit = handleFormSubmit;
}


function buildSystemPrompt() {
  return `You are a highly skilled and experienced Master Storyteller and Author, renowned for crafting immersive, complex, and emotionally resonant narratives across various genres. Your current task is to write a complete serialized novel based precisely on the topic and genre provided by the user in their initial request.

NARRATIVE CONCEPT & STYLE ADAPTATION:
- Story Topic: ${userInputs.topic}
- Genre: ${userInputs.theme}
- Language: ${userInputs.language}
- Tone and Style: ${userInputs.style}
- Atmosphere/Vibe: ${userInputs.vibe}

SERIALIZATION SYSTEM:
The complete story must be delivered in exactly ${userInputs.length} distinct parts. Each part will be numbered sequentially (e.g., 1/${userInputs.length}, 2/${userInputs.length}, etc.).

PREVIOUS STORY CONTEXT:
${summaries.join('\n\n')}

USER FEEDBACK FROM LAST CHAPTER:
- What they liked: ${feedback.liked}
- What they wanted changed: ${feedback.disliked}
(Incorporate this feedback while maintaining story consistency)

CURRENT CHAPTER: ${currentChapter}/${userInputs.length}

OUTPUT:
Write approximately 2000 words of high-quality story content that advances the plot, develops characters, maintains the specified style and atmosphere, incorporates user feedback, and builds toward the overall story conclusion. Do not format the output in any way, just provide the story text. At the end, provide a detailed summary for future context building (separate from main content, but do not format it as a heading or section).`;
}

async function generateChapter() {
  if (isGenerating) return;
  isGenerating = true;
  showLoading(true);
  renderChapterHeader(currentChapter, userInputs.length);
  renderMessageBubble('Writing your story...', 'system');
  try {
    const prompt = buildSystemPrompt();
    const response = await fetch(GEMINI_ENDPOINT + `?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      throw new Error('No story content received.');
    }
    let storyText = data.candidates[0].content.parts[0].text || '';
    let summary = '';
    // Try to split summary from story
    const summaryMatch = storyText.match(/Summary:(.*)$/s);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
      storyText = storyText.replace(/Summary:(.*)$/s, '').trim();
    }
    chapters.push(storyText);
    summaries.push(summary);
    // Remove loading bubble
    const chatArea = document.getElementById('chat-area');
    const systemBubbles = chatArea.querySelectorAll('.bubble-system');
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
      localStorage.setItem('bookHistory', JSON.stringify(history));
      renderHistory();
    }
  } catch (err) {
    showLoading(false);
    isGenerating = false;
    showError('Error generating story. Please try again.');
  }
}

function renderFeedbackForm() {
  const chatArea = document.getElementById('chat-area');
  const form = document.createElement('form');
  form.className = 'feedback-form';
  form.innerHTML = `
    <div class="input-row">
      <label class="input-label">What did you like?</label>
      <input type="text" class="input-field" id="liked" placeholder="Share what you liked" />
    </div>
    <div class="input-row">
      <label class="input-label">What would you improve?</label>
      <input type="text" class="input-field" id="disliked" placeholder="Share what could be better" />
    </div>
    <button type="submit" class="button">Generate Next Chapter</button>
  `;
  form.onsubmit = (e) => {
    e.preventDefault();
    feedback.liked = form.querySelector('#liked').value.trim();
    feedback.disliked = form.querySelector('#disliked').value.trim();
    form.remove();
    currentChapter++;
    generateChapter();
  };
  chatArea.appendChild(form);
}
