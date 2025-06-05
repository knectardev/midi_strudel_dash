// midiHandler.js - MIDI Input/Output Handler Module

class MidiHandler {
  constructor() {
    this.midiAccess = null; // Renamed from this.midi to avoid confusion with midi messages
    this.midiOut = null;
    this.midiInputs = [];
    this.isInitialized = false;
    
    // Callback functions for different message types
    this.onDrumPadCallback = null; // Will be used by other modules later
    this.onControlChangeCallback = null; // Will be used by other modules later
    this.onNoteOnCallback = null;
    this.onNoteOffCallback = null; // Will be used by other modules later
    this.onDeviceListChangeCallback = null; // New callback for device list changes
    
    this.debugMode = false; // Set to true for verbose logging
    // More specific device search terms from legacy, can be adjusted
    this.korgDeviceTerms = ['nanopad', 'korg']; // Simplified for broader Korg matching
  }

  async initialize() {
    try {
      this.isInitialized = false;
      if (!navigator.requestMIDIAccess) {
        console.error('Web MIDI API not supported in this browser.');
        throw new Error('Web MIDI API not supported in this browser');
      }

      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this._setupMidiAccessEventHandlers();
      this._scanInitialDevices();
      this.isInitialized = true;
      console.log('MIDI Handler initialized successfully.');
      if (this.midiInputs.length === 0) {
        console.warn('No MIDI input devices detected initially.');
      }
      if (!this.midiOut) {
        // console.warn('No Korg-like output device detected initially for MIDI feedback.');
      }
      return true;
    } catch (error) {
      console.error('MIDI initialization failed:', error);
      this.isInitialized = false;
      // Optionally, update UI to show MIDI error status
      const midiStatusElement = document.getElementById('midi-status');
      if (midiStatusElement) midiStatusElement.innerHTML = '<p style="color:red;">MIDI Error: ' + error.message + '</p>';
      throw error;
    }
  }

  _setupMidiAccessEventHandlers() {
    if (!this.midiAccess) return;
    this.midiAccess.onstatechange = (event) => this._handleStateChange(event);
  }

  _scanInitialDevices() {
    if (!this.midiAccess) return;
    console.log(`Scanning for MIDI devices... Found ${this.midiAccess.inputs.size} inputs and ${this.midiAccess.outputs.size} outputs`);
    
    // Clear previous lists
    this.midiInputs = [];
    // this.midiOut = null; // Let state change handle output if one disconnects and reconnects

    // Inputs
    this.midiAccess.inputs.forEach(input => {
      this.midiInputs.push(input);
      input.onmidimessage = (msg) => this._handleMidiMessage(msg, input.name, input.id);
      console.log(`MIDI Input connected: ${input.name} (ID: ${input.id}, State: ${input.state})`);
    });

    // Outputs - preferentially find a Korg device
    let foundKorgOutput = false;
    this.midiAccess.outputs.forEach(output => {
      if (this._isKorgDevice(output.name) && !foundKorgOutput) {
        this.midiOut = output;
        foundKorgOutput = true;
        if (this.debugMode) console.log(`Preferred MIDI Output set: ${output.name} (ID: ${output.id})`);
      }
    });
    // If no Korg output, and no output is set, pick the first available as a fallback
    if (!this.midiOut && this.midiAccess.outputs.size > 0) {
        this.midiOut = this.midiAccess.outputs.values().next().value;
        if (this.debugMode && this.midiOut) console.log(`Fallback MIDI Output set: ${this.midiOut.name} (ID: ${this.midiOut.id})`);
    }
  }
  
  _isKorgDevice(deviceName) {
    if (!deviceName) return false;
    const nameLower = deviceName.toLowerCase();
    return this.korgDeviceTerms.some(term => nameLower.includes(term));
  }

  _handleStateChange(event) {
    const port = event.port;
    const isConnected = port.state === 'connected';
    const portType = port.type; // 'input' or 'output'
    const portName = port.name;
    const portId = port.id;

    if (this.debugMode) {
        console.log(`MIDI State Change: ${portName} (ID: ${portId}) - Type: ${portType}, State: ${port.state}, Connection: ${port.connection}`);
    }

    if (portType === 'input') {
      if (isConnected) {
        if (!this.midiInputs.find(input => input.id === portId)) {
          this.midiInputs.push(port);
          port.onmidimessage = (msg) => this._handleMidiMessage(msg, portName, portId);
          if (this.debugMode) console.log(`MIDI Input added: ${portName}`);
        }
      } else { // disconnected
        this.midiInputs = this.midiInputs.filter(input => input.id !== portId);
        if (this.debugMode) console.log(`MIDI Input removed: ${portName}`);
      }
    } else if (portType === 'output') {
      if (isConnected) {
        // If no output is set, or if the new device is Korg and current isn't, or if current output matches this new one
        if (!this.midiOut || (this._isKorgDevice(portName) && !this._isKorgDevice(this.midiOut.name)) || this.midiOut.id === portId ) {
            this.midiOut = port;
            if (this.debugMode) console.log(`MIDI Output device set/updated: ${portName}`);
        } else if (this._isKorgDevice(portName) && !this.midiOut) { // If current output is not Korg, but this one is
            this.midiOut = port;
            if (this.debugMode) console.log(`Preferred Korg MIDI Output device connected: ${portName}`);
        }
      } else { // disconnected
        if (this.midiOut && this.midiOut.id === portId) {
          if (this.debugMode) console.log(`Current MIDI Output disconnected: ${portName}. Rescanning for alternative.`);
          this.midiOut = null;
          // Rescan for an alternative output, preferring Korg
          this._scanInitialDevices(); // Simplified rescan logic
        }
      }
    }
    // Notify other modules about device list changes if necessary
    // This could be done via a callback or event emitter if components need to react dynamically beyond initial load.
    // For StrudelCoder, we update it explicitly after init and when MidiHandler signals a change if needed.
    if (this.onDeviceListChangeCallback) {
      this.onDeviceListChangeCallback();
    }
  }

  _handleMidiMessage(message, deviceName = 'Unknown Device', deviceId = '') {
    const [command, data1, data2] = message.data;
    const velocity = data2 || 0;
    const channel = (command & 0x0F) + 1; // MIDI channels are 1-16

    if (this.debugMode) {
      // console.log(`MIDI Message: cmd=${command.toString(16)}, d1=${data1}, d2=${data2} from ${deviceName} (Ch: ${channel}, ID: ${deviceId})`);
    }

    // Note On (0x90-0x9F) - command is 144-159
    if ((command & 0xF0) === 0x90 && velocity > 0) {
      if (this.onNoteOnCallback) {
        this.onNoteOnCallback(data1, velocity, channel, deviceName, deviceId);
      }
      // Drum pad specific callback (can be added later if needed for other modules)
      // if (this._isDrumNote(data1) && this.onDrumPadCallback) {
      //   this.onDrumPadCallback(data1, velocity, channel, deviceName, deviceId);
      // }
      return;
    }
    
    // Note Off (0x80-0x8F) or Note On with velocity 0 - command is 128-143
    if ((command & 0xF0) === 0x80 || ((command & 0xF0) === 0x90 && velocity === 0)) {
      if (this.onNoteOffCallback) {
        this.onNoteOffCallback(data1, 0, channel, deviceName, deviceId);
      }
      return;
    }
    
    // Control Change (CC) (0xB0-0xBF) - command is 176-191
    if ((command & 0xF0) === 0xB0) {
      if (this.onControlChangeCallback) {
        this.onControlChangeCallback(data1, data2, channel, deviceName, deviceId);
      }
      return;
    }
    
    // Silently ignore common system messages (Timing Clock, Active Sensing, etc.)
    const commonSystemMessages = [0xF8, 0xFA, 0xFB, 0xFC, 0xFE, 0xFF];
    if (command >= 0xF0 && commonSystemMessages.includes(command)) {
        return; 
    }

    if (this.debugMode && command >= 0xF0) { // Log other system messages if debug is on
        console.log(`Unknown or unhandled System MIDI command: 0x${command.toString(16)} from ${deviceName}`);
    }
  }

  // _isDrumNote(note) { // Example, can be expanded based on requirements
  //   const commonDrumNotes = [36, 38, 40]; // Kick, Snare, Hat for Korg nanoPAD2
  //   return commonDrumNotes.includes(note);
  // }

  sendNoteOn(note, velocity, channel = 0) { // channel 0-15 for MIDI spec
    if (this.midiOut) {
      const status = 0x90 | (channel & 0x0F);
      this.midiOut.send([status, note, velocity]);
      if (this.debugMode) console.log(`Sent Note ON: ${note} (vel: ${velocity}) on ch ${channel + 1} to ${this.midiOut.name}`);
    } else if (this.debugMode) {
      // console.warn('Cannot send MIDI Note ON: No output device connected or selected.');
    }
  }

  sendNoteOff(note, channel = 0) { // channel 0-15 for MIDI spec
    if (this.midiOut) {
      const status = 0x80 | (channel & 0x0F);
      this.midiOut.send([status, note, 0]); // Velocity 0 for note off
      if (this.debugMode) console.log(`Sent Note OFF: ${note} on ch ${channel + 1} to ${this.midiOut.name}`);
    } else if (this.debugMode) {
      // console.warn('Cannot send MIDI Note OFF: No output device connected or selected.');
    }
  }

  sendControlChange(controller, value, channel = 0) { // channel 0-15 for MIDI spec
    if (this.midiOut) {
      const status = 0xB0 | (channel & 0x0F);
      this.midiOut.send([status, controller, value]);
      if (this.debugMode) console.log(`Sent CC${controller}: ${value} on ch ${channel + 1} to ${this.midiOut.name}`);
    } else if (this.debugMode) {
      // console.warn('Cannot send MIDI CC: No output device connected or selected.');
    }
  }

  // Setters for callbacks
  setNoteOnCallback(callback) { this.onNoteOnCallback = callback; }
  setNoteOffCallback(callback) { this.onNoteOffCallback = callback; }
  setControlChangeCallback(callback) { this.onControlChangeCallback = callback; }
  setDeviceListChangeCallback(callback) { this.onDeviceListChangeCallback = callback; }
  // setDrumPadCallback(callback) { this.onDrumPadCallback = callback; }

  // Getters for device lists
  getInputDevices() {
    return this.midiInputs.map(input => ({ 
        id: input.id, 
        name: input.name, 
        manufacturer: input.manufacturer || 'N/A',
        state: input.state,
        connection: input.connection
    }));
  }

  getOutputDevice() {
    if (!this.midiOut) return null;
    return {
        id: this.midiOut.id,
        name: this.midiOut.name,
        manufacturer: this.midiOut.manufacturer || 'N/A',
        state: this.midiOut.state,
        connection: this.midiOut.connection
    };
  }

  isAvailable() {
    return this.isInitialized && this.midiAccess !== null;
  }

  // Debug utility to log current devices
  logDevices() {
    console.log("=== MIDI DEVICE DEBUG ===");
    console.log("MIDI Access object:", this.midiAccess);
    if (this.midiAccess) {
      console.log(`Raw MIDI Inputs (${this.midiAccess.inputs.size}):`, Array.from(this.midiAccess.inputs.values()));
      console.log(`Raw MIDI Outputs (${this.midiAccess.outputs.size}):`, Array.from(this.midiAccess.outputs.values()));
    }
    console.log("Processed Input Devices:", this.getInputDevices());
    console.log("Selected MIDI Output:", this.getOutputDevice());
    console.log("Internal midiInputs array:", this.midiInputs);
    console.log("=========================");
  }
  
  // Allow external toggling of debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`MIDI Handler debug mode ${enabled ? 'enabled' : 'disabled'}.`);
  }

  // Manual refresh method to re-scan for devices
  async refreshDevices() {
    if (!this.midiAccess) {
      console.warn("Cannot refresh devices: MIDI not initialized");
      return false;
    }
    
    console.log("Manually refreshing MIDI devices...");
    this._scanInitialDevices();
    
    // Notify callback about device list change
    if (this.onDeviceListChangeCallback) {
      this.onDeviceListChangeCallback();
    }
    
    // Log updated devices
    this.logDevices();
    return true;
  }
} 