// Main JavaScript file for the MIDI Strudel Interface 

// Musical constants
const GLOBAL_NOTE_NAMES = {
    48: 'C', 49: 'C#', 50: 'D', 51: 'D#', 52: 'E', 53: 'F',
    54: 'F#', 55: 'G', 56: 'G#', 57: 'A', 58: 'A#', 59: 'B'
}; // Represents C3-B3

const GLOBAL_SCALE_DEFINITIONS = {
    'pentatonic': [0, 2, 4, 7, 9],
    'major': [0, 2, 4, 5, 7, 9, 11],
    'natural-minor': [0, 2, 3, 5, 7, 8, 10],
    'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
    'melodic-minor': [0, 2, 3, 5, 7, 9, 11],
    'diminished': [0, 2, 3, 5, 6, 8, 9, 11],
    'bhairav': [0, 1, 4, 5, 7, 8, 11],
    'bhairavi': [0, 1, 3, 5, 6, 8, 10],
    'yaman': [0, 2, 4, 6, 7, 9, 11],
    'kafi': [0, 2, 3, 5, 7, 9, 10],
    'asavari': [0, 2, 3, 5, 7, 8, 10],
    'todi': [0, 1, 3, 6, 7, 8, 11],
    'purvi': [0, 1, 4, 6, 7, 8, 11],
    'marwa': [0, 1, 4, 6, 7, 9, 11],
    'khamaj': [0, 2, 4, 5, 7, 9, 10],
    'kalyan': [0, 2, 4, 6, 7, 9, 11],
    'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

// Global musical context state
let currentGlobalTonic = 48; // Default to C (MIDI note 48 from the new GLOBAL_NOTE_NAMES)
let currentGlobalScale = 'pentatonic'; // Default to Pentatonic

// Main Application Controller Object
const mainController = {
    getCurrentGlobalTonic: () => currentGlobalTonic,
    getCurrentGlobalScale: () => currentGlobalScale,
    getGlobalScaleDefinition: (scaleKey) => GLOBAL_SCALE_DEFINITIONS[scaleKey],
    getNoteName: (midiNote) => {
        // This function needs to map any MIDI note to a name with octave
        // For now, it can use a more generic mapping if the note is outside GLOBAL_NOTE_NAMES range
        if (GLOBAL_NOTE_NAMES[midiNote]) return GLOBAL_NOTE_NAMES[midiNote]; // For the base octave of global selector
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteIndex = midiNote % 12;
        return noteNames[noteIndex] + octave;
    },
    // Placeholder for AudioEngine access
    audioEngine: null 
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // Get status elements
    const midiStatusElement = document.getElementById('midi-status');
    const audioStatusElement = document.getElementById('audio-status'); // Added audio status element
    const generalStatusElement = document.getElementById('general-status');

    if (generalStatusElement) generalStatusElement.innerHTML = '<p>Loading application...</p>';

    // Get global control elements
    const globalTonicSelector = document.getElementById('globalTonicSelector');
    const globalScaleSelector = document.getElementById('globalScaleSelector');



    function populateGlobalSelectors() {
        // Populate Tonic Selector
        if (globalTonicSelector) {
            // Clear existing options before repopulating, if any (e.g., if called multiple times)
            globalTonicSelector.innerHTML = ''; 
            for (const midiNote in GLOBAL_NOTE_NAMES) {
                const option = document.createElement('option');
                option.value = midiNote;
                option.textContent = GLOBAL_NOTE_NAMES[midiNote];
                globalTonicSelector.appendChild(option);
            }
            globalTonicSelector.value = currentGlobalTonic.toString(); // Set initial value
        }

        // Populate Scale Selector
        if (globalScaleSelector) {
            // Clear existing options before repopulating, if any
            globalScaleSelector.innerHTML = ''; 
            for (const scaleKey in GLOBAL_SCALE_DEFINITIONS) {
                const option = document.createElement('option');
                option.value = scaleKey;
                option.textContent = scaleKey.charAt(0).toUpperCase() + scaleKey.slice(1);
                globalScaleSelector.appendChild(option);
            }
            globalScaleSelector.value = currentGlobalScale; // Set initial value
        }
    }

    populateGlobalSelectors();

    // Initialize Strudel Coder
    const strudelCoderInstance = new StrudelCoder('strudelCoderContainer');
    console.log("StrudelCoder module loaded.");

    // Add debug info for strudel integration
    setTimeout(() => {
        inspectStrudelEditor();
    }, 2000); // Give time for strudel-editor to initialize

    /**
     * Inspect the Strudel editor to understand its structure and available methods
     */
    function inspectStrudelEditor() {
        const strudelEditor = document.querySelector('strudel-editor');
        if (strudelEditor) {
            console.log("Strudel REPL integration detected:", strudelEditor);
            
            // Log direct properties and methods
            const directMethods = Object.getOwnPropertyNames(strudelEditor).filter(name => typeof strudelEditor[name] === 'function');
            console.log("Direct methods:", directMethods);
            
            // Log prototype methods
            const prototypeMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(strudelEditor)).filter(name => typeof strudelEditor[name] === 'function');
            console.log("Prototype methods:", prototypeMethods);
            
            // Check for REPL instance
            if (strudelEditor.repl) {
                console.log("REPL instance found:", strudelEditor.repl);
                const replMethods = Object.getOwnPropertyNames(strudelEditor.repl).filter(name => typeof strudelEditor.repl[name] === 'function');
                console.log("REPL methods:", replMethods);
            }
            
            // Check for editor instance
            if (strudelEditor.editor) {
                console.log("Editor instance found:", strudelEditor.editor);
                const editorMethods = Object.getOwnPropertyNames(strudelEditor.editor).filter(name => typeof strudelEditor.editor[name] === 'function');
                console.log("Editor methods:", editorMethods);
            }
            
            // Check shadow DOM
            if (strudelEditor.shadowRoot) {
                console.log("Shadow DOM detected");
                const playButtons = strudelEditor.shadowRoot.querySelectorAll('button');
                console.log("Shadow DOM buttons:", playButtons);
            }
            
            // Check for global Strudel functions
            const globalStrudelFunctions = ['play', 'stop', 'hush', 'evaluate', 'start', 'run', 'begin', 'trigger', 'commence'].filter(name => typeof window[name] === 'function');
            console.log("Global Strudel functions:", globalStrudelFunctions);
            
            // Check for any function that might be related to playback
            const allGlobalFunctions = Object.getOwnPropertyNames(window).filter(name => {
                try {
                    return typeof window[name] === 'function' && 
                           (name.toLowerCase().includes('play') || 
                            name.toLowerCase().includes('start') || 
                            name.toLowerCase().includes('run') || 
                            name.toLowerCase().includes('eval'));
                } catch (e) {
                    return false;
                }
            });
            console.log("All potential playback functions:", allGlobalFunctions);
            
            // Check for global repl object and its methods
            if (window.repl) {
                console.log("Global repl object found:", window.repl);
                const replMethods = Object.getOwnPropertyNames(window.repl).filter(name => typeof window.repl[name] === 'function');
                console.log("Global repl methods:", replMethods);
                
                // Also check prototype methods (with error handling for strict mode)
                try {
                    const replPrototypeMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.repl)).filter(name => {
                        try {
                            return typeof window.repl[name] === 'function';
                        } catch (e) {
                            return false; // Skip properties that can't be accessed in strict mode
                        }
                    });
                    console.log("Global repl prototype methods:", replPrototypeMethods);
                } catch (e) {
                    console.log("Could not inspect repl prototype methods (strict mode limitation)");
                }
            } else {
                console.log("No global repl object found");
            }
            
        } else {
            console.warn("Strudel REPL integration not found - make sure the @strudel/repl script has loaded");
        }
    }

    // Add event listener for Copy Strudel Syntax button
    const copyStrudelSyntaxButton = document.getElementById('copyStrudelSyntax');
    if (copyStrudelSyntaxButton) {
        copyStrudelSyntaxButton.addEventListener('click', () => {
            copyStrudelEditorContent();
        });
    }

    // Add event listener for Open in Strudel.cc link
    const strudelDocsLink = document.getElementById('strudelDocsLink');
    if (strudelDocsLink) {
        strudelDocsLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            openInStrudelCC();
        });
    }

    /**
     * Copies the current content of the strudel-editor to the clipboard
     */
    async function copyStrudelEditorContent() {
        try {
            const strudelEditor = document.querySelector('strudel-editor');
            if (!strudelEditor) {
                showCopyFeedback('Strudel editor not found', 'error');
                return;
            }

            let content = '';
            
            // Method 1: Try to get content from common properties
            const contentProperties = ['code', 'value', 'content', 'text', 'textContent'];
            for (const prop of contentProperties) {
                if (prop in strudelEditor && strudelEditor[prop]) {
                    content = strudelEditor[prop];
                    console.log(`Found content using property: ${prop}`);
                    break;
                }
            }

            // Method 2: Try to get content from editor instance
            if (!content && 'editor' in strudelEditor && strudelEditor.editor) {
                const editor = strudelEditor.editor;
                if (editor.getValue && typeof editor.getValue === 'function') {
                    content = editor.getValue();
                    console.log('Found content using editor.getValue()');
                } else if (editor.state && editor.state.doc) {
                    content = editor.state.doc.toString();
                    console.log('Found content using editor.state.doc');
                }
            }

            // Method 3: Try to extract from DOM elements
            if (!content) {
                const editorSelectors = ['.cm-content', '.cm-editor', 'textarea', '[contenteditable]'];
                for (const selector of editorSelectors) {
                    const element = strudelEditor.querySelector(selector);
                    if (element) {
                        content = element.textContent || element.value || '';
                        if (content) {
                            console.log(`Found content using selector: ${selector}`);
                            break;
                        }
                    }
                }
            }

            // Method 4: Try shadow DOM
            if (!content && strudelEditor.shadowRoot) {
                const shadowSelectors = ['.cm-content', '.cm-editor', 'textarea', '[contenteditable]'];
                for (const selector of shadowSelectors) {
                    const element = strudelEditor.shadowRoot.querySelector(selector);
                    if (element) {
                        content = element.textContent || element.value || '';
                        if (content) {
                            console.log(`Found content in shadow DOM using selector: ${selector}`);
                            break;
                        }
                    }
                }
            }

            // Method 5: Fallback to innerHTML parsing (remove HTML comments)
            if (!content) {
                const innerHTML = strudelEditor.innerHTML;
                // Extract content from HTML comments (common pattern for strudel-editor)
                const commentMatch = innerHTML.match(/<!--\s*([\s\S]*?)\s*-->/);
                if (commentMatch && commentMatch[1]) {
                    content = commentMatch[1].trim();
                    console.log('Found content in HTML comment');
                } else {
                    // Try getting just the text content
                    content = strudelEditor.textContent || '';
                    console.log('Using fallback textContent');
                }
            }

            if (!content || content.trim() === '') {
                showCopyFeedback('No content found to copy', 'warning');
                return;
            }

            // Copy to clipboard
            await navigator.clipboard.writeText(content);
            showCopyFeedback('Strudel syntax copied to clipboard!', 'success');
            console.log('Copied to clipboard:', content);

        } catch (error) {
            console.error('Error copying strudel content:', error);
            showCopyFeedback('Failed to copy content', 'error');
        }
    }

    /**
     * Opens strudel.cc with the current editor content injected
     */
    async function openInStrudelCC() {
        try {
            const strudelEditor = document.querySelector('strudel-editor');
            if (!strudelEditor) {
                showCopyFeedback('Strudel editor not found', 'error');
                return;
            }

            let content = '';
            
            // Use the same content extraction logic as copyStrudelEditorContent
            // Method 1: Try to get content from common properties
            const contentProperties = ['code', 'value', 'content', 'text', 'textContent'];
            for (const prop of contentProperties) {
                if (prop in strudelEditor && strudelEditor[prop]) {
                    content = strudelEditor[prop];
                    console.log(`Found content using property: ${prop}`);
                    break;
                }
            }

            // Method 2: Try to get content from editor instance
            if (!content && 'editor' in strudelEditor && strudelEditor.editor) {
                const editor = strudelEditor.editor;
                if (editor.getValue && typeof editor.getValue === 'function') {
                    content = editor.getValue();
                    console.log('Found content using editor.getValue()');
                } else if (editor.state && editor.state.doc) {
                    content = editor.state.doc.toString();
                    console.log('Found content using editor.state.doc');
                }
            }

            // Method 3: Try to extract from DOM elements
            if (!content) {
                const editorSelectors = ['.cm-content', '.cm-editor', 'textarea', '[contenteditable]'];
                for (const selector of editorSelectors) {
                    const element = strudelEditor.querySelector(selector);
                    if (element) {
                        content = element.textContent || element.value || '';
                        if (content) {
                            console.log(`Found content using selector: ${selector}`);
                            break;
                        }
                    }
                }
            }

            // Method 4: Try shadow DOM
            if (!content && strudelEditor.shadowRoot) {
                const shadowSelectors = ['.cm-content', '.cm-editor', 'textarea', '[contenteditable]'];
                for (const selector of shadowSelectors) {
                    const element = strudelEditor.shadowRoot.querySelector(selector);
                    if (element) {
                        content = element.textContent || element.value || '';
                        if (content) {
                            console.log(`Found content in shadow DOM using selector: ${selector}`);
                            break;
                        }
                    }
                }
            }

            // Method 5: Fallback to innerHTML parsing (remove HTML comments)
            if (!content) {
                const innerHTML = strudelEditor.innerHTML;
                // Extract content from HTML comments (common pattern for strudel-editor)
                const commentMatch = innerHTML.match(/<!--\s*([\s\S]*?)\s*-->/);
                if (commentMatch && commentMatch[1]) {
                    content = commentMatch[1].trim();
                    console.log('Found content in HTML comment');
                } else {
                    // Try getting just the text content
                    content = strudelEditor.textContent || '';
                    console.log('Using fallback textContent');
                }
            }

            if (!content || content.trim() === '') {
                showCopyFeedback('No content found to open in Strudel.cc', 'warning');
                return;
            }

            // Encode the content as base64 for the URL
            const encodedContent = btoa(content);
            const strudelUrl = `https://strudel.cc/#${encodedContent}`;
            
            // Open in new tab
            window.open(strudelUrl, '_blank');
            showCopyFeedback('Opened in Strudel.cc!', 'success');
            console.log('Opened Strudel.cc with content:', content);

        } catch (error) {
            console.error('Error opening in Strudel.cc:', error);
            showCopyFeedback('Failed to open in Strudel.cc', 'error');
        }
    }

    /**
     * Shows feedback message for copy operations
     */
    function showCopyFeedback(message, type = 'info') {
        // Create or reuse feedback element
        let feedbackElement = document.querySelector('#copy-strudel-feedback');
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'copy-strudel-feedback';
            feedbackElement.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
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

        // Set message and styling
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

        // Show feedback
        feedbackElement.style.opacity = '1';

        // Hide after 3 seconds
        setTimeout(() => {
            feedbackElement.style.opacity = '0';
        }, 3000);
    }

    // Initialize XYPad
    const xyPadInstance = new XYPad('xyPadContainer', mainController);
    console.log("XYPad module loaded.");

    // Initialize MIDI Handler
    const midiHandler = new MidiHandler();
    midiHandler.setDebugMode(true); // Enable for debugging device detection

    const audioEngine = new AudioEngine(); // Instantiate AudioEngine
    mainController.audioEngine = audioEngine; // Make it available via mainController

    // Add event listeners for global selectors
    if (globalTonicSelector) {
        globalTonicSelector.addEventListener('change', (event) => {
            currentGlobalTonic = parseInt(event.target.value, 10);
            console.log("Global Tonic Changed:", currentGlobalTonic, mainController.getNoteName(currentGlobalTonic));
            if (xyPadInstance) xyPadInstance.updateMusicalContext();
            // Update visual keyboard
            if (visualKeyboardInstance) {
                const scaleIntervals = GLOBAL_SCALE_DEFINITIONS[currentGlobalScale];
                if (scaleIntervals) {
                    visualKeyboardInstance.updatePlayableKeys(currentGlobalTonic, scaleIntervals);
                }
            }
            // TODO: Notify other relevant components (e.g. CircularScale)
        });
    }

    if (globalScaleSelector) {
        globalScaleSelector.addEventListener('change', (event) => {
            currentGlobalScale = event.target.value;
            console.log("Global Scale Changed:", currentGlobalScale);
            if (xyPadInstance) xyPadInstance.updateMusicalContext();
            // Update visual keyboard
            if (visualKeyboardInstance) {
                const scaleIntervals = GLOBAL_SCALE_DEFINITIONS[currentGlobalScale];
                if (scaleIntervals) {
                    visualKeyboardInstance.updatePlayableKeys(currentGlobalTonic, scaleIntervals);
                }
            }
            // TODO: Notify other relevant components (e.g. CircularScale)
        });
    }

    // Callback for VisualKeyboard to inform main.js about a key press
    // This allows main.js to decide which modules react to UI keyboard notes
    const visualKeyboardNoteOn = (midiNote, velocity, deviceName) => {
        console.log(`VisualKeyboard NoteOn: ${midiNote}, Vel: ${velocity}, Device: ${deviceName}`);
        // For now, let's make it directly try to capture in StrudelCoder
        // We can add more sophisticated filtering/routing later, e.g., based on StrudelCoder's selected device
        if (strudelCoderInstance) {
            // To make it behave like the Yamaha Reface CP for Strudel, we might check if Strudel
            // is set to listen to a specific device or "All Devices".
            // For now, we pass the simulated deviceName "VisualKeyboard". StrudelCoder's logic will handle it.
            strudelCoderInstance.captureNote(midiNote, velocity, deviceName, "internal-visual-keyboard");
        }
    };

    const visualKeyboardInstance = new VisualKeyboard('pianoKeyboardContainer', audioEngine, visualKeyboardNoteOn);
    console.log("VisualKeyboard module loaded.");

    // Initial update for visual keyboard based on default tonic/scale
    if (visualKeyboardInstance && globalTonicSelector && globalScaleSelector) {
        const initialTonic = parseInt(globalTonicSelector.value, 10);
        const initialScaleKey = globalScaleSelector.value;
        const initialScaleIntervals = GLOBAL_SCALE_DEFINITIONS[initialScaleKey];
        if (initialScaleIntervals) {
            visualKeyboardInstance.updatePlayableKeys(initialTonic, initialScaleIntervals);
        }
    }

    async function initializeApp() {
        try {
            if (audioStatusElement) audioStatusElement.innerHTML = '<p>Initializing Audio...</p>';
            await audioEngine.initialize();
            if (audioStatusElement) audioStatusElement.innerHTML = '<p style="color:green;">Audio Initialized.</p>';
            if (xyPadInstance) xyPadInstance.setAudioEngine(audioEngine); // Provide XYPad with AudioEngine

            if (midiStatusElement) midiStatusElement.innerHTML = '<p>Initializing MIDI...</p>';
            await midiHandler.initialize();
            if (midiStatusElement) midiStatusElement.innerHTML = '<p style="color:green;">MIDI Initialized.</p>';
            if (generalStatusElement) generalStatusElement.innerHTML = '<p style="color:green;">Application Ready.</p>';

            // Update StrudelCoder with real MIDI devices
            if (strudelCoderInstance && midiHandler.isAvailable()) {
                strudelCoderInstance.updateAvailableDevices(midiHandler);
                console.log("StrudelCoder updated with actual MIDI devices.");
                
                // Set up device list change callback to update StrudelCoder when devices connect/disconnect
                midiHandler.setDeviceListChangeCallback(() => {
                    console.log("MIDI device list changed, updating StrudelCoder...");
                    strudelCoderInstance.updateAvailableDevices(midiHandler);
                });
            } else {
                console.warn("StrudelCoder or MidiHandler not available for device update.");
            }

            // Connect XY Pad with Strudel Coder for note capture
            if (xyPadInstance && strudelCoderInstance) {
                xyPadInstance.setStrudelCoder(strudelCoderInstance);
                console.log("XY Pad connected to Strudel Coder for note capture.");
            } else {
                console.warn("XY Pad or Strudel Coder not available for connection.");
            }

            // Set up MIDI note capture for StrudelCoder
            if (midiHandler.isAvailable()) {
                midiHandler.setNoteOnCallback((note, velocity, channel, deviceName, deviceId) => {
                    // Original StrudelCoder capture
                    if (strudelCoderInstance) {
                        strudelCoderInstance.captureNote(note, velocity, deviceName, deviceId);
                    }
                    // Highlight key on visual keyboard
                    if (visualKeyboardInstance) {
                        // Only highlight if it's from a relevant device (e.g., Yamaha Reface CP)
                        // For now, let's highlight for any external MIDI input to see it work,
                        // but this could be filtered by deviceName later.
                        // Example filter: if (deviceName.toLowerCase().includes('reface'))
                        visualKeyboardInstance.highlightKey(note);
                    }
                });
                midiHandler.setControlChangeCallback((cc, value, channel, deviceName, deviceId) => {
                    if (xyPadInstance) xyPadInstance.handleMidiCC(cc, value);
                });
            }
            midiHandler.logDevices(); // Log detected devices for debugging

        } catch (error) {
            console.error("Failed to initialize the application modules:", error);
            if (error.message.toLowerCase().includes('audio')) {
                if (audioStatusElement) audioStatusElement.innerHTML = `<p style="color:red;">Audio Init Failed: ${error.message}</p>`;
            } else if (error.message.toLowerCase().includes('midi')) {
                 if (midiStatusElement) midiStatusElement.innerHTML = `<p style="color:red;">MIDI Init Failed: ${error.message}</p>`;
            }
            if (generalStatusElement) generalStatusElement.innerHTML = '<p style="color:red;">Application failed to load some modules.</p>';
        }
    }

    initializeApp();

    // Global click listener to resume AudioContext if needed
    document.body.addEventListener('click', () => {
        if (audioEngine && audioEngine.isInitialized) {
            audioEngine.ensureContextRunning();
        }
    }, { once: true }); // Only need to try resuming once after first click

    // Setup global key listener for StrudelCoder shortcuts
    document.addEventListener('keydown', (event) => {
        if (strudelCoderInstance && typeof strudelCoderInstance.handleKeyPress === 'function') {
            strudelCoderInstance.handleKeyPress(event);
        }
        // Other global key listeners can be added here
    });

    // Add event listeners for MIDI control buttons
    const refreshMidiButton = document.getElementById('refreshMidiDevices');
    const logMidiButton = document.getElementById('logMidiDevices');

    if (refreshMidiButton) {
        refreshMidiButton.addEventListener('click', async () => {
            if (midiHandler && midiHandler.isAvailable()) {
                console.log("Manual MIDI device refresh triggered");
                await midiHandler.refreshDevices();
            } else {
                console.warn("MIDI handler not available for refresh");
            }
        });
    }

    if (logMidiButton) {
        logMidiButton.addEventListener('click', () => {
            if (midiHandler && midiHandler.isAvailable()) {
                midiHandler.logDevices();
            } else {
                console.warn("MIDI handler not available for logging");
            }
        });
    }

}); 