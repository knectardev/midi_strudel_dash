// strudelCoder.js - Strudel MIDI to Code Converter Module

class StrudelCoder {
  constructor(x, y, width = 400, height = 250) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    
    // State - always active now, no toggle
    this.isActive = true;
    this.capturedNotes = [];
    this.firstNoteTime = null;
    this.quantizeResolution = 500; // milliseconds (1/8 note at 60 BPM)
    this.maxNotes = 100; // Maximum number of notes to capture
    
    // Device selection - replace device filtering with dropdown
    this.selectedDeviceId = 'all'; // Default to all devices
    this.availableDevices = []; // Will be populated from MIDI handler
    this.deviceDropdown = {
      x: x + 180,
      y: y + 10,
      width: 200,
      height: 20,
      isOpen: false,
      hoveredOption: -1
    };
    
    // Button interaction state
    this.hoveredButton = null;
    this.mouseDownButton = null;
    
    // UI elements - removed toggle button
    this.buttons = {
      copyMusical: { x: x + 10, y: y + 40, width: 100, height: 25, label: "Copy Musical" },
      copyInteger: { x: x + 120, y: y + 40, width: 100, height: 25, label: "Copy Integer" },
      clear: { x: x + 230, y: y + 40, width: 60, height: 25, label: "Clear" }
    };

    // MIDI to note name mapping
    this.midiToNoteName = {
      21: "a0", 22: "a#0", 23: "b0", 24: "c1", 25: "c#1", 26: "d1", 27: "d#1", 28: "e1", 29: "f1",
      30: "f#1", 31: "g1", 32: "g#1", 33: "a1", 34: "a#1", 35: "b1", 36: "c2", 37: "c#2", 38: "d2",
      39: "d#2", 40: "e2", 41: "f2", 42: "f#2", 43: "g2", 44: "g#2", 45: "a2", 46: "a#2", 47: "b2",
      48: "c3", 49: "c#3", 50: "d3", 51: "d#3", 52: "e3", 53: "f3", 54: "f#3", 55: "g3", 56: "g#3",
      57: "a3", 58: "a#3", 59: "b3", 60: "c4", 61: "c#4", 62: "d4", 63: "d#4", 64: "e4", 65: "f4",
      66: "f#4", 67: "g4", 68: "g#4", 69: "a4", 70: "a#4", 71: "b4", 72: "c5", 73: "c#5", 74: "d5",
      75: "d#5", 76: "e5", 77: "f5", 78: "f#5", 79: "g5", 80: "g#5", 81: "a5", 82: "a#5", 83: "b5",
      84: "c6"
    };
  }

  // Check if device is allowed for this component (now checks selected device)
  isAllowedDevice(deviceName, deviceId = '') {
    if (this.selectedDeviceId === 'all') {
      return true; // Accept from all devices
    }
    
    // Check by device ID first (more reliable), then fall back to name matching
    if (deviceId && this.selectedDeviceId === deviceId) {
      return true;
    }
    
    // Fallback to name matching for older calls without deviceId
    const selectedDevice = this.availableDevices.find(d => d.id === this.selectedDeviceId);
    if (selectedDevice && deviceName) {
      return deviceName.toLowerCase().includes(selectedDevice.name.toLowerCase()) ||
             selectedDevice.name.toLowerCase().includes(deviceName.toLowerCase());
    }
    
    return false;
  }

  // Update available devices from MIDI handler
  updateAvailableDevices(midiHandler) {
    if (!midiHandler) {
      this.availableDevices = [];
      return;
    }
    
    const devices = midiHandler.getInputDevices();
    
    // Deduplicate devices by name and ID
    const uniqueDevices = [];
    const seenDevices = new Set();
    
    for (const device of devices) {
      const deviceKey = `${device.name}-${device.id}`;
      if (!seenDevices.has(deviceKey)) {
        seenDevices.add(deviceKey);
        uniqueDevices.push(device);
      }
    }
    
    this.availableDevices = [
      { id: 'all', name: 'All Devices', manufacturer: '' },
      ...uniqueDevices
    ];
    
    // If currently selected device is no longer available, reset to 'all'
    if (this.selectedDeviceId !== 'all' && 
        !this.availableDevices.find(d => d.id === this.selectedDeviceId)) {
      this.selectedDeviceId = 'all';
    }
  }

  // Update button positions when layout changes
  updatePosition(x, y) {
    this.x = x;
    this.y = y;
    
    this.buttons.copyMusical.x = x + 10;
    this.buttons.copyMusical.y = y + 40;
    
    this.buttons.copyInteger.x = x + 120;
    this.buttons.copyInteger.y = y + 40;
    
    this.buttons.clear.x = x + 230;
    this.buttons.clear.y = y + 40;
    
    // Update dropdown position
    this.deviceDropdown.x = x + 180;
    this.deviceDropdown.y = y + 10;
  }

  // Capture a MIDI note with device filtering and timing
  captureNote(note, velocity, deviceName, deviceId) {
    // Filter devices if a specific device is selected
    if (!this.isAllowedDevice(deviceName, deviceId)) {
      return;
    }

    const noteName = this.midiToNoteName[note] || `n${note}`;
    const currentTime = Date.now();

    // Initialize timing reference with first note
    if (this.firstNoteTime === 0) {
      this.firstNoteTime = currentTime;
    }

    const relativeTime = currentTime - this.firstNoteTime;
    this.capturedNotes.push({
      midi: note,
      name: noteName,
      velocity: velocity,
      time: relativeTime,
      deviceName: deviceName
    });

    // Apply note limit
    if (this.capturedNotes.length > this.maxNotes) {
      this.capturedNotes = this.capturedNotes.slice(-this.maxNotes);
    }

    // Reduced logging - only log for specific devices
    const deviceDisplayName = deviceId ? `${deviceName} (${deviceId.slice(0, 8)})` : deviceName;
    if (this.selectedDeviceId !== 'all') {
      console.log(`Captured: ${noteName} (MIDI ${note}) from ${deviceDisplayName}`);
    }
  }

  // Clear all captured notes
  clearNotes() {
    this.capturedNotes = [];
    this.firstNoteTime = 0;
  }

  // Quantize timing
  quantize(ms) {
    return Math.max(1, Math.round(ms / this.quantizeResolution));
  }

  // Compress notes with timing information
  compressNotes(sequence, key = "name") {
    if (sequence.length === 0) return [];
    
    const compressed = [];
    let i = 0;

    while (i < sequence.length) {
      const current = sequence[i];
      let count = 1;
      let j = i + 1;

      // Check for consecutive identical notes
      while (
        j < sequence.length &&
        sequence[j][key] === current[key] &&
        this.quantize(sequence[j].time - sequence[j - 1].time) === 1
      ) {
        count++;
        j++;
      }

      const duration = j < sequence.length
        ? this.quantize(sequence[j].time - current.time)
        : 1;

      if (count > 1) {
        compressed.push(`${current[key]}!${count}`);
      } else if (duration > 1) {
        compressed.push(`${current[key]}@${duration}`);
      } else {
        compressed.push(`${current[key]}`);
      }

      i = j;
    }

    return compressed;
  }

  // Get musical notation (note names)
  getMusicalNotation() {
    if (this.capturedNotes.length === 0) {
      return 'note("").sound("piano") // No notes captured yet';
    }
    const seq = this.compressNotes(this.capturedNotes, "name");
    return `note("${seq.join(" ")}").sound("piano")`;
  }

  // Get integer notation (MIDI numbers)
  getIntegerNotation() {
    if (this.capturedNotes.length === 0) {
      return 'note("").sound("piano") // No notes captured yet';
    }
    const seq = this.compressNotes(this.capturedNotes, "midi");
    return `note("${seq.join(" ")}").sound("piano")`;
  }

  // Copy text to clipboard with reduced logging
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      // Only log successful copies, not every attempt
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // Handle mouse clicks
  handleMousePress(mouseX, mouseY) {
    // Check if clicking on dropdown
    if (this.isPointInDropdown(mouseX, mouseY)) {
      if (!this.deviceDropdown.isOpen) {
        this.deviceDropdown.isOpen = true;
      } else {
        // Check if clicking on an option
        const optionIndex = this.getDropdownOptionAt(mouseX, mouseY);
        if (optionIndex >= 0 && optionIndex < this.availableDevices.length) {
          this.selectedDeviceId = this.availableDevices[optionIndex].id;
          // Removed excessive device selection logging
        }
        this.deviceDropdown.isOpen = false;
      }
      return true;
    }
    
    // Close dropdown if clicking outside
    if (this.deviceDropdown.isOpen) {
      this.deviceDropdown.isOpen = false;
      return true;
    }
    
    // Check buttons
    const buttonHit = this.getButtonAt(mouseX, mouseY);
    if (buttonHit) {
      this.mouseDownButton = buttonHit;
      return true;
    }
    return false;
  }

  // Handle mouse release
  handleMouseRelease(mouseX, mouseY) {
    if (this.mouseDownButton) {
      const buttonHit = this.getButtonAt(mouseX, mouseY);
      
      // Only trigger action if mouse released on same button that was pressed
      if (buttonHit === this.mouseDownButton) {
        switch (buttonHit) {
          case 'copyMusical':
            this.copyToClipboard(this.getMusicalNotation());
            break;
          case 'copyInteger':
            this.copyToClipboard(this.getIntegerNotation());
            break;
          case 'clear':
            this.clearNotes();
            break;
        }
      }
      
      this.mouseDownButton = null;
      return true;
    }
    return false;
  }

  // Handle mouse movement for hover detection
  handleMouseMove(mouseX, mouseY) {
    this.hoveredButton = this.getButtonAt(mouseX, mouseY);
    
    // Update dropdown hover state
    if (this.deviceDropdown.isOpen) {
      this.deviceDropdown.hoveredOption = this.getDropdownOptionAt(mouseX, mouseY);
    }
  }

  // Draw the component - always visible with box
  draw() {
    this.drawPanel();
  }

  drawPanel() {
    push();
    
    // Outer box for visual separation
    stroke(100, 200, 255);
    strokeWeight(2);
    fill(40, 40, 50, 200);
    rect(this.x - 10, this.y - 10, this.width + 20, this.height + 20, 8);

    // Main panel background
    fill(45, 45, 55, 220);
    stroke(120, 120, 140);
    strokeWeight(1);
    rect(this.x, this.y, this.width, this.height, 5);

    // Title with proper spacing
    fill(100, 200, 255);
    textAlign(LEFT, TOP);
    textSize(16);
    text("Strudel MIDI Coder", this.x + 10, this.y + 10);
    
    // Device selection dropdown (closed state only)
    this.drawDeviceDropdownClosed();

    // Draw action buttons with more space from title
    this.drawActionButtons();

    // Musical notation section with proper spacing
    textSize(12);
    fill(200, 255, 200);
    text("Musical Notation:", this.x + 10, this.y + 80);
    fill(180, 230, 180);
    text(this.getMusicalNotation(), this.x + 10, this.y + 100, this.width - 20);

    // Integer notation section with spacing
    fill(200, 200, 255);
    text("Integer Notation:", this.x + 10, this.y + 140);
    fill(180, 180, 230);
    text(this.getIntegerNotation(), this.x + 10, this.y + 160, this.width - 20);

    // Status info with spacing
    fill(255);
    text(`Captured Notes: ${this.capturedNotes.length}`, this.x + 10, this.y + 200);
    
    // Update status message to reflect device selection
    const selectedDevice = this.availableDevices.find(d => d.id === this.selectedDeviceId);
    const deviceName = selectedDevice ? selectedDevice.name : 'All Devices';
    text(`Capturing from: ${deviceName} • Use buttons or Ctrl+C/Space to copy`, this.x + 10, this.y + 220);

    pop();
  }

  drawActionButtons() {
    push();
    textAlign(CENTER, CENTER);
    textSize(10);

    // Copy Musical button
    const musicalBtn = this.buttons.copyMusical;
    this.drawButton(musicalBtn, 'copyMusical', [80, 150, 80], [100, 180, 100], [60, 120, 60]);

    // Copy Integer button
    const integerBtn = this.buttons.copyInteger;
    this.drawButton(integerBtn, 'copyInteger', [80, 80, 150], [100, 100, 180], [60, 60, 120]);

    // Clear button
    const clearBtn = this.buttons.clear;
    this.drawButton(clearBtn, 'clear', [150, 80, 80], [180, 100, 100], [120, 60, 60]);

    pop();
  }

  // Draw individual button with state-dependent styling
  drawButton(button, buttonName, normalColor, hoverColor, pressedColor) {
    let fillColor = normalColor;
    let strokeColor = null;
    let strokeW = 0;
    
    // Determine button state and color
    if (this.mouseDownButton === buttonName) {
      fillColor = pressedColor;
      strokeColor = [255, 255, 255];
      strokeW = 2;
    } else if (this.hoveredButton === buttonName) {
      fillColor = hoverColor;
      strokeColor = [255, 255, 255];
      strokeW = 1;
    }
    
    // Draw button background
    fill(fillColor[0], fillColor[1], fillColor[2], 200);
    if (strokeColor) {
      stroke(strokeColor[0], strokeColor[1], strokeColor[2]);
      strokeWeight(strokeW);
    } else {
      noStroke();
    }
    rect(button.x, button.y, button.width, button.height, 3);
    
    // Draw button text
    fill(255);
    noStroke();
    text(button.label, button.x + button.width / 2, button.y + button.height / 2);
  }

  // Draw device selection dropdown (closed state only)
  drawDeviceDropdownClosed() {
    const dropdown = this.deviceDropdown;
    const selectedDevice = this.availableDevices.find(d => d.id === this.selectedDeviceId);
    const displayText = selectedDevice ? selectedDevice.name : 'Select Device...';
    
    // Use global dropdown styling
    DropdownStyle.drawDropdownButton(
      dropdown.x, 
      dropdown.y, 
      dropdown.width, 
      dropdown.height, 
      displayText, 
      dropdown.isOpen
    );
  }

  // Draw dropdown overlay at highest z-index (only when open)
  drawDropdownOverlay() {
    if (!this.deviceDropdown.isOpen || this.availableDevices.length === 0) {
      return;
    }

    const dropdown = this.deviceDropdown;
    
    // Use global dropdown styling for options
    DropdownStyle.drawDropdownOptions(
      dropdown.x,
      dropdown.y + dropdown.height,
      dropdown.width,
      this.availableDevices,
      this.selectedDeviceId,
      dropdown.hoveredOption
    );
  }

  // Check if point is in dropdown area
  isPointInDropdown(mouseX, mouseY) {
    const dropdown = this.deviceDropdown;
    
    // Use global dropdown utility
    return DropdownStyle.isPointInDropdown(
      mouseX, 
      mouseY, 
      dropdown.x, 
      dropdown.y, 
      dropdown.width, 
      dropdown.height, 
      this.availableDevices, 
      dropdown.isOpen
    );
  }

  // Get which dropdown option (if any) is at the given coordinates
  getDropdownOptionAt(mouseX, mouseY) {
    const dropdown = this.deviceDropdown;
    
    // Use global dropdown utility
    return DropdownStyle.getDropdownOptionAt(
      mouseX, 
      mouseY, 
      dropdown.x, 
      dropdown.y, 
      dropdown.width, 
      dropdown.height, 
      this.availableDevices, 
      dropdown.isOpen
    );
  }

  // Get which button (if any) is at the given coordinates
  getButtonAt(mouseX, mouseY) {
    for (const [buttonName, button] of Object.entries(this.buttons)) {
      if (mouseX >= button.x && mouseX <= button.x + button.width &&
          mouseY >= button.y && mouseY <= button.y + button.height) {
        return buttonName;
      }
    }
    return null;
  }

  // Handle keyboard shortcuts
  handleKeyPress(key, keyCode, ctrlPressed) {
    // Ctrl+C for musical notation
    if (key === 'c' && ctrlPressed) {
      this.copyToClipboard(this.getMusicalNotation());
      return true;
    }
    
    // Ctrl+Space for integer notation  
    if (keyCode === 32 && ctrlPressed) {
      this.copyToClipboard(this.getIntegerNotation());
      return true;
    }
    
    // Delete/Backspace to clear notes
    if (keyCode === DELETE || keyCode === BACKSPACE) {
      this.clearNotes();
      return true;
    }

    return false;
  }
} 