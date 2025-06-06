class XYPad {
    constructor(containerId, mainController) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`XYPad: Container with ID '${containerId}' not found.`);
            return;
        }

        this.padArea = this.container.querySelector('#xyPadArea');
        this.crosshair = this.container.querySelector('#xyPadCrosshair');
        this.noteDisplay = this.container.querySelector('#xyPadNoteDisplay');
        this.midiDisplay = this.container.querySelector('#xyPadMidiDisplay');
        this.freqDisplay = this.container.querySelector('#xyPadFreqDisplay');
        this.xDisplay = this.container.querySelector('#xyPadXDisplay');
        this.yDisplay = this.container.querySelector('#xyPadYDisplay');

        if (!this.padArea || !this.crosshair || !this.noteDisplay) {
            console.error("XYPad: One or more required child elements not found in container.");
            return;
        }

        this.mainController = mainController; // To access global tonic/scale and audioEngine
        this.audioEngine = null; // Will be set later via mainController or a direct setter
        this.strudelCoder = null; // Will be set to capture notes for Strudel code generation

        this.currentScaleNotes = [];
        this.isDragging = false;
        this.lastPlayedNote = null;

        this.rawX = 0; // 0-127 for MIDI CC compatibility
        this.rawY = 0; // 0-127 for MIDI CC compatibility

        // Configuration for mouseover behavior (similar to VisualKeyboard)
        this.mouseoverMode = 'always'; // 'always' = mouseover always triggers, 'drag' = only when dragging
        this.isMousePressed = false; // Track if mouse is currently pressed down

        // Throttling for Strudel note capture to prevent chord detection on rapid movements
        this.lastStrudelCaptureTime = 0;
        this.strudelCaptureThreshold = 50; // Minimum ms between Strudel note captures

        this._bindEvents();
        this.updateMusicalContext(); // Initial scale generation
    }

    setAudioEngine(audioEngineInstance) {
        this.audioEngine = audioEngineInstance;
        console.log("XYPad: AudioEngine instance received.");
    }

    setStrudelCoder(strudelCoderInstance) {
        this.strudelCoder = strudelCoderInstance;
        console.log("XYPad: StrudelCoder instance received for note capture.");
    }

    // Method to change mouseover behavior
    setMouseoverMode(mode) {
        if (mode === 'always' || mode === 'drag') {
            this.mouseoverMode = mode;
            console.log('XYPad: mouseover mode set to:', mode);
        } else {
            console.warn('XYPad: Invalid mouseover mode. Use "always" or "drag"');
        }
    }

    // Method to configure Strudel capture throttling
    setStrudelCaptureThrottling(thresholdMs) {
        if (typeof thresholdMs === 'number' && thresholdMs >= 0) {
            this.strudelCaptureThreshold = thresholdMs;
            console.log('XYPad: Strudel capture threshold set to:', thresholdMs, 'ms');
        } else {
            console.warn('XYPad: Invalid threshold. Use a number >= 0');
        }
    }

    updateMusicalContext() {
        const tonic = this.mainController.getCurrentGlobalTonic();
        const scaleType = this.mainController.getCurrentGlobalScale();
        const scaleDefinition = this.mainController.getGlobalScaleDefinition(scaleType);

        if (!scaleDefinition) {
            console.error(`XYPad: Scale definition for '${scaleType}' not found.`);
            this.currentScaleNotes = [];
            return;
        }

        this.currentScaleNotes = [];
        // Generate three octaves of the scale
        for (let octave = 0; octave < 3; octave++) {
            scaleDefinition.forEach(interval => {
                this.currentScaleNotes.push(tonic + interval + (octave * 12));
            });
        }
        // Add the tonic of the 4th octave to ensure the full range is covered at the top end
        this.currentScaleNotes.push(tonic + (3 * 12));
        
        // Sort and remove duplicates just in case, though unlikely with this generation method
        this.currentScaleNotes = [...new Set(this.currentScaleNotes)].sort((a, b) => a - b);

        console.log(`XYPad: Context updated. Tonic: ${tonic}, Scale: ${scaleType}, Notes:`, this.currentScaleNotes);
        this._updateDisplay(this.rawX, this.rawY); // Refresh display with new scale context if needed
    }

    _bindEvents() {
        this.padArea.addEventListener('mousedown', this._handleMouseDown.bind(this));
        this.padArea.addEventListener('mouseover', this._handleMouseOver.bind(this));
        this.padArea.addEventListener('mousemove', this._handleMouseMove.bind(this));
        this.padArea.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
        document.addEventListener('mousemove', this._handleMouseMove.bind(this));
        document.addEventListener('mouseup', this._handleMouseUp.bind(this));
        
        // Global mouse tracking for mouseover mode (similar to VisualKeyboard)
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Only track left mouse button
                this.isMousePressed = true;
                // console.log('XYPad: global mousedown, isMousePressed:', this.isMousePressed);
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Only track left mouse button
                this.isMousePressed = false;
                // console.log('XYPad: global mouseup, isMousePressed:', this.isMousePressed);
            }
        });

        // Also handle mouse leave from document to reset state
        document.addEventListener('mouseleave', () => {
            this.isMousePressed = false;
            // console.log('XYPad: document mouseleave, reset isMousePressed to false');
        });
        
        // Touch events for mobile/tablet
        this.padArea.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
        this.padArea.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
        this.padArea.addEventListener('touchend', this._handleTouchEnd.bind(this));
        this.padArea.addEventListener('touchcancel', this._handleTouchEnd.bind(this));
    }

    _handleInteractionStart(clientX, clientY) {
        this.isDragging = true;
        this._updatePositionAndNote(clientX, clientY);
    }

    _handleInteractionMove(clientX, clientY) {
        if (!this.isDragging) return;
        this._updatePositionAndNote(clientX, clientY);
    }

    _handleInteractionEnd() {
        if (this.isDragging) {
            this.isDragging = false;
            // Optional: send note off or stop sound if engine supports it
            if (this.audioEngine && this.lastPlayedNote !== null) {
                // this.audioEngine.noteOff(this.lastPlayedNote.midi); // Example
                 console.log(`XYPad: Note OFF (simulated) for MIDI ${this.lastPlayedNote.midi}`);
            }
            this.lastPlayedNote = null;
        }
    }

    _handleMouseDown(event) {
        this.isMousePressed = true;
        // console.log('XYPad: mousedown, starting interaction');
        this._handleInteractionStart(event.clientX, event.clientY);
    }

    _handleMouseOver(event) {
        // Check if any mouse button is currently pressed (more reliable than our tracking)
        const isButtonPressed = (event.buttons & 1) === 1; // Check if left mouse button is pressed
        console.log('XYPad: mouseover, event.buttons:', event.buttons, 'isButtonPressed:', isButtonPressed, 'this.isMousePressed:', this.isMousePressed, 'mode:', this.mouseoverMode);
        
        // Determine if we should trigger interaction based on mode
        let shouldTrigger = false;
        if (this.mouseoverMode === 'always') {
            shouldTrigger = true; // Always trigger on mouseover
        } else if (this.mouseoverMode === 'drag') {
            shouldTrigger = isButtonPressed || this.isMousePressed; // Only trigger when dragging
        }
        
        if (shouldTrigger) {
            console.log('XYPad: triggering interaction on mouseover');
            if (!this.isDragging) {
                this.isDragging = true;
            }
            this._updatePositionAndNote(event.clientX, event.clientY);
        } else if (isButtonPressed && !this.isDragging) {
            // Legacy behavior: If mouse enters the pad area while dragging (from outside), start interaction
            this._handleInteractionStart(event.clientX, event.clientY);
        }
    }

    _handleMouseMove(event) {
        this._handleInteractionMove(event.clientX, event.clientY);
    }

    _handleMouseUp(event) {
        this.isMousePressed = false; // Reset our tracking
        // console.log('XYPad: mouseup, ending interaction');
        this._handleInteractionEnd();
    }
    
    _handleTouchStart(event) {
        event.preventDefault(); // Prevent scrolling
        if (event.touches.length > 0) {
            this._handleInteractionStart(event.touches[0].clientX, event.touches[0].clientY);
        }
    }

    _handleTouchMove(event) {
        event.preventDefault(); // Prevent scrolling
        if (event.touches.length > 0) {
            this._handleInteractionMove(event.touches[0].clientX, event.touches[0].clientY);
        }
    }

    _handleTouchEnd(event) {
        this._handleInteractionEnd();
    }

    _handleMouseLeave(event) {
        // console.log('XYPad: mouseleave, mode:', this.mouseoverMode, 'isDragging:', this.isDragging);
        
        if (this.mouseoverMode === 'always') {
            // In 'always' mode, end interaction when leaving the pad
            this._handleInteractionEnd();
        } else {
            // In 'drag' mode, don't end interaction on mouseleave - allow dragging outside the pad
            // The interaction will continue and end on mouseup instead
            // This allows for more fluid interaction when dragging outside and back in
        }
    }

    _updatePositionAndNote(clientX, clientY) {
        const rect = this.padArea.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

        this.crosshair.style.left = `${(x / rect.width) * 100}%`;
        this.crosshair.style.top = `${(y / rect.height) * 100}%`;

        this.rawX = Math.floor((x / rect.width) * 127);
        this.rawY = Math.floor((1 - (y / rect.height)) * 127);

        this._updateDisplay(this.rawX, this.rawY);

        if (this.currentScaleNotes.length === 0) return;

        let noteIndex = Math.floor((this.rawX / 127) * (this.currentScaleNotes.length - 1));
        noteIndex = Math.max(0, Math.min(this.currentScaleNotes.length - 1, noteIndex));
        
        const currentMidiNote = this.currentScaleNotes[noteIndex];
        const velocity = this.rawY;

        // Play note only if it's different or velocity changed significantly (optional)
        // For now, we play if the note OR velocity changes to give more feedback
        if (this.lastPlayedNote === null || this.lastPlayedNote.midi !== currentMidiNote || this.lastPlayedNote.velocity !== velocity ) {
            // If a different note is played, we might want to stop the previous one if our audioEngine supported sustained notes and explicit noteOff
            // Our current simple audioEngine playSynthNote is self-releasing, so explicit noteOff is not critical yet.
            // if (this.audioEngine && this.lastPlayedNote !== null && this.lastPlayedNote.midi !== currentMidiNote) {
            //    this.audioEngine.stopSynthNote(this.lastPlayedNote.midi); // If we implement this in AudioEngine
            // }

            this.lastPlayedNote = { midi: currentMidiNote, velocity: velocity };

            // Play the note through audio engine
            if (this.audioEngine && this.audioEngine.isInitialized) {
                this.audioEngine.playSynthNote(currentMidiNote, velocity);
            } else {
                console.log(`XYPad: Play Note (AudioEngine NOT READY): MIDI ${currentMidiNote}, Velocity: ${velocity}`);
            }

            // Capture the note in Strudel Coder for code generation
            if (this.strudelCoder) {
                const currentTime = Date.now();
                // Only capture for Strudel if enough time has passed to prevent chord detection
                if (currentTime - this.lastStrudelCaptureTime >= this.strudelCaptureThreshold) {
                    this.strudelCoder.captureNote(currentMidiNote, velocity, 'XY Pad (Mouse)', 'xypad-mouse');
                    this.lastStrudelCaptureTime = currentTime;
                    console.log(`XYPad: Note captured for Strudel: MIDI ${currentMidiNote}, Velocity: ${velocity}`);
                }
            }
            
            const noteName = this.mainController.getNoteName(currentMidiNote) || '--';
            const freq = this._midiToFreq(currentMidiNote).toFixed(2);
            if(this.noteDisplay) this.noteDisplay.textContent = noteName;
            if(this.midiDisplay) this.midiDisplay.textContent = currentMidiNote;
            if(this.freqDisplay) this.freqDisplay.textContent = `${freq} Hz`;
        }
    }
    
    _updateDisplay(rawX, rawY) {
        if(this.xDisplay) this.xDisplay.textContent = rawX;
        if(this.yDisplay) this.yDisplay.textContent = rawY;
    }

    handleMidiCC(cc, value) {
        let noteTriggered = false;
        if (cc === 1) { 
            this.rawX = value;
            noteTriggered = true;
        } else if (cc === 2) { 
            this.rawY = value;
            noteTriggered = true; 
        }

        if (noteTriggered && this.currentScaleNotes.length > 0) {
            this.crosshair.style.left = `${(this.rawX / 127) * 100}%`;
            this.crosshair.style.top = `${(1 - (this.rawY / 127)) * 100}%`; 
            this._updateDisplay(this.rawX, this.rawY);

            let noteIndex = Math.floor((this.rawX / 127) * (this.currentScaleNotes.length - 1));
            noteIndex = Math.max(0, Math.min(this.currentScaleNotes.length - 1, noteIndex));
            const currentMidiNote = this.currentScaleNotes[noteIndex];
            const velocity = this.rawY;

            if (this.lastPlayedNote === null || this.lastPlayedNote.midi !== currentMidiNote || this.lastPlayedNote.velocity !== velocity) {
                this.lastPlayedNote = { midi: currentMidiNote, velocity: velocity };
                
                // Play the note through audio engine
                if (this.audioEngine && this.audioEngine.isInitialized) {
                    this.audioEngine.playSynthNote(currentMidiNote, velocity);
                } else {
                    console.log(`XYPad (MIDI): Play Note (AudioEngine NOT READY): MIDI ${currentMidiNote}, Velocity: ${velocity}`);
                }

                // Capture the note in Strudel Coder for code generation
                if (this.strudelCoder) {
                    const currentTime = Date.now();
                    // Only capture for Strudel if enough time has passed to prevent chord detection
                    if (currentTime - this.lastStrudelCaptureTime >= this.strudelCaptureThreshold) {
                        this.strudelCoder.captureNote(currentMidiNote, velocity, 'XY Pad (MIDI CC)', 'xypad-midi');
                        this.lastStrudelCaptureTime = currentTime;
                        console.log(`XYPad (MIDI): Note captured for Strudel: MIDI ${currentMidiNote}, Velocity: ${velocity}`);
                    }
                }

                 const noteName = this.mainController.getNoteName(currentMidiNote) || '--';
                 const freq = this._midiToFreq(currentMidiNote).toFixed(2);
                 if(this.noteDisplay) this.noteDisplay.textContent = noteName;
                 if(this.midiDisplay) this.midiDisplay.textContent = currentMidiNote;
                 if(this.freqDisplay) this.freqDisplay.textContent = `${freq} Hz`;
            }
        }
    }

    _midiToFreq(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }
} 