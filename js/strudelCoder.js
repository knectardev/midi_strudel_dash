class StrudelCoder {
    constructor(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`StrudelCoder: Container with ID '${containerId}' not found.`);
            return;
        }

        // Get references to HTML elements
        this.deviceSelector = container.querySelector('#strudelDeviceSelector');
        this.notationTypeToggle = container.querySelector('#notationTypeToggle');
        this.soundTypeSelector = container.querySelector('#soundTypeSelector');
        this.bpmSlider = container.querySelector('#strudelBpmSlider');
        this.bpmValueDisplay = container.querySelector('#strudelBpmValue');
        this.clearButton = container.querySelector('#strudelClear');
        this.capturedNotesCountDisplay = container.querySelector('#strudelCapturedNotesCount');
        this.capturingFromDeviceDisplay = container.querySelector('#strudelCapturingFromDevice');

        // Core properties from legacy
        this.capturedNotes = [];
        this.firstNoteTime = 0; // Changed from null to 0 to match legacy logic more directly
        this.quantizeResolution = 500; // milliseconds
        this.maxNotes = 100; 
        this.selectedDeviceId = 'all'; 
        this.availableDevices = [{ id: 'all', name: 'All Devices' }]; // Initial default
        this.notationType = 'musical'; // Default to musical notation
        this.selectedSound = 'piano'; // Default sound
        this.bpm = 20; // Default BPM value
        this.chordTimeWindow = 100; // milliseconds - notes within this window are considered simultaneous

        // MIDI to note name mapping (from legacy)
        this.midiToNoteName = {
            21: "a0", 22: "a#0", 23: "b0", 24: "c1", 25: "c#1", 26: "d1", 27: "d#1", 28: "e1", 29: "f1",
            30: "f#1", 31: "g1", 32: "g#1", 33: "a1", 34: "a#1", 35: "b1", 36: "c2", 37: "c#2", 38: "d2",
            39: "d#2", 40: "e2", 41: "f2", 42: "f#2", 43: "g2", 44: "g#2", 45: "a2", 46: "a#2", 47: "b2",
            48: "c3", 49: "c#3", 50: "d3", 51: "d#3", 52: "e3", 53: "f3", 54: "f#3", 55: "g3", 56: "g#3",
            57: "a3", 58: "a#3", 59: "b3", 60: "c4", 61: "c#4", 62: "d4", 63: "d#4", 64: "e4", 65: "f4",
            66: "f#4", 67: "g4", 68: "g#4", 69: "a4", 70: "a#4", 71: "b4", 72: "c5", 73: "c#5", 74: "d5",
            75: "d#5", 76: "e5", 77: "f5", 78: "f#5", 79: "g5", 80: "g#5", 81: "a5", 82: "a#5", 83: "b5",
            84: "c6"
            // ... extend as needed
        };

        this.initEventListeners();
        this.updateStatus(); // Changed from updateDisplay
    }

    initEventListeners() {
        if (this.deviceSelector) {
            this.deviceSelector.addEventListener('change', (event) => {
                this.selectedDeviceId = event.target.value;
                const selectedDevice = this.availableDevices.find(d => d.id === this.selectedDeviceId);
                if (this.capturingFromDeviceDisplay && selectedDevice) {
                    this.capturingFromDeviceDisplay.textContent = selectedDevice.name;
                } else if (this.capturingFromDeviceDisplay) {
                    this.capturingFromDeviceDisplay.textContent = 'All Devices';
                }
            });
        }

        if (this.notationTypeToggle) {
            this.notationTypeToggle.addEventListener('change', () => {
                this.notationType = this.notationTypeToggle.value;
                this.updateStatus();
                // Automatically inject code when notation type changes
                if (this.capturedNotes.length > 0) {
                    const code = this.getNotation();
                    this.injectIntoStrudelEditor(code);
                }
            });
        }

        if (this.soundTypeSelector) {
            this.soundTypeSelector.addEventListener('change', () => {
                this.selectedSound = this.soundTypeSelector.value;
                this.updateStatus();
                // Automatically inject code when sound type changes
                if (this.capturedNotes.length > 0) {
                    const code = this.getNotation();
                    this.injectIntoStrudelEditor(code);
                }
            });
        }

        if (this.bpmSlider) {
            this.bpmSlider.addEventListener('input', () => {
                this.bpm = parseInt(this.bpmSlider.value, 10);
                if (this.bpmValueDisplay) {
                    this.bpmValueDisplay.textContent = this.bpm;
                }
                // Automatically inject code when BPM changes
                const code = this.getNotation();
                this.injectIntoStrudelEditor(code);
            });
        }

        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.clearNotes();
            });
        }
    }

    // Placeholder for methods to be transferred from legacy

    updateStatus() {
        if (this.capturedNotesCountDisplay) {
            this.capturedNotesCountDisplay.textContent = this.capturedNotes.length;
        }
    }

    isAllowedDevice(deviceName, deviceId = '') {
        if (this.selectedDeviceId === 'all') {
            return true; 
        }
        if (deviceId && this.selectedDeviceId === deviceId) {
            return true;
        }
        const selectedDevice = this.availableDevices.find(d => d.id === this.selectedDeviceId);
        if (selectedDevice && deviceName) {
            // Check if either name contains the other, accommodating partial matches or vendor prefixes
            return deviceName.toLowerCase().includes(selectedDevice.name.toLowerCase()) ||
                   selectedDevice.name.toLowerCase().includes(deviceName.toLowerCase());
        }
        return false;
    }

    updateAvailableDevices(midiHandlerOrDevices) {
        let devices = [];
        if (midiHandlerOrDevices && typeof midiHandlerOrDevices.getInputDevices === 'function') {
            devices = midiHandlerOrDevices.getInputDevices(); 
        } else if (Array.isArray(midiHandlerOrDevices)) {
            devices = midiHandlerOrDevices; // Allow passing an array of device objects directly for testing
        }

        const uniqueDevices = [];
        const seenDevices = new Set();
        for (const device of devices) {
            if (device && device.name && device.id) { // Ensure device object is valid
                const deviceKey = `${device.name}-${device.id}`;
                if (!seenDevices.has(deviceKey)) {
                    seenDevices.add(deviceKey);
                    uniqueDevices.push(device);
                }
            }
        }

        this.availableDevices = [
            { id: 'all', name: 'All Devices' }, // Manufacturer can be omitted or empty
            ...uniqueDevices.map(d => ({ id: d.id, name: d.name })) // Simplify to what's needed
        ];

        if (this.deviceSelector) {
            // Clear existing options (except the first "All Devices" if we want to keep it, or clear all)
            while (this.deviceSelector.options.length > 0) {
                this.deviceSelector.remove(0);
            }

            // Populate with new devices
            this.availableDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.name;
                this.deviceSelector.appendChild(option);
            });

            // Restore selected device if still available, or default to 'all'
            if (this.availableDevices.find(d => d.id === this.selectedDeviceId)) {
                this.deviceSelector.value = this.selectedDeviceId;
            } else {
                this.selectedDeviceId = 'all';
                this.deviceSelector.value = 'all';
            }
            // Update the status display for capturing device
            const selectedDeviceObj = this.availableDevices.find(d => d.id === this.selectedDeviceId);
            if (this.capturingFromDeviceDisplay && selectedDeviceObj) {
                this.capturingFromDeviceDisplay.textContent = selectedDeviceObj.name;
            }
        }
    }

    captureNote(note, velocity, deviceName, deviceId) {
        if (!this.isAllowedDevice(deviceName, deviceId)) {
            return;
        }

        const noteName = this.midiToNoteName[note] || `n${note}`;
        const currentTime = Date.now();

        if (this.firstNoteTime === 0 && this.capturedNotes.length === 0) { // Ensure firstNoteTime is set only for the very first note of a sequence
            this.firstNoteTime = currentTime;
        }

        const relativeTime = (this.capturedNotes.length === 0) ? 0 : currentTime - this.firstNoteTime;

        // Check if this note should be part of a chord (played within the chord time window)
        const recentNotes = this.capturedNotes.filter(capturedNote => 
            Math.abs(capturedNote.time - relativeTime) <= this.chordTimeWindow
        );

        if (recentNotes.length > 0 && !recentNotes[0].isChord) {
            // Convert the recent note(s) into a chord and add this new note
            const lastNoteIndex = this.capturedNotes.length - 1;
            const lastNote = this.capturedNotes[lastNoteIndex];
            
            // Create a chord from the last note and this new note
            const chordNotes = [
                { midi: lastNote.midi, name: lastNote.name, velocity: lastNote.velocity },
                { midi: note, name: noteName, velocity: velocity }
            ];

            // Replace the last note with a chord
            this.capturedNotes[lastNoteIndex] = {
                midi: chordNotes.map(n => n.midi), // Array of MIDI numbers
                name: chordNotes.map(n => n.name), // Array of note names  
                velocity: Math.max(...chordNotes.map(n => n.velocity)), // Use highest velocity
                time: lastNote.time, // Use time of first note in chord
                deviceName: deviceName,
                isChord: true,
                chordNotes: chordNotes
            };
        } else if (recentNotes.length > 0 && recentNotes[0].isChord) {
            // Add to existing chord
            const lastNoteIndex = this.capturedNotes.length - 1;
            const chordNote = this.capturedNotes[lastNoteIndex];
            
            // Add this note to the existing chord
            chordNote.chordNotes.push({ midi: note, name: noteName, velocity: velocity });
            chordNote.midi.push(note);
            chordNote.name.push(noteName);
            chordNote.velocity = Math.max(chordNote.velocity, velocity);
        } else {
            // Regular single note
            this.capturedNotes.push({
                midi: note,
                name: noteName,
                velocity: velocity,
                time: relativeTime,
                deviceName: deviceName,
                isChord: false
            });
        }

        if (this.capturedNotes.length > this.maxNotes) {
            this.capturedNotes.shift(); // Remove the oldest note
             // Adjust firstNoteTime if the first note was removed and there are still notes
            if (this.capturedNotes.length > 0) {
                this.firstNoteTime = Date.now() - this.capturedNotes[0].time;
            }
        }
        
        this.updateStatus();
        // Automatically inject code into REPL whenever a note is captured
        const code = this.getNotation();
        this.injectIntoStrudelEditor(code);
    }

    clearNotes() {
        this.capturedNotes = [];
        this.firstNoteTime = 0;
        this.updateStatus();
        // Automatically clear the REPL when notes are cleared
        const code = this.getNotation(); // This will return the empty state with setcpm
        this.injectIntoStrudelEditor(code);
    }

    quantize(ms) {
        if (this.quantizeResolution === 0) return 1; // Avoid division by zero if resolution is 0
        return Math.max(1, Math.round(ms / this.quantizeResolution));
    }

    compressNotes(sequence, key = "name") {
        if (!sequence || sequence.length === 0) return [];
    
        const compressed = [];
        let i = 0;
    
        while (i < sequence.length) {
            const currentItem = sequence[i];
            
            // Handle chords
            if (currentItem.isChord) {
                const chordValues = key === "name" ? currentItem.name : currentItem.midi;
                let chordNotation = `[${chordValues.join(', ')}]`;
                
                // Calculate duration for the chord (similar to single notes)
                let duration = 1;
                if (i + 1 < sequence.length) { // If there's a next item after the chord
                    duration = this.quantize(sequence[i + 1].time - currentItem.time);
                }
                duration = Math.max(1, duration); // Ensure duration is at least 1
                
                // Apply duration notation if it's greater than 1
                if (duration > 1 && i + 1 < sequence.length) {
                    chordNotation = `${chordNotation}@${duration}`;
                }
                
                compressed.push(chordNotation);
                i++;
                continue;
            }
            
            // Handle regular notes (existing logic)
            const currentNote = currentItem[key];
            let count = 0;
            let actualFirstTime = currentItem.time;

            // Count identical consecutive notes based on quantized timing *relative to the start of this specific group*
            let groupStartTime = currentItem.time;
            let k = i;
            while (k < sequence.length && !sequence[k].isChord && sequence[k][key] === currentNote) {
                 // The first note of a potential group always has a quantized relative time of 0 *within that group*
                const quantizedTimeFromGroupStart = (k === i) ? 0 : this.quantize(sequence[k].time - groupStartTime);
                if (quantizedTimeFromGroupStart <= 1) { // Check if it's close enough to be part of the same event or a quick repeat
                    count++;
                    k++;
                } else {
                    break;
                }
            }
            
            // Determine duration for the group based on the next different note or end of sequence
            let duration = 1;
            if (k < sequence.length) { // If there's a next note after the group
                duration = this.quantize(sequence[k].time - actualFirstTime);
            } else { // If this group is at the end of the sequence
                // If there was a previous note, calculate duration from it, otherwise default to 1
                if (compressed.length > 0 && i > 0) {
                     // This logic is tricky; for now, end-of-sequence notes get duration 1 relative to their start
                }
            }
            duration = Math.max(1, duration); // Ensure duration is at least 1

            if (count > 1) {
                compressed.push(`${currentNote}!${count}`);
            } else if (duration > 1 && k < sequence.length) { // Only apply duration if it's meaningful (not last note group)
                compressed.push(`${currentNote}@${duration}`);
            } else {
                compressed.push(`${currentNote}`);
            }
            i = k; // Move past the processed group
        }
        return compressed;
    }

    getNotation() {
        const cpmLine = `setcpm(${this.bpm})`;
        
        if (this.capturedNotes.length === 0) {
            return `${cpmLine}\n//\n//\n//\n//`;
        }
        
        const key = this.notationType === 'musical' ? 'name' : 'midi';
        const seq = this.compressNotes(this.capturedNotes, key);
        
        // Transform the selected sound from parentheses format to dot format
        const transformedSound = this.transformSoundName(this.selectedSound);
        
        // Check if we have multiple chords
        const chordCount = seq.filter(item => item.startsWith('[')).length;
        
        if (chordCount > 1) {
            // Multi-line chord format - group consecutive single notes, separate chords
            const formattedItems = [];
            let currentSingleNotes = [];
            
            for (let i = 0; i < seq.length; i++) {
                const item = seq[i];
                
                if (item.startsWith('[')) {
                    // This is a chord
                    // First, add any accumulated single notes
                    if (currentSingleNotes.length > 0) {
                        formattedItems.push(currentSingleNotes.join(' '));
                        currentSingleNotes = [];
                    }
                    // Then add the chord
                    formattedItems.push(item);
                } else {
                    // This is a single note, accumulate it
                    currentSingleNotes.push(item);
                }
            }
            
            // Add any remaining single notes
            if (currentSingleNotes.length > 0) {
                formattedItems.push(currentSingleNotes.join(' '));
            }
            
            // Format with proper indentation
            const formattedChords = formattedItems.map((item, index) => {
                if (index === 0) {
                    return item;
                } else {
                    return `     ${item}`;
                }
            }).join(' \n');
            
            return `${cpmLine}\n//\nnote(\`${formattedChords}\`).sound("${transformedSound}")\n// \n//`;
        } else {
            // Original format for single chords or no chords
            return `${cpmLine}\n//\nnote("${seq.join(" ")}").sound("${transformedSound}")\n// \n//`;
        }
    }

    /**
     * Transforms sound names from parentheses format to colon format
     * Examples:
     * - "gm_slap_bass_1(4)" -> "gm_slap_bass_1:0"
     * - "piano" -> "piano" (unchanged)
     * 
     * @param {string} soundName - The sound name to transform
     * @returns {string} The transformed sound name
     */
    transformSoundName(soundName) {
        // Check if the sound name has parentheses format
        const parenMatch = soundName.match(/^(.+)\(\d+\)$/);
        
        if (parenMatch) {
            // Transform parentheses format to colon format
            // e.g., "gm_slap_bass_1(4)" -> "gm_slap_bass_1:0"
            return `${parenMatch[1]}:0`;
        }
        
        // Return unchanged if no parentheses
        return soundName;
    }

    /**
     * Injects the generated Strudel code into the strudel-editor web component
     * Uses multiple fallback methods to accommodate different implementations:
     * 1. setCode() method - if the component provides this API
     * 2. value property - common web component pattern
     * 3. CodeMirror integration - for code editors
     * 4. textarea/contenteditable - basic HTML inputs
     * 5. Shadow DOM access - for encapsulated components
     * 6. Custom events - fallback communication method
     * 
     * @param {string} code - The Strudel code to inject
     */
    injectIntoStrudelEditor(code) {
        try {
            // Find the strudel-editor component
            const strudelEditor = document.querySelector('strudel-editor');
            
            if (!strudelEditor) {
                console.warn('Strudel editor not found on page');
                this.showFeedback('Strudel editor not found', 'warning');
                return;
            }

            // Enhanced debugging - let's see what we're working with
            console.log('=== STRUDEL EDITOR DEBUG INFO ===');
            console.log('Strudel editor element:', strudelEditor);
            console.log('Element tag name:', strudelEditor.tagName);
            console.log('Element class list:', Array.from(strudelEditor.classList));
            console.log('Element id:', strudelEditor.id);
            
            // Check all properties and methods
            const allProps = [];
            let current = strudelEditor;
            while (current && current !== HTMLElement.prototype) {
                allProps.push(...Object.getOwnPropertyNames(current));
                current = Object.getPrototypeOf(current);
            }
            const uniqueProps = [...new Set(allProps)];
            const methods = uniqueProps.filter(prop => {
                try {
                    return typeof strudelEditor[prop] === 'function';
                } catch (e) {
                    return false;
                }
            });
            const properties = uniqueProps.filter(prop => {
                try {
                    return typeof strudelEditor[prop] !== 'function' && prop !== 'constructor';
                } catch (e) {
                    return false;
                }
            });
            
            console.log('Available methods:', methods.sort());
            console.log('Available properties:', properties.sort());
            
            // Check for common editor properties
            console.log('Has value property:', 'value' in strudelEditor);
            console.log('Has textContent:', 'textContent' in strudelEditor);
            console.log('Has innerHTML:', 'innerHTML' in strudelEditor);
            console.log('Has shadowRoot:', !!strudelEditor.shadowRoot);
            console.log('Shadow root mode:', strudelEditor.shadowRoot ? strudelEditor.shadowRoot.mode : 'none');
            
            // Check children
            console.log('Direct children count:', strudelEditor.children.length);
            console.log('Direct children:', Array.from(strudelEditor.children).map(child => ({ 
                tag: child.tagName, 
                class: Array.from(child.classList),
                id: child.id 
            })));

            // Method 1: Try to set the code using common web component patterns
            if (typeof strudelEditor.setCode === 'function') {
                strudelEditor.setCode(code);
                console.log('Code injected into Strudel editor using setCode()');
                this.showFeedback('Code injected into Strudel REPL!', 'success');
                return;
            }

            // Method 1b: Try other common method names
            const commonMethodNames = ['setValue', 'setText', 'setContent', 'setEditorContent', 'updateCode', 'replaceContent'];
            for (const methodName of commonMethodNames) {
                if (typeof strudelEditor[methodName] === 'function') {
                    try {
                        strudelEditor[methodName](code);
                        console.log(`Code injected into Strudel editor using ${methodName}()`);
                        this.showFeedback('Code injected into Strudel REPL!', 'success');
                        return;
                    } catch (e) {
                        console.log(`Failed to use ${methodName}():`, e);
                    }
                }
            }

            // Method 2: Try to set the value property
            if ('value' in strudelEditor) {
                try {
                    strudelEditor.value = code;
                    console.log('Code injected into Strudel editor using value property');
                    this.showFeedback('Code injected into Strudel REPL!', 'success');
                    return;
                } catch (e) {
                    console.log('Failed to set value property:', e);
                }
            }

            // Method 2b: Try other common property names
            const commonPropertyNames = ['content', 'text', 'editorContent', 'code'];
            for (const propName of commonPropertyNames) {
                if (propName in strudelEditor) {
                    try {
                        const originalValue = strudelEditor[propName];
                        strudelEditor[propName] = code;
                        console.log(`Code injected into Strudel editor using ${propName} property`);
                        
                        // Try to trigger UI update after setting the property
                        this.triggerStrudelEditorUpdate(strudelEditor, code);
                        
                        // Verify the change took effect
                        if (strudelEditor[propName] === code) {
                            this.showFeedback('Code injected into Strudel REPL!', 'success');
                            return;
                        } else {
                            console.log(`${propName} property was set but value didn't stick, trying other methods...`);
                        }
                    } catch (e) {
                        console.log(`Failed to set ${propName} property:`, e);
                    }
                }
            }

            // Method 3: Look for CodeMirror or other editor elements in DOM
            console.log('=== SEARCHING FOR EDITOR ELEMENTS ===');
            const editorSelectors = [
                '.cm-content', '.cm-editor', '.CodeMirror', 'textarea', '[contenteditable]',
                '.monaco-editor', '.ace_editor', '.view-lines', '.cm-focused'
            ];
            
            for (const selector of editorSelectors) {
                const codeElement = strudelEditor.querySelector(selector);
                console.log(`Searching for ${selector}:`, codeElement);
                
                if (codeElement) {
                    console.log(`Found element with selector ${selector}:`, {
                        tag: codeElement.tagName,
                        classes: Array.from(codeElement.classList),
                        id: codeElement.id,
                        contentEditable: codeElement.contentEditable,
                        value: codeElement.value
                    });
                    
                    // Try CodeMirror 6 approach
                    if (codeElement.classList.contains('cm-content')) {
                        // Multiple ways to access CodeMirror
                        const cmView = codeElement.cmView?.view || 
                                     codeElement.closest('.cm-editor')?.cmView?.view ||
                                     window.cmView; // fallback to global
                        
                        console.log('CodeMirror view found:', cmView);
                        
                        if (cmView && cmView.dispatch) {
                            try {
                                cmView.dispatch({
                                    changes: {
                                        from: 0,
                                        to: cmView.state.doc.length,
                                        insert: code
                                    }
                                });
                                console.log('Code injected into Strudel editor using CodeMirror 6');
                                this.showFeedback('Code injected into Strudel REPL!', 'success');
                                return;
                            } catch (e) {
                                console.log('Failed to use CodeMirror dispatch:', e);
                            }
                        }
                    }
                    
                    // Try textarea
                    if (codeElement.tagName === 'TEXTAREA') {
                        try {
                            codeElement.value = code;
                            codeElement.dispatchEvent(new Event('input', { bubbles: true }));
                            codeElement.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('Code injected into Strudel editor using textarea');
                            this.showFeedback('Code injected into Strudel REPL!', 'success');
                            return;
                        } catch (e) {
                            console.log('Failed to set textarea value:', e);
                        }
                    }
                    
                    // Try contenteditable
                    if (codeElement.contentEditable === 'true') {
                        try {
                            codeElement.textContent = code;
                            codeElement.dispatchEvent(new Event('input', { bubbles: true }));
                            codeElement.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log('Code injected into Strudel editor using contenteditable');
                            this.showFeedback('Code injected into Strudel REPL!', 'success');
                            return;
                        } catch (e) {
                            console.log('Failed to set contenteditable content:', e);
                        }
                    }
                }
            }

            // Method 4: Try accessing shadow DOM if available
            if (strudelEditor.shadowRoot) {
                console.log('=== SEARCHING SHADOW DOM ===');
                const shadowRoot = strudelEditor.shadowRoot;
                console.log('Shadow root contents:', shadowRoot.innerHTML);
                
                for (const selector of editorSelectors) {
                    const shadowElement = shadowRoot.querySelector(selector);
                    console.log(`Shadow DOM search for ${selector}:`, shadowElement);
                    
                    if (shadowElement) {
                        // Try the same approaches as above
                        if (shadowElement.tagName === 'TEXTAREA') {
                            try {
                                shadowElement.value = code;
                                shadowElement.dispatchEvent(new Event('input', { bubbles: true }));
                                shadowElement.dispatchEvent(new Event('change', { bubbles: true }));
                                console.log('Code injected into Strudel editor using shadow DOM textarea');
                                this.showFeedback('Code injected into Strudel REPL!', 'success');
                                return;
                            } catch (e) {
                                console.log('Failed to set shadow textarea value:', e);
                            }
                        }
                        
                        if (shadowElement.contentEditable === 'true') {
                            try {
                                shadowElement.textContent = code;
                                shadowElement.dispatchEvent(new Event('input', { bubbles: true }));
                                shadowElement.dispatchEvent(new Event('change', { bubbles: true }));
                                console.log('Code injected into Strudel editor using shadow DOM contenteditable');
                                this.showFeedback('Code injected into Strudel REPL!', 'success');
                                return;
                            } catch (e) {
                                console.log('Failed to set shadow contenteditable content:', e);
                            }
                        }
                    }
                }
            }

            // Method 5: Try to dispatch custom events
            console.log('=== TRYING CUSTOM EVENTS ===');
            const eventNames = ['strudel-set-code', 'setCode', 'setValue', 'updateContent'];
            for (const eventName of eventNames) {
                try {
                    const customEvent = new CustomEvent(eventName, { 
                        detail: { code: code },
                        bubbles: true 
                    });
                    strudelEditor.dispatchEvent(customEvent);
                    console.log(`Dispatched ${eventName} event to Strudel editor`);
                } catch (e) {
                    console.log(`Failed to dispatch ${eventName} event:`, e);
                }
            }

            // Method 6: Try setting innerHTML/textContent directly on the editor
            console.log('=== TRYING DIRECT CONTENT SETTING ===');
            try {
                if (strudelEditor.textContent !== undefined) {
                    const originalContent = strudelEditor.textContent;
                    strudelEditor.textContent = code;
                    console.log('Set textContent directly on strudel-editor');
                    
                    // Try to trigger change events
                    strudelEditor.dispatchEvent(new Event('input', { bubbles: true }));
                    strudelEditor.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // If it worked, show success
                    if (strudelEditor.textContent === code) {
                        this.showFeedback('Code injected into Strudel REPL!', 'success');
                        return;
                    } else {
                        console.log('textContent was set but reverted');
                        strudelEditor.textContent = originalContent; // restore
                    }
                }
            } catch (e) {
                console.log('Failed to set textContent:', e);
            }

            console.log('=== NO COMPATIBLE INTERFACE FOUND ===');
            console.warn('Could not inject code into Strudel editor - no compatible interface found');
            this.showFeedback('Could not inject into Strudel REPL - check console for debug info', 'warning');
            
        } catch (error) {
            console.error('Error injecting code into Strudel editor:', error);
            this.showFeedback('Error injecting into Strudel REPL', 'error');
        }
    }

    showFeedback(message, type = 'info') {
        // Create a feedback element if it doesn't exist
        let feedbackElement = document.querySelector('#strudel-coder-feedback');
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'strudel-coder-feedback';
            feedbackElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 4px;
                color: white;
                font-size: 14px;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            `;
            document.body.appendChild(feedbackElement);
        }

        // Set the message and styling based on type
        feedbackElement.textContent = message;
        switch (type) {
            case 'success':
                feedbackElement.style.backgroundColor = '#4CAF50';
                break;
            case 'warning':
                feedbackElement.style.backgroundColor = '#FF9800';
                break;
            case 'error':
                feedbackElement.style.backgroundColor = '#f44336';
                break;
            default:
                feedbackElement.style.backgroundColor = '#2196F3';
        }

        // Show the feedback
        feedbackElement.style.opacity = '1';

        // Hide after 3 seconds
        setTimeout(() => {
            feedbackElement.style.opacity = '0';
        }, 3000);
    }

    // Method for handling keyboard shortcuts (spacebar to clear)
    handleKeyPress(event) {
        const { key } = event;

        if (key === ' ' || key === 'Spacebar') { // Spacebar
            event.preventDefault();
            this.clearNotes();
        }
    }

    /**
     * Attempts to trigger a UI update in the strudel-editor after setting code programmatically
     * @param {HTMLElement} strudelEditor - The strudel-editor element
     * @param {string} code - The code that was set
     */
    triggerStrudelEditorUpdate(strudelEditor, code) {
        console.log('=== ATTEMPTING TO TRIGGER STRUDEL EDITOR UI UPDATE ===');
        
        try {
            // Method 1: Try to access the editor property (might be CodeMirror instance)
            if ('editor' in strudelEditor && strudelEditor.editor) {
                console.log('Found editor property:', strudelEditor.editor);
                
                // If it's a CodeMirror instance
                if (strudelEditor.editor.setValue && typeof strudelEditor.editor.setValue === 'function') {
                    try {
                        strudelEditor.editor.setValue(code);
                        console.log('Set code using editor.setValue()');
                        return true;
                    } catch (e) {
                        console.log('Failed to use editor.setValue():', e);
                    }
                }
                
                // If it's a CodeMirror 6 instance
                if (strudelEditor.editor.dispatch && strudelEditor.editor.state) {
                    try {
                        strudelEditor.editor.dispatch({
                            changes: {
                                from: 0,
                                to: strudelEditor.editor.state.doc.length,
                                insert: code
                            }
                        });
                        console.log('Set code using editor.dispatch() (CodeMirror 6)');
                        return true;
                    } catch (e) {
                        console.log('Failed to use editor.dispatch():', e);
                    }
                }
                
                // Try other common editor methods
                const editorMethods = ['replaceRange', 'setDoc', 'setValue', 'setText', 'setContent'];
                for (const method of editorMethods) {
                    if (strudelEditor.editor[method] && typeof strudelEditor.editor[method] === 'function') {
                        try {
                            if (method === 'replaceRange') {
                                // CodeMirror replaceRange needs from/to positions
                                strudelEditor.editor.replaceRange(code, {line: 0, ch: 0}, {line: Infinity, ch: Infinity});
                            } else {
                                strudelEditor.editor[method](code);
                            }
                            console.log(`Set code using editor.${method}()`);
                            return true;
                        } catch (e) {
                            console.log(`Failed to use editor.${method}():`, e);
                        }
                    }
                }
            }

            // Method 2: Try to find and update CodeMirror instances directly
            const cmSelectors = ['.cm-content', '.cm-editor', '.CodeMirror'];
            for (const selector of cmSelectors) {
                const cmElement = strudelEditor.querySelector(selector);
                if (cmElement) {
                    // Try CodeMirror 6
                    if (cmElement.cmView && cmElement.cmView.view) {
                        try {
                            const view = cmElement.cmView.view;
                            view.dispatch({
                                changes: {
                                    from: 0,
                                    to: view.state.doc.length,
                                    insert: code
                                }
                            });
                            console.log('Updated via CodeMirror 6 view dispatch');
                            return true;
                        } catch (e) {
                            console.log('Failed CodeMirror 6 update:', e);
                        }
                    }
                    
                    // Try CodeMirror 5
                    if (cmElement.CodeMirror) {
                        try {
                            cmElement.CodeMirror.setValue(code);
                            console.log('Updated via CodeMirror 5 setValue');
                            return true;
                        } catch (e) {
                            console.log('Failed CodeMirror 5 update:', e);
                        }
                    }
                }
            }

            // Method 3: Dispatch various update events
            const updateEvents = [
                { name: 'input', init: { bubbles: true } },
                { name: 'change', init: { bubbles: true } },
                { name: 'update', init: { bubbles: true } },
                { name: 'code-changed', init: { bubbles: true, detail: { code } } },
                { name: 'editor-update', init: { bubbles: true, detail: { value: code } } },
                { name: 'strudel-update', init: { bubbles: true, detail: { code } } }
            ];
            
            console.log('Dispatching update events...');
            for (const event of updateEvents) {
                try {
                    const customEvent = event.init.detail ? 
                        new CustomEvent(event.name, event.init) : 
                        new Event(event.name, event.init);
                    strudelEditor.dispatchEvent(customEvent);
                    console.log(`Dispatched ${event.name} event`);
                } catch (e) {
                    console.log(`Failed to dispatch ${event.name}:`, e);
                }
            }

            // Method 4: Try calling common update methods on the element itself
            const updateMethods = [
                'update', 'refresh', 'render', 'redraw', 'repaint', 
                'requestUpdate', 'forceUpdate', 'invalidate'
            ];
            
            for (const method of updateMethods) {
                if (typeof strudelEditor[method] === 'function') {
                    try {
                        strudelEditor[method]();
                        console.log(`Called ${method}() on strudel-editor`);
                    } catch (e) {
                        console.log(`Failed to call ${method}():`, e);
                    }
                }
            }

            // Method 5: Try to trigger attribute changes (for web components)
            try {
                const currentCode = strudelEditor.getAttribute('code');
                strudelEditor.setAttribute('code', code);
                console.log('Set code attribute');
                
                // If the attribute didn't change, try removing and re-adding
                if (currentCode === code) {
                    strudelEditor.removeAttribute('code');
                    // Use setTimeout to ensure the removal is processed
                    setTimeout(() => {
                        strudelEditor.setAttribute('code', code);
                        console.log('Re-set code attribute after removal');
                    }, 0);
                }
            } catch (e) {
                console.log('Failed to set code attribute:', e);
            }

            // Method 6: Try forcing a re-render by temporarily modifying innerHTML
            try {
                const originalHTML = strudelEditor.innerHTML;
                console.log('Original innerHTML:', originalHTML);
                
                // If there's a comment with the code, update it
                const codeCommentRegex = /<!--\s*[\s\S]*?\s*-->/;
                if (codeCommentRegex.test(originalHTML)) {
                    const newHTML = originalHTML.replace(codeCommentRegex, `<!--\n${code}\n-->`);
                    if (newHTML !== originalHTML) {
                        strudelEditor.innerHTML = newHTML;
                        console.log('Updated innerHTML with new code comment');
                        return true;
                    }
                } else {
                    // Try adding the code as a comment
                    const newHTML = `<!--\n${code}\n-->${originalHTML}`;
                    strudelEditor.innerHTML = newHTML;
                    console.log('Added code as comment to innerHTML');
                    // Restore if it doesn't work
                    setTimeout(() => {
                        if (strudelEditor.innerHTML === newHTML) {
                            strudelEditor.innerHTML = originalHTML;
                        }
                    }, 1000);
                }
            } catch (e) {
                console.log('Failed to modify innerHTML:', e);
            }

            console.log('All update methods attempted');
            return false;
            
        } catch (error) {
            console.error('Error in triggerStrudelEditorUpdate:', error);
            return false;
        }
    }
} 