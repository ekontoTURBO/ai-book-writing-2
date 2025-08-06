// New Generation System - Updated for new layout
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
let isGenerating = false;
let history = JSON.parse(localStorage.getItem('storyHistory') || '[]');

// DOM Elements
const bookFormContainer = document.getElementById('book-form-container');
const chapterScroll = document.getElementById('chapter-scroll');
const historyList = document.getElementById('history-list');
const newBookBtn = document.getElementById('new-book-btn');

function initGeneration() {
  console.log('Initializing generation page...');
  renderBookForm();
  renderHistory();
  
  // Event listeners
  newBookBtn.addEventListener('click', showNewBookForm);
}

function renderBookForm() {
  bookFormContainer.innerHTML = `
    <div class="book-form-title">Create Your Story</div>
    <form id="book-creation-form">
      ${inputPrompts.map(p => `
        <div class="input-row">
          <label for="${p.key}" class="input-label">${p.label}</label>
          <input type="text" id="${p.key}" class="input-field" placeholder="Enter ${p.label.toLowerCase()}" required />
        </div>
      `).join('')}
      <button type="submit" class="generate-btn">Generate Story</button>
    </form>
    <div id="error-display" class="error-message hidden" style="margin-top: 1em; color: #ff6b6b; text-align: center;"></div>
  `;
  
  // Attach form submission handler
  document.getElementById('book-creation-form').addEventListener('submit', handleBookCreation);
}

function renderHistory() {
  if (!historyList) return;
  
  historyList.innerHTML = '';
  
  if (history.length === 0) {
    historyList.innerHTML = '<li style="color: #aaffd6; text-align: center; padding: 2em;">No books created yet. Click "+ New Book" to start!</li>';
    return;
  }
  
  history.forEach((book, index) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 0.3em;">${book.topic}</div>
      <div style="font-size: 0.9em; color: #aaffd6;">${book.chapters.length}/${book.length} chapters</div>
    `;
    li.onclick = () => viewHistoryBook(index);
    historyList.appendChild(li);
  });
}

function showNewBookForm() {
  // Reset state
  chapters = [];
  summaries = [];
  currentChapter = 1;
  userInputs = {};
  
  // Show form, hide chapter view
  bookFormContainer.style.display = 'block';
  chapterScroll.style.display = 'none';
  
  renderBookForm();
}

function viewHistoryBook(index) {
  const book = history[index];
  bookFormContainer.style.display = 'none';
  chapterScroll.style.display = 'block';
  
  chapterScroll.innerHTML = '';
  
  book.chapters.forEach((chapter, i) => {
    const chapterHeader = document.createElement('div');
    chapterHeader.className = 'chapter-header';
    chapterHeader.textContent = `Chapter ${i + 1} of ${book.length}`;
    chapterScroll.appendChild(chapterHeader);
    
    const chapterMessage = document.createElement('div');
    chapterMessage.className = 'chapter-message';
    chapterMessage.innerHTML = formatStoryText(chapter);
    chapterScroll.appendChild(chapterMessage);
  });
}

function handleBookCreation(e) {
  e.preventDefault();
  
  // Collect inputs
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
  
  // Hide form and show chapter area
  bookFormContainer.style.display = 'none';
  chapterScroll.style.display = 'block';
  chapterScroll.innerHTML = '';
  
  // Start generating first chapter
  generateChapter();
}

function generateChapter() {
  if (isGenerating) return;
  isGenerating = true;
  
  console.log(`Generating chapter ${currentChapter}/${userInputs.length}`);
  
  // Show loading message
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chapter-message';
  loadingDiv.innerHTML = '✍️ Writing your story... Please wait.';
  loadingDiv.id = 'loading-message';
  chapterScroll.appendChild(loadingDiv);
  
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
    
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.text) {
      throw new Error('No content received from API');
    }
    
    const fullText = data.text;
    console.log('Received response from Gemini');
    
    // Process the response
    processStoryResponse(fullText);
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    showErrorMessage('Failed to generate story. Please try again.');
    isGenerating = false;
    
    // Remove loading message
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) loadingMsg.remove();
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
  
  // Remove loading message
  const loadingMsg = document.getElementById('loading-message');
  if (loadingMsg) loadingMsg.remove();
  
  // Add chapter header
  const chapterHeader = document.createElement('div');
  chapterHeader.className = 'chapter-header';
  chapterHeader.textContent = `Chapter ${currentChapter} of ${userInputs.length}`;
  chapterScroll.appendChild(chapterHeader);
  
  // Add chapter content
  const chapterMessage = document.createElement('div');
  chapterMessage.className = 'chapter-message';
  chapterMessage.innerHTML = formatStoryText(storyText);
  chapterScroll.appendChild(chapterMessage);
  
  // Add controls
  if (currentChapter < userInputs.length) {
    addFeedbackForm();
  } else {
    // Story is complete
    const completionMsg = document.createElement('div');
    completionMsg.className = 'chapter-message';
    completionMsg.style.textAlign = 'center';
    completionMsg.style.color = '#00e676';
    completionMsg.innerHTML = '🎉 Story Complete! Your book has been saved to history.';
    chapterScroll.appendChild(completionMsg);
    
    saveStoryToHistory();
  }
  
  // Scroll to bottom
  chapterScroll.scrollTop = chapterScroll.scrollHeight;
  
  isGenerating = false;
}

function addFeedbackForm() {
  const feedbackForm = document.createElement('form');
  feedbackForm.className = 'feedback-form';
  feedbackForm.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 1em; color: #00e676;">Chapter ${currentChapter} Complete</div>
    <div class="input-row">
      <label class="input-label">What did you like about this chapter?</label>
      <input type="text" class="input-field" id="feedback-liked" placeholder="Share what you enjoyed..." />
    </div>
    <div class="input-row">
      <label class="input-label">What would you improve?</label>
      <input type="text" class="input-field" id="feedback-disliked" placeholder="Share what could be better..." />
    </div>
    <button type="submit" class="generate-btn">Generate Next Chapter</button>
  `;
  
  feedbackForm.onsubmit = (e) => {
    e.preventDefault();
    const liked = document.getElementById('feedback-liked').value.trim();
    const disliked = document.getElementById('feedback-disliked').value.trim();
    
    // Store feedback for next chapter
    if (liked || disliked) {
      summaries.push(`User feedback: Liked - "${liked}", Suggestions - "${disliked}"`);
    }
    
    feedbackForm.remove();
    currentChapter++;
    generateChapter();
  };
  
  chapterScroll.appendChild(feedbackForm);
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
      return `<p class="dialogue" style="margin-left: 1em; font-style: italic;">${paragraph}</p>`;
    } else {
      return `<p>${paragraph}</p>`;
    }
  }).filter(p => p).join('\n');
}

function saveStoryToHistory() {
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
  
  // Update sidebar
  renderHistory();
}

function showErrorMessage(message) {
  const errorDisplay = document.getElementById('error-display');
  if (errorDisplay) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove('hidden');
    setTimeout(() => {
      errorDisplay.classList.add('hidden');
    }, 5000);
  }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initGeneration);


