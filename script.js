// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('SW Registered', reg))
            .catch(err => console.log('SW Registration failed', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // ---- TABS LOGIC ----
    const tabBtns = document.querySelectorAll('.tab-btn');
    const modeViews = document.querySelectorAll('.mode-view');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            modeViews.forEach(v => v.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
            
            if(btn.dataset.target === 'draw-mode') {
                resizeCanvas();
            }
        });
    });

    // ---- GLOBAL VARIABLES ----
    const chatHistory = document.getElementById('chat-history');
    const languageSelector = document.getElementById('language-selector');
    
    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // ---- CHAT HISTORY (SPEECH TO TEXT) ----
    const btnListen = document.getElementById('btn-listen');
    let recognition;
    let isRecording = false;
    let interimBubble = null;

    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        // Update language dynamically
        recognition.lang = languageSelector.value;
        languageSelector.addEventListener('change', () => {
            recognition.lang = languageSelector.value;
            if (isRecording) {
                stopRecording();
            }
        });

        recognition.onstart = () => {
            isRecording = true;
            btnListen.classList.add('recording');
            btnListen.innerHTML = '🛑';
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                if (interimBubble) {
                    interimBubble.remove();
                    interimBubble = null;
                }
                const bubble = document.createElement('div');
                bubble.className = 'message msg-listen';
                bubble.textContent = finalTranscript;
                chatHistory.appendChild(bubble);
                scrollToBottom();
            }

            if (interimTranscript) {
                if (!interimBubble) {
                    interimBubble = document.createElement('div');
                    interimBubble.className = 'message msg-listen interim';
                    chatHistory.appendChild(interimBubble);
                }
                interimBubble.textContent = interimTranscript;
                scrollToBottom();
            } else if (interimBubble && !interimTranscript) {
                interimBubble.remove();
                interimBubble = null;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopRecording();
        };

        recognition.onend = () => {
            if (isRecording) {
                recognition.start(); // Auto restart if supposed to be recording
            } else {
                stopRecording();
            }
        };
    } else {
        btnListen.disabled = true;
        btnListen.title = "Browser tidak mendukung fitur ini";
    }

    function stopRecording() {
        isRecording = false;
        btnListen.classList.remove('recording');
        btnListen.innerHTML = '🎤';
        if (recognition) recognition.stop();
        if (interimBubble) {
            interimBubble.remove();
            interimBubble = null;
        }
    }

    btnListen.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            try { recognition.start(); } catch (e) { console.error(e); }
        }
    });

    // ---- TEXT TO SPEECH ----
    const btnSpeak = document.getElementById('btn-speak');
    const textInput = document.getElementById('text-input');
    const chips = document.querySelectorAll('.chip');

    // Auto-resize textarea
    textInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 120 ? this.scrollHeight : 120) + 'px';
    });

    function speakText(text) {
        if (!text) return;

        // Add to chat history
        const bubble = document.createElement('div');
        bubble.className = 'message msg-speak';
        bubble.textContent = text;
        chatHistory.appendChild(bubble);
        scrollToBottom();

        // Clear input
        textInput.value = '';
        textInput.style.height = 'auto';

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languageSelector.value;
            
            utterance.onstart = () => {
                btnSpeak.disabled = true;
                btnSpeak.innerHTML = '💬'; 
            };
            utterance.onend = () => {
                btnSpeak.disabled = false;
                btnSpeak.innerHTML = '🔊';
            };
            utterance.onerror = () => {
                btnSpeak.disabled = false;
                btnSpeak.innerHTML = '🔊';
            };

            window.speechSynthesis.speak(utterance);
        }
    }

    btnSpeak.addEventListener('click', () => {
        speakText(textInput.value.trim());
    });

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            speakText(chip.textContent);
        });
    });

    // Allow Enter to speak
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            btnSpeak.click();
        }
    });

    // ---- DRAWING CANVAS LOGIC ----
    const canvas = document.getElementById('drawing-board');
    const ctx = canvas.getContext('2d');
    const canvasContainer = document.querySelector('.canvas-container');
    const btnClearCanvas = document.getElementById('btn-clear-canvas');
    const penColor = document.getElementById('pen-color');
    const penSize = document.getElementById('pen-size');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function resizeCanvas() {
        const rect = canvasContainer.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // fill background so it's not transparent
        ctx.fillStyle = "#0b1120";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Call initially just in case, though tab switch will call it
    setTimeout(resizeCanvas, 100);
    window.addEventListener('resize', () => {
        if(document.getElementById('draw-mode').classList.contains('active')) {
            resizeCanvas();
        }
    });

    function startDrawing(e) {
        isDrawing = true;
        const { x, y } = getCoordinates(e);
        [lastX, lastY] = [x, y];
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling on touch
        
        const { x, y } = getCoordinates(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = penColor.value;
        ctx.lineWidth = penSize.value;
        ctx.stroke();
        
        [lastX, lastY] = [x, y];
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    btnClearCanvas.addEventListener('click', () => {
        ctx.fillStyle = "#0b1120";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
});
