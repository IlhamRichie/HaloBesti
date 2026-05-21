document.addEventListener('DOMContentLoaded', () => {
    // Mode Dengar (Speech to Text)
    const btnListen = document.getElementById('btn-listen');
    const transcriptDisplay = document.getElementById('transcript-display');
    const listenStatus = document.getElementById('listen-status');

    let recognition;
    let isRecording = false;

    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID';

        recognition.onstart = () => {
            isRecording = true;
            btnListen.classList.add('recording');
            btnListen.innerHTML = '<span class="icon">🛑</span> Berhenti Mendengar';
            listenStatus.textContent = 'Sedang mendengarkan...';
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

            const placeholder = transcriptDisplay.querySelector('.placeholder');
            if (placeholder) {
                transcriptDisplay.innerHTML = '';
            }

            if (finalTranscript) {
                const p = document.createElement('p');
                p.textContent = finalTranscript;
                p.style.marginBottom = '8px';
                transcriptDisplay.appendChild(p);
            }

            let interimElem = transcriptDisplay.querySelector('.interim');
            if (!interimElem && interimTranscript) {
                interimElem = document.createElement('p');
                interimElem.className = 'interim';
                interimElem.style.color = '#94a3b8';
                interimElem.style.fontStyle = 'italic';
                transcriptDisplay.appendChild(interimElem);
            }
            
            if (interimElem) {
                interimElem.textContent = interimTranscript;
                if(!interimTranscript) {
                    interimElem.remove();
                }
            }

            transcriptDisplay.scrollTop = transcriptDisplay.scrollHeight;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            listenStatus.textContent = `Error: ${event.error}`;
            stopRecording();
        };

        recognition.onend = () => {
            if (isRecording) {
                recognition.start();
            } else {
                stopRecording();
            }
        };
    } else {
        btnListen.disabled = true;
        listenStatus.textContent = 'Browser tidak mendukung Web Speech API.';
    }

    function stopRecording() {
        isRecording = false;
        btnListen.classList.remove('recording');
        btnListen.innerHTML = '<span class="icon">🎤</span> Mulai Mendengar';
        listenStatus.textContent = 'Berhenti mendengarkan.';
        if (recognition) {
            recognition.stop();
        }
    }

    btnListen.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
    });

    // Mode Bicara (Text to Speech)
    const btnSpeak = document.getElementById('btn-speak');
    const btnClear = document.getElementById('btn-clear');
    const textInput = document.getElementById('text-input');

    btnSpeak.addEventListener('click', () => {
        const text = textInput.value.trim();
        if (text !== '') {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel(); // Stop current speaking
                
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'id-ID';
                utterance.rate = 1.0;
                utterance.pitch = 1.0;

                utterance.onstart = () => {
                    btnSpeak.disabled = true;
                    btnSpeak.innerHTML = '<span class="icon">🔊</span> Berbicara...';
                };

                utterance.onend = () => {
                    btnSpeak.disabled = false;
                    btnSpeak.innerHTML = '<span class="icon">🔊</span> Bicara';
                };

                utterance.onerror = (event) => {
                    console.error('SpeechSynthesis error', event);
                    btnSpeak.disabled = false;
                    btnSpeak.innerHTML = '<span class="icon">🔊</span> Bicara';
                };

                window.speechSynthesis.speak(utterance);
            } else {
                alert('Browser Anda tidak mendukung Text to Speech.');
            }
        }
    });

    btnClear.addEventListener('click', () => {
        textInput.value = '';
        textInput.focus();
    });
});
