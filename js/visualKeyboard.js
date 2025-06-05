class VisualKeyboard {
    constructor(containerId, audioEngine, noteOnCallback) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`VisualKeyboard: Container with ID '${containerId}' not found.`);
            return;
        }
        this.audioEngine = audioEngine;
        this.noteOnCallback = noteOnCallback; // Callback to simulate MIDI for other modules

        this.startNote = 48; // C3 (Should be 48 for C3)
        this.octaves = 3;
        this.numKeys = 12 * this.octaves + 1; // +1 for the final C of the last octave

        this.keys = []; // To store references to key elements
        this._createKeyboard(); // This will re-generate keys with the new startNote
    }

    updatePlayableKeys(tonicMidiNote, scaleIntervals) {
        if (!scaleIntervals || scaleIntervals.length === 0) {
            // If no scale is provided, or an empty scale, make all keys playable (or default state)
            this.keys.forEach(keyObj => {
                keyObj.element.classList.remove('playable-key', 'disabled-key');
            });
            return;
        }

        this.keys.forEach(keyObj => {
            const keyMidiNote = keyObj.midiNote;
            // Normalize the note to an octave (0-11) relative to the tonic
            const noteInOctaveRelativeTonic = (keyMidiNote - tonicMidiNote) % 12;
            // Adjust for negative results of modulo to ensure it's always in 0-11 range
            const normalizedNote = (noteInOctaveRelativeTonic + 12) % 12;

            if (scaleIntervals.includes(normalizedNote)) {
                keyObj.element.classList.add('playable-key');
                keyObj.element.classList.remove('disabled-key');
            } else {
                keyObj.element.classList.remove('playable-key');
                keyObj.element.classList.add('disabled-key');
            }
        });
    }

    _isBlackKey(midiNote) {
        const noteInOctave = midiNote % 12;
        return [1, 3, 6, 8, 10].includes(noteInOctave); // C#=1, D#=3, F#=6, G#=8, A#=10
    }

    _createKeyboard() {
        this.container.innerHTML = ''; // Clear any existing content
        const keyboardFragment = document.createDocumentFragment();

        console.log(`VisualKeyboard: Creating keyboard starting at MIDI note ${this.startNote}`); // Log start note

        for (let i = 0; i < this.numKeys; i++) {
            const midiNote = this.startNote + i;
            const key = document.createElement('div');
            key.classList.add('piano-key');
            key.dataset.note = midiNote;

            if (this._isBlackKey(midiNote)) {
                key.classList.add('black-key');
            } else {
                key.classList.add('white-key');
            }
            // Aria-label for accessibility - can be enhanced later with note names
            key.setAttribute('role', 'button');
            key.setAttribute('aria-label', `Piano key MIDI ${midiNote}`);

            this._bindKeyEvents(key, midiNote);
            this.keys.push({ midiNote, element: key });
            keyboardFragment.appendChild(key);
        }
        this.container.appendChild(keyboardFragment);
        console.log(`VisualKeyboard: ${this.numKeys} keys created.`);
    }

    _bindKeyEvents(keyElement, midiNote) {
        const velocity = 90; // Default velocity for mouse clicks

        keyElement.addEventListener('mousedown', () => {
            if (keyElement.classList.contains('disabled-key')) {
                return; // Do not play or process if key is disabled
            }
            if (this.audioEngine) {
                this.audioEngine.playSynthNote(midiNote, velocity);
            }
            keyElement.classList.add('key-pressed');
            if (this.noteOnCallback) {
                // Simulate note on for other modules, e.g., StrudelCoder
                // The deviceName can be a generic "VisualKeyboard" or a specific simulated one
                this.noteOnCallback(midiNote, velocity, "VisualKeyboard"); 
            }
        });

        keyElement.addEventListener('mouseup', () => {
            keyElement.classList.remove('key-pressed');
            // If we implement note-off in audioEngine for sustained notes, call it here
        });

        keyElement.addEventListener('mouseleave', () => { // Handle mouse dragging off a key
            keyElement.classList.remove('key-pressed');
        });
    }

    // Called from main.js when a real MIDI note comes in
    highlightKey(midiNote, duration = 300) {
        const keyObj = this.keys.find(k => k.midiNote === midiNote);
        if (keyObj && keyObj.element) {
            keyObj.element.classList.add('key-pressed-midi');
            setTimeout(() => {
                keyObj.element.classList.remove('key-pressed-midi');
            }, duration);
        }
    }
} 