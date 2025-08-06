// Story Generator Chat App
// Gemini 2.5 Flash Thinking API integration

const GEMINI_API_KEY = 'AIzaSyBpBc5dNQzOgm8se_neUXwPGxS2_Nk9rRU';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-thinking-exp-1219:generateContent';

const inputPrompts = [
  { key: 'topic', label: "What's your story about?" },
  { key: 'theme', label: "What themes should it explore?" },
  { key: 'language', label: "Which language?" },
  { key: 'style', label: "What writing style do you prefer?" },
  { key: 'vibe', label: "What mood/atmosphere?" },
  { key: 'length', label: "How many chapters? (1-50)" }
];

let userInputs = {};
let currentInputIndex = 0;
let chapters = [];
let summaries = [];
let currentChapter = 1;
let feedback = { liked: '', disliked: '' };
let isGenerating = false;

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

function renderInputBubble(prompt, value = '') {
  inputForm.innerHTML = '';
  const bubble = document.createElement('div');
  bubble.className = 'input-bubble';

  const label = document.createElement('div');
  label.className = 'input-label';
  label.textContent = prompt.label;

  const input = document.createElement('input');
  input.className = 'input-field';
  input.type = 'text';
  input.value = value;
  input.placeholder = prompt.label;
  input.required = true;
  input.autofocus = true;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitInput(input.value.trim());
    }
  });

  bubble.appendChild(label);
  bubble.appendChild(input);
  inputForm.appendChild(bubble);
  input.focus();
}

function submitInput(value) {
  if (!value) return;
  const prompt = inputPrompts[currentInputIndex];
  userInputs[prompt.key] = value;
  renderMessageBubble(value, 'user');
  currentInputIndex++;
  if (currentInputIndex < inputPrompts.length) {
    setTimeout(() => renderInputBubble(inputPrompts[currentInputIndex]), 400);
  } else {
    inputForm.innerHTML = '';
    setTimeout(() => startStoryGeneration(), 500);
  }
  scrollToBottom();
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
    summaries.push(summary); // Only store summary for next prompt, do not display
    // Remove loading bubble
    const systemBubbles = chatArea.querySelectorAll('.bubble-system');
    systemBubbles.forEach(b => b.remove());
    renderMessageBubble(storyText, 'ai');
    renderWordCount(storyText.split(/\s+/).length);
    renderProgressBar(currentChapter, userInputs.length);
    showLoading(false);
    isGenerating = false;
    if (currentChapter < userInputs.length) {
      renderFeedbackForm();
    } else {
      renderMessageBubble('The story is complete! Thank you for reading.', 'system');
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
renderInputBubble(inputPrompts[0]);
