// audioEngine.js - Audio Synthesis and Sample Management Module

class AudioEngine {
  constructor() {
    this.osc = null;
    this.envelope = null;
    this.isInitialized = false;
    this.isOscPlaying = false;

    // Web Audio API components for smoother playback
    this.audioContext = null;
    this.webAudioOsc = null;
    this.gainNode = null;
    this.filterNode = null;
    this.masterGain = null;

    // Drum samples with associated channel information
    this.drumSamples = {};
    this.drumChannelMapping = {
      36: 'kick',
      38: 'snare', 
      40: 'hat'
    };

    // Memory management for timeouts
    this.activeTimeouts = new Set();
    
    // Preview playback state for smooth transitions
    this.previewMode = false;
    this.previewTimeout = null;
    this.currentPreviewNote = -1;
    this.currentFrequency = 440; // Track current frequency for smooth transitions
    
    // Audio file paths
    this.samplePaths = {
      36: 'assets/kick.wav',    // Kick
      38: 'assets/snare.wav',   // Snare  
      40: 'assets/hihat.wav'    // Hi-hat
    };
  }

  // Initialize the audio engine
  async initialize() {
    try {
      this.audioContext = getAudioContext();
      await this.setupSynthesizer();
      await this.loadDrumSamples();
      this.isInitialized = true;
      console.log('Audio engine initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      return false;
    }
  }

  // Setup the synthesizer oscillator
  setupSynthesizer() {
    return new Promise((resolve) => {
      // Create Web Audio nodes for smoother operation
      this.webAudioOsc = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();
      this.filterNode = this.audioContext.createBiquadFilter();
      this.masterGain = this.audioContext.createGain();

      // Configure oscillator
      this.webAudioOsc.type = 'sine';
      this.webAudioOsc.frequency.value = this.currentFrequency;
      
      // Configure filter for smoother sound
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 8000; // Cut high frequencies that can cause clicks
      this.filterNode.Q.value = 0.707;
      
      // Set up audio routing
      this.webAudioOsc.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
      
      // Initialize gain to 0 (silent)
      this.gainNode.gain.value = 0;
      this.masterGain.gain.value = 0.6; // Master volume
      
      // Start the oscillator (it runs continuously)
      this.webAudioOsc.start();
      
      // Also keep p5.js oscillator for compatibility with existing code
      this.osc = new p5.Oscillator('sine');
      this.osc.start();
      this.osc.amp(0);
      
      resolve();
    });
  }

  // Load all drum samples with envelope setup
  async loadDrumSamples() {
    const loadPromises = Object.entries(this.samplePaths).map(([note, path]) => {
      return new Promise((resolve, reject) => {
        soundFormats('wav', 'mp3');
        this.drumSamples[note] = loadSound(path, 
          (soundFile) => {
            // Setup envelope for this drum sample
            const envelope = new p5.Envelope();
            envelope.setADSR(0.01, 0.1, 0.5, 0.1);
            this.envelope = envelope;
            resolve();
          },
          (error) => {
            console.error(`Failed to load drum sample ${path}:`, error);
            reject(error);
          }
        );
      });
    });

    return Promise.all(loadPromises);
  }

  // Set synthesizer frequency from MIDI note
  setSynthFreq(midiNote) {
    if (this.osc) {
      const frequency = midiToFreq(midiNote);
      this.osc.freq(frequency);
    }
  }

  // Set synthesizer amplitude from MIDI velocity (0-127)
  setSynthAmp(midiVelocity) {
    if (this.osc) {
      const amplitude = map(midiVelocity, 0, 127, 0, 0.8);
      this.osc.amp(amplitude, 0.05); // 50ms ramp time
    }
  }

  // Smooth preview note playback for UI elements (eliminates clicking)
  previewNote(midiNote, velocity = 60) {
    if (!this.webAudioOsc || !this.gainNode) return;
    
    const targetAmplitude = map(velocity, 0, 127, 0, 0.2); // Lower volume for preview
    const frequency = midiToFreq(midiNote);
    const currentTime = this.audioContext.currentTime;
    
    // If we're already in preview mode, just smoothly transition frequency
    if (this.previewMode && this.currentPreviewNote !== midiNote) {
      // Cancel any pending parameter changes
      this.webAudioOsc.frequency.cancelScheduledValues(currentTime);
      // Smooth frequency transition - no amplitude change to avoid clicks
      this.webAudioOsc.frequency.setTargetAtTime(frequency, currentTime, 0.03); // 30ms smooth transition
      this.currentPreviewNote = midiNote;
      this.currentFrequency = frequency;
    } 
    // If not in preview mode, start preview playback
    else if (!this.previewMode) {
      this.previewMode = true;
      this.currentPreviewNote = midiNote;
      this.currentFrequency = frequency;
      
      // Cancel any pending changes
      this.webAudioOsc.frequency.cancelScheduledValues(currentTime);
      this.gainNode.gain.cancelScheduledValues(currentTime);
      
      // Set frequency immediately
      this.webAudioOsc.frequency.setValueAtTime(frequency, currentTime);
      // Smooth fade in
      this.gainNode.gain.setValueAtTime(0, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(targetAmplitude, currentTime + 0.05); // 50ms fade in
    }
    
    // Clear any existing preview timeout
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }
    
    // Auto-stop preview after a delay if no new notes come in
    this.previewTimeout = setTimeout(() => {
      this.stopPreview();
    }, 300); // Stop after 300ms of no activity
  }
  
  // Stop preview playback smoothly
  stopPreview() {
    if (this.webAudioOsc && this.gainNode && this.previewMode) {
      const currentTime = this.audioContext.currentTime;
      
      // Cancel any pending changes and smoothly fade out
      this.gainNode.gain.cancelScheduledValues(currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.08); // 80ms fade out
      
      this.previewMode = false;
      this.currentPreviewNote = -1;
      
      if (this.previewTimeout) {
        clearTimeout(this.previewTimeout);
        this.previewTimeout = null;
      }
    }
  }

  // Play a synthesizer note with automatic release
  playSynthNote(midiNote, velocity, duration) {
    // If in preview mode, stop it first to avoid conflicts
    if (this.previewMode) {
      this.stopPreview();
    }
    
    this.setSynthFreq(midiNote);
    this.setSynthAmp(velocity);
    
    // Clear any existing timeout for this note to prevent buildup
    this.clearSynthTimeouts();
    
    // Automatic release before next potential note
    const timeoutId = setTimeout(() => {
      if (this.osc) {
        this.osc.amp(0, 0.1); // Quick fade out
      }
      this.activeTimeouts.delete(timeoutId);
    }, duration * 0.8);
    
    this.activeTimeouts.add(timeoutId);
  }

  // Clear all active synth timeouts to prevent memory leaks
  clearSynthTimeouts() {
    this.activeTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
  }

  // Play a drum sample
  playDrumSample(midiNote, velocity) {
    const sample = this.drumSamples[midiNote];
    if (sample) {
      // Adjust playback rate based on velocity
      const rate = map(velocity / 127, 0, 1, 0.9, 1.1);
      sample.rate(rate);
      sample.play();
    }
  }

  // Stop synthesizer
  stopSynth() {
    if (this.osc) {
      this.osc.amp(0, 0.1);
    }
  }

  // Stop all drum samples
  stopAllDrums() {
    Object.values(this.drumSamples).forEach(sample => {
      if (sample.isPlaying()) {
        sample.stop();
      }
    });
  }

  // Stop all audio
  stopAll() {
    this.stopSynth();
    this.stopAllDrums();
    this.stopPreview();
  }

  // Get current synthesizer frequency
  getCurrentSynthFreq() {
    return this.osc ? this.osc.getFreq() : 0;
  }

  // Get current synthesizer amplitude
  getCurrentSynthAmp() {
    return this.osc ? this.osc.getAmp() : 0;
  }

  // Get audio engine status
  getStatus() {
    const drumSampleCount = Object.keys(this.drumSamples).length;
    
    return {
      initialized: this.isInitialized,
      synthReady: this.osc !== null,
      drumSamplesLoaded: drumSampleCount,
      currentSynthFreq: this.getCurrentSynthFreq(),
      currentSynthAmp: this.getCurrentSynthAmp()
    };
  }

  // Cleanup resources
  dispose() {
    this.stopAll();
    
    // Clean up preview mode
    this.stopPreview();
    
    // Clear all pending timeouts
    this.clearSynthTimeouts();
    
    // Clean up Web Audio API components
    if (this.webAudioOsc) {
      this.webAudioOsc.disconnect();
      this.webAudioOsc = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.filterNode) {
      this.filterNode.disconnect();
      this.filterNode = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    
    // Clean up p5.js oscillator
    if (this.osc) {
      this.osc.dispose();
      this.osc = null;
    }

    Object.values(this.drumSamples).forEach(sample => {
      sample.dispose();
    });
    
    this.drumSamples = {};
    
    console.log('Audio engine disposed');
  }
} 