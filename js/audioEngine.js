class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;

        // Hard-coded synth parameters (previously controlled by global controls)
        this.waveform = 'sine'; // Hard-coded to sawtooth
        this.attackTime = 0.02;
        this.decayTime = 0.02;   // Hard-coded to 0.32 seconds
        this.sustainLevel = 0.33; // Hard-coded to 0.33 (33%)
        this.releaseTime = 0.1;  // Seconds for the tail after note duration
        this.noteBaseGain = 0.36; // Hard-coded to 0.36 gain
        this.filterCutoff = 1000; // Hard-coded to 6469 Hz
        this.filterType = 'lowpass';

        this.activeOscillators = {}; // To manage active notes for noteOff
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = 0.7; // Default master volume
                this.masterGain.connect(this.audioContext.destination);
                this.isInitialized = true;
                console.log('AudioEngine initialized successfully.');
                // Resume context if it's in a suspended state (e.g., due to browser policy)
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log('AudioContext resumed.');
                        resolve(true);
                    }).catch(err => {
                         console.error('Failed to resume AudioContext:', err);
                         reject(err);
                    });
                } else {
                    resolve(true);
                }
            } catch (error) {
                console.error('Failed to initialize AudioEngine:', error);
                this.isInitialized = false;
                reject(error);
            }
        });
    }

    // Ensure audio context is running (call after user interaction)
    ensureContextRunning() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('AudioContext explicitly resumed on interaction.');
            }).catch(err => console.error('Error resuming AudioContext on interaction:', err));
        }
    }

    _midiToFreq(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    // Note: Synth parameter setters removed since parameters are now hard-coded

    playSynthNote(midiNote, velocity, durationSeconds = 0.5) {
        if (!this.isInitialized || !this.audioContext) {
            console.warn('AudioEngine not initialized. Cannot play note.');
            return;
        }
        this.ensureContextRunning(); // Good practice

        const now = this.audioContext.currentTime;

        // Create nodes
        const osc = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        const noteGainNode = this.audioContext.createGain();

        // Configure oscillator
        osc.type = this.waveform;
        osc.frequency.setValueAtTime(this._midiToFreq(midiNote), now);

        // Configure filter
        filter.type = this.filterType;
        filter.frequency.setValueAtTime(this.filterCutoff, now);
        // Q and other filter params can be added later if needed

        // Configure Gain (ADSR-like envelope)
        const mappedVelocity = Math.max(0, Math.min(1, velocity / 127));
        const peakGain = mappedVelocity * this.noteBaseGain;
        const sustainGain = peakGain * this.sustainLevel;

        noteGainNode.gain.setValueAtTime(0, now); // Start at 0
        // Attack phase
        noteGainNode.gain.linearRampToValueAtTime(peakGain, now + this.attackTime);
        // Decay phase to sustain level
        const decayEndTime = now + this.attackTime + this.decayTime;
        noteGainNode.gain.linearRampToValueAtTime(sustainGain, decayEndTime);
        
        // Sustain phase (implicit by holding the value, then releasing)
        // Calculate when release should start based on overall duration
        const sustainEndTime = now + durationSeconds - this.releaseTime;
        if (sustainEndTime > decayEndTime) {
            noteGainNode.gain.setValueAtTime(sustainGain, sustainEndTime); // Hold sustain gain until release
        }

        // Release phase
        noteGainNode.gain.linearRampToValueAtTime(0, now + durationSeconds);
        
        // Connect nodes: osc -> filter -> noteGainNode -> masterGain
        osc.connect(filter);
        filter.connect(noteGainNode);
        noteGainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + durationSeconds + 0.05); // Stop oscillator shortly after envelope finishes

        // No explicit stopSynthNote needed for this self-releasing design for now
    }
    
    // Example for explicit noteOff, if needed later
    stopSynthNote(midiNote) {
        if (this.activeOscillators[midiNote]) {
            const note = this.activeOscillators[midiNote];
            const now = this.audioContext.currentTime;
            note.gain.gain.cancelScheduledValues(now);
            note.gain.gain.setValueAtTime(note.gain.gain.value, now); // Hold current value
            note.gain.gain.linearRampToValueAtTime(0, now + 0.1); // Short release
            note.oscillator.stop(now + 0.15);
            delete this.activeOscillators[midiNote];
            console.log(`AudioEngine: Stopped note ${midiNote}`);
        }
    }

    // Placeholder for drum samples and other features from full requirements
} 