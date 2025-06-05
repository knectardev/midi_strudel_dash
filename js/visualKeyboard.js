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
        this.isMousePressed = false; // Track if mouse is currently pressed down
        this.lastPlayedKey = null; // Track the last key that was played to avoid repeats
        
        // Configuration for mouseover behavior
        this.mouseoverMode = 'always'; // 'always' = mouseover always triggers, 'drag' = only when dragging
        
        this._createKeyboard(); // This will re-generate keys with the new startNote
        this._bindGlobalMouseEvents(); // Bind global mouse events for drag tracking
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
        let isMouseDownOnThisKey = false; // Track if mouse was pressed down on this specific key

        // Helper function to play note
        const playNote = () => {
            if (keyElement.classList.contains('disabled-key')) {
                return; // Do not play or process if key is disabled
            }
            
            // Only play if this key hasn't been played recently (avoid rapid repeats)
            if (this.lastPlayedKey !== midiNote) {
                if (this.audioEngine) {
                    this.audioEngine.playSynthNote(midiNote, velocity);
                }
                keyElement.classList.add('key-pressed');
                if (this.noteOnCallback) {
                    // Simulate note on for other modules, e.g., StrudelCoder
                    this.noteOnCallback(midiNote, velocity, "VisualKeyboard"); 
                }
                this.lastPlayedKey = midiNote;
            }
        };

        // Clear the pressed state
        const clearPressed = () => {
            keyElement.classList.remove('key-pressed');
            if (this.lastPlayedKey === midiNote) {
                this.lastPlayedKey = null;
            }
        };

        keyElement.addEventListener('mousedown', (event) => {
            event.preventDefault(); // Prevent text selection
            this.isMousePressed = true;
            isMouseDownOnThisKey = true;
            // console.log('VisualKeyboard: mousedown on key', midiNote, 'isMousePressed:', this.isMousePressed);
            playNote();
        });

        keyElement.addEventListener('mouseup', (event) => {
            // console.log('VisualKeyboard: mouseup on key', midiNote);
            this.isMousePressed = false; // Reset global state on mouseup
            isMouseDownOnThisKey = false;
            clearPressed();
        });

        keyElement.addEventListener('mouseover', (event) => {
            // Check if any mouse button is currently pressed (more reliable than our tracking)
            const isButtonPressed = (event.buttons & 1) === 1; // Check if left mouse button is pressed
            console.log('VisualKeyboard: mouseover on key', midiNote, 'event.buttons:', event.buttons, 'isButtonPressed:', isButtonPressed, 'this.isMousePressed:', this.isMousePressed, 'mode:', this.mouseoverMode);
            
            // Determine if we should play based on mode
            let shouldPlay = false;
            if (this.mouseoverMode === 'always') {
                shouldPlay = true; // Always play on mouseover
            } else if (this.mouseoverMode === 'drag') {
                shouldPlay = isButtonPressed || this.isMousePressed; // Only play when dragging
            }
            
            if (shouldPlay) {
                console.log('VisualKeyboard: triggering playNote on mouseover for key', midiNote);
                playNote();
            }
        });

        // Add mouseenter as backup - more reliable than mouseover
        keyElement.addEventListener('mouseenter', (event) => {
            const isButtonPressed = (event.buttons & 1) === 1; // Check if left mouse button is pressed
            // console.log('VisualKeyboard: mouseenter on key', midiNote, 'event.buttons:', event.buttons, 'isButtonPressed:', isButtonPressed, 'this.isMousePressed:', this.isMousePressed, 'mode:', this.mouseoverMode);
            
            // Determine if we should play based on mode
            let shouldPlay = false;
            if (this.mouseoverMode === 'always') {
                shouldPlay = true; // Always play on mouseenter
            } else if (this.mouseoverMode === 'drag') {
                shouldPlay = isButtonPressed || this.isMousePressed; // Only play when dragging
            }
            
            if (shouldPlay) {
                // console.log('VisualKeyboard: triggering playNote on mouseenter for key', midiNote);
                playNote();
            }
        });

        keyElement.addEventListener('mouseleave', () => {
            // console.log('VisualKeyboard: mouseleave on key', midiNote);
            isMouseDownOnThisKey = false;
            clearPressed();
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

    _bindGlobalMouseEvents() {
        // More robust global mouse tracking
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Only track left mouse button
                this.isMousePressed = true;
                // console.log('VisualKeyboard: global mousedown, isMousePressed:', this.isMousePressed);
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Only track left mouse button
                this.isMousePressed = false;
                this.lastPlayedKey = null; // Reset last played key on mouse up
                // console.log('VisualKeyboard: global mouseup, isMousePressed:', this.isMousePressed);
            }
        });

        // Also handle mouse leave from document to reset state
        document.addEventListener('mouseleave', () => {
            this.isMousePressed = false;
            this.lastPlayedKey = null;
            // console.log('VisualKeyboard: document mouseleave, reset isMousePressed to false');
        });
    }

    // Method to change mouseover behavior
    setMouseoverMode(mode) {
        if (mode === 'always' || mode === 'drag') {
            this.mouseoverMode = mode;
            console.log('VisualKeyboard: mouseover mode set to:', mode);
        } else {
            console.warn('VisualKeyboard: Invalid mouseover mode. Use "always" or "drag"');
        }
    }
} 