// midiHandler.js - MIDI Input/Output Handler Module

class MidiHandler {
  constructor() {
    this.midiOut = null;
    this.midiInputs = [];
    this.isInitialized = false;
    
    // Callback functions for different message types
    this.onDrumPadCallback = null;
    this.onControlChangeCallback = null;
    this.onNoteOnCallback = null;
    this.onNoteOffCallback = null;
    
    // Debug settings
    this.debugMode = true; // Enable detailed logging
    this.deviceSearchTerms = ['nanoPAD2', 'nanopad2', 'NANOPAD2', 'nanoPAD', 'nanopad', 'NANOPAD', 'Korg', 'KORG'];
  }

  // Initialize MIDI access
  async initialize() {
    try {
      this.isInitialized = false;
      
      if (!navigator.requestMIDIAccess) {
        throw new Error('Web MIDI API not supported in this browser');
      }

      const midi = await navigator.requestMIDIAccess({ sysex: false });
      this.setupMidiAccess(midi);
      this.isInitialized = true;
      
    } catch (error) {
      console.error('🔥 MIDI initialization failed:', error);
      throw error;
    }
  }

  // Setup MIDI inputs and outputs with detailed logging
  setupMidiAccess(midi) {
    // Store MIDI access reference
    this.midi = midi;
    
    // Setup device change listeners
    midi.onstatechange = (event) => this.handleStateChange(event);
    
    // Scan for existing devices
    this.scanMidiDevices(midi);
  }
  
  // Enhanced nanoPAD2 detection
  isLikelyNanoPAD2(deviceName) {
    if (!deviceName) return false;
    
    const name = deviceName.toLowerCase();
    return this.deviceSearchTerms.some(term => name.includes(term.toLowerCase()));
  }
  
  // Handle MIDI device state changes with reduced logging
  handleStateChange(event) {
    const device = event.port;
    
    if (device.type === 'input') {
      if (device.state === 'connected') {
        device.onmidimessage = (msg) => this.handleMidiMessage(msg);
        this.midiInputs.push(device);
      } else if (device.state === 'disconnected') {
        const index = this.midiInputs.indexOf(device);
        if (index > -1) {
          this.midiInputs.splice(index, 1);
        }
      }
    } else if (device.type === 'output') {
      if (device.state === 'connected' && this.isLikelyNanoPAD2(device.name)) {
        this.midiOut = device;
      } else if (device.state === 'disconnected' && this.midiOut === device) {
        this.midiOut = null;
      }
    }
  }

  // Handle MIDI messages with optional detailed logging
  handleMidiMessage(message) {
    const [command, data1, data2] = message.data;
    const deviceName = message.target.name || 'Unknown Device';
    
    const velocity = data2 || 0;
    const channel = (command & 0x0F) + 1;
    
    // Note On (0x90-0x9F)
    if ((command & 0xF0) === 0x90 && velocity > 0) {
      // Check if it's a drum pad note
      if (this.isDrumNote(data1) && this.onDrumPadCallback) {
        this.onDrumPadCallback(data1, velocity, channel, deviceName);
      }
      if (this.onNoteOnCallback) {
        this.onNoteOnCallback(data1, velocity, channel, deviceName);
      }
      return;
    }
    
    // Note Off (0x80-0x8F) or Note On with velocity 0
    if ((command & 0xF0) === 0x80 || ((command & 0xF0) === 0x90 && velocity === 0)) {
      if (this.onNoteOffCallback) {
        this.onNoteOffCallback(data1, 0, channel, deviceName);
      }
      return;
    }
    
    // Control Change (0xB0-0xBF)
    if ((command & 0xF0) === 0xB0) {
      if (this.onControlChangeCallback) {
        this.onControlChangeCallback(data1, data2, channel, deviceName);
      }
      return;
    }
    
    // System messages (0xF0-0xFF) - silently ignore common ones
    if (command >= 0xF0) {
      // Common system messages we can ignore:
      // 0xF8 = Timing Clock
      // 0xFA = Start
      // 0xFB = Continue  
      // 0xFC = Stop
      // 0xFE = Active Sensing
      // 0xFF = System Reset
      const commonSystemMessages = [0xF8, 0xFA, 0xFB, 0xFC, 0xFE, 0xFF];
      if (commonSystemMessages.includes(command)) {
        return; // Silently ignore these common system messages
      }
    }
    
    // Only log unknown commands if debug mode is enabled
    if (this.debugMode) {
      console.log(`❓ Unknown MIDI command: 0x${command.toString(16)} from ${deviceName}`);
    }
  }

  // Log system information for debugging
  logSystemInfo() {
    console.log('\n💻 System Information:');
    console.log(`   Browser: ${navigator.userAgent}`);
    console.log(`   Platform: ${navigator.platform}`);
    console.log(`   Web MIDI API: ${navigator.requestMIDIAccess ? 'Supported' : 'Not Supported'}`);
    console.log(`   Secure Context: ${window.isSecureContext}`);
  }
  
  // Log troubleshooting tips
  logTroubleshootingTips() {
    console.log('\n🔧 MIDI Troubleshooting Tips:');
    console.log('1. Make sure you\'re using HTTPS (required for Web MIDI API)');
    console.log('2. Try refreshing the page after connecting your device');
    console.log('3. Check if your device is recognized by your operating system');
    console.log('4. Ensure no other applications are using the MIDI device exclusively');
    console.log('5. Try a different USB port or cable');
  }
  
  // Log specific nanoPAD2 troubleshooting
  logNanoPAD2Troubleshooting() {
    console.log('\n🎹 nanoPAD2 Troubleshooting:');
    console.log('1. Make sure the nanoPAD2 is powered on and connected via USB');
    console.log('2. Try different USB ports or a different USB cable');
    console.log('3. Check if the device appears in your system\'s MIDI settings');
    console.log('4. On Windows: Check Device Manager for "Sound, video and game controllers"');
    console.log('5. On Mac: Check Audio MIDI Setup utility');
    console.log('6. Try disconnecting and reconnecting the device');
    console.log('7. Restart your browser after connecting the device');
  }
  
  // Toggle debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🐛 MIDI debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }
  
  // Get detailed device information
  getDeviceInfo() {
    return {
      inputs: this.midiInputs.map(input => ({
        name: input.name,
        manufacturer: input.manufacturer,
        id: input.id,
        state: input.state,
        connection: input.connection,
        isLikelyNanoPAD2: this.isLikelyNanoPAD2(input.name)
      })),
      output: this.midiOut ? {
        name: this.midiOut.name,
        manufacturer: this.midiOut.manufacturer,
        id: this.midiOut.id,
        state: this.midiOut.state,
        connection: this.midiOut.connection,
        isLikelyNanoPAD2: this.isLikelyNanoPAD2(this.midiOut.name)
      } : null
    };
  }

  // Check if a MIDI note is typically used for drums
  isDrumNote(note) {
    // Common drum notes (GM drum map)
    const drumNotes = [36, 38, 40, 42, 44, 46, 48, 50, 52, 54];
    return drumNotes.includes(note);
  }

  // Send MIDI note on
  sendNoteOn(note, velocity, channel = 0) {
    if (this.midiOut) {
      const status = 0x90 | channel;
      this.midiOut.send([status, note, velocity]);
      if (this.debugMode) {
        console.log(`📤 Sent Note ON: ${note} (velocity: ${velocity})`);
      }
    } else if (this.debugMode) {
      console.log('⚠️  Cannot send MIDI: No output device connected');
    }
  }

  // Send MIDI note off
  sendNoteOff(note, channel = 0) {
    if (this.midiOut) {
      const status = 0x80 | channel;
      this.midiOut.send([status, note, 0]);
      if (this.debugMode) {
        console.log(`📤 Sent Note OFF: ${note}`);
      }
    } else if (this.debugMode) {
      console.log('⚠️  Cannot send MIDI: No output device connected');
    }
  }

  // Send MIDI control change
  sendControlChange(controller, value, channel = 0) {
    if (this.midiOut) {
      const status = 0xB0 | channel;
      this.midiOut.send([status, controller, value]);
      if (this.debugMode) {
        console.log(`📤 Sent CC${controller}: ${value}`);
      }
    } else if (this.debugMode) {
      console.log('⚠️  Cannot send MIDI: No output device connected');
    }
  }

  // Set callback for drum pad events
  setDrumPadCallback(callback) {
    this.onDrumPadCallback = callback;
  }

  // Set callback for control change events
  setControlChangeCallback(callback) {
    this.onControlChangeCallback = callback;
  }

  // Set callback for note on events
  setNoteOnCallback(callback) {
    this.onNoteOnCallback = callback;
  }

  // Set callback for note off events
  setNoteOffCallback(callback) {
    this.onNoteOffCallback = callback;
  }

  // Get list of connected input devices
  getInputDevices() {
    return this.midiInputs.map(input => ({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer,
      state: input.state
    }));
  }

  // Get output device info
  getOutputDevice() {
    if (this.midiOut) {
      return {
        id: this.midiOut.id,
        name: this.midiOut.name,
        manufacturer: this.midiOut.manufacturer,
        state: this.midiOut.state
      };
    }
    return null;
  }

  // Check if MIDI is available and initialized
  isAvailable() {
    return this.isInitialized && (this.midiInputs.length > 0 || this.midiOut !== null);
  }

  // Get MIDI status for display
  getStatus() {
    return {
      initialized: this.isInitialized,
      inputCount: this.midiInputs.length,
      inputDevices: this.midiInputs.map(input => input.name),
      outputName: this.midiOut ? this.midiOut.name : 'None',
      hasNanoPAD2: this.midiOut ? this.isLikelyNanoPAD2(this.midiOut.name) : false
    };
  }

  // Disconnect and cleanup
  disconnect() {
    this.midiInputs.forEach(input => {
      input.onmidimessage = null;
    });
    this.midiInputs = [];
    this.midiOut = null;
    this.isInitialized = false;
    console.log('🔌 MIDI handler disconnected');
  }

  scanMidiDevices(midi) {
    // Setup inputs
    for (let input of midi.inputs.values()) {
      input.onmidimessage = (msg) => this.handleMidiMessage(msg);
      this.midiInputs.push(input);
    }

    // Find nanoPAD2 or use first available output
    for (let output of midi.outputs.values()) {
      if (this.isLikelyNanoPAD2(output.name)) {
        this.midiOut = output;
        break;
      }
    }

    // If no nanoPAD2 found, use first available output
    if (!this.midiOut && midi.outputs.size > 0) {
      this.midiOut = midi.outputs.values().next().value;
    }
  }
} 