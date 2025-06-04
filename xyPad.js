// xyPad.js - XY Pad Controller Module

class XYPad {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.centerX = x + size / 2;
    this.centerY = y + size / 2;
    this.rawX = 0;
    this.rawY = 0;
    this.xyX = undefined;
    this.xyY = undefined;
    this.lastNoteIndex = null;
    
    // Scale system variables
    this.currentTonic = 49; // C#3 (default tonic)
    this.currentScaleType = 'pentatonic';
    this.currentScale = [];
    
    // Scale definitions (intervals from tonic)
    this.scaleDefinitions = {
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
    
    // Note names for dropdown (MIDI note numbers)
    this.noteNames = {
      36: 'C2', 37: 'C#2', 38: 'D2', 39: 'D#2', 40: 'E2', 41: 'F2', 42: 'F#2', 43: 'G2', 44: 'G#2', 45: 'A2', 46: 'A#2', 47: 'B2',
      48: 'C3', 49: 'C#3', 50: 'D3', 51: 'D#3', 52: 'E3', 53: 'F3', 54: 'F#3', 55: 'G3', 56: 'G#3', 57: 'A3', 58: 'A#3', 59: 'B3',
      60: 'C4', 61: 'C#4', 62: 'D4', 63: 'D#4', 64: 'E4', 65: 'F4', 66: 'F#4', 67: 'G4', 68: 'G#4', 69: 'A4', 70: 'A#4', 71: 'B4',
      72: 'C5', 73: 'C#5', 74: 'D5', 75: 'D#5', 76: 'E5', 77: 'F5', 78: 'F#5', 79: 'G5', 80: 'G#5', 81: 'A5', 82: 'A#5', 83: 'B5'
    };
    
    // Control elements - position color scale to the left of XY pad with better spacing
    this.scaleControls = {
      colorScale: { x: this.x - 30, y: this.y, width: 20, height: this.size, isVisible: true },
      scaleDropdown: { x: this.x - 30, y: this.y + this.size + 30, width: 140, height: 25, isOpen: false, hoveredOption: -1 }
    };
    
    // Color mapping for chromatic notes (12 semitones)
    this.noteColors = [
      [255, 0, 0],     // C - Red
      [255, 69, 0],    // C# - Orange Red
      [255, 140, 0],   // D - Dark Orange
      [255, 215, 0],   // D# - Gold
      [255, 255, 0],   // E - Yellow
      [173, 255, 47],  // F - Green Yellow
      [0, 255, 255],   // F# - Cyan
      [0, 191, 255],   // G - Deep Sky Blue
      [0, 0, 255],     // G# - Blue
      [138, 43, 226],  // A - Blue Violet
      [255, 0, 255],   // A# - Magenta
      [255, 20, 147]   // B - Deep Pink
    ];
    
    // Base octave for color scale (C4 = 60)
    this.colorScaleBaseOctave = 4;
    
    // Initialize the current scale
    this.updateCurrentScale();

    // XY pad toggle for Korg control
    this.isKorgControlActive = true; // Start as active
    this.toggleButton = {
      x: x + size + 10,
      y: y,
      width: 80,
      height: 25,
      label: "XY Active"
    };
    
    // Position state
    this.currentX = 64; // MIDI CC value 0-127, start at center
    this.currentY = 64;
  }
  
  // Generate scale from tonic and intervals
  generateScale(tonic, scaleType) {
    const intervals = this.scaleDefinitions[scaleType];
    const scale = [];
    
    // Generate one full scale (3 octaves) plus just the 4th octave tonic
    for (let octave = 0; octave < 3; octave++) {
      intervals.forEach(interval => {
        scale.push(tonic + interval + (octave * 12));
      });
    }
    
    // Add just the 4th octave tonic
    scale.push(tonic + (3 * 12));
    
    return scale;
  }
  
  // Initialize the current scale
  updateCurrentScale() {
    this.currentScale = this.generateScale(this.currentTonic, this.currentScaleType);
  }
  
  // Set tonic note
  setTonic(tonic) {
    this.currentTonic = tonic;
    this.updateCurrentScale();
  }
  
  // Set scale type
  setScaleType(scaleType) {
    this.currentScaleType = scaleType;
    this.updateCurrentScale();
  }

  // Handle MIDI CC input for X and Y axes
  handleMidiCC(cc, value, audioEngine, midiHandler, looper) {
    if (cc === 1) { // X-axis (CC1)
      this.rawX = value;
      return this.updateNote(audioEngine, midiHandler, looper);
    } else if (cc === 2) { // Y-axis (CC2)
      this.rawY = value;
      this.updateAmplitude(audioEngine);
    }
    return null;
  }

  // Handle mouse interaction
  handleMouseDrag(mouseX, mouseY, audioEngine, midiHandler, looper) {
    if (this.isPointInside(mouseX, mouseY)) {
      // Compute raw 0–127 values from mouse position
      this.rawX = floor(map(mouseX, this.x, this.x + this.size, 0, 127));
      this.rawY = floor(map(mouseY, this.y + this.size, this.y, 0, 127));
      
      const noteResult = this.updateNote(audioEngine, midiHandler, looper);
      this.updateAmplitude(audioEngine);
      return noteResult;
    }
    return null;
  }

  // Check if point is inside the pad area
  isPointInside(x, y) {
    return x >= this.x && x <= this.x + this.size &&
           y >= this.y && y <= this.y + this.size;
  }

  // Update note based on X position
  updateNote(audioEngine, midiHandler, looper) {
    let idx = floor(map(this.rawX, 0, 127, 0, this.currentScale.length));
    idx = constrain(idx, 0, this.currentScale.length - 1);

    if (idx !== this.lastNoteIndex) {
      // Note off previous
      if (this.lastNoteIndex !== null && midiHandler.midiOut) {
        midiHandler.midiOut.send([0x80, this.currentScale[this.lastNoteIndex], 0]);
      }
      
      // Note on new
      const note = this.currentScale[idx];
      audioEngine.setSynthFreq(note);
      
      if (midiHandler.midiOut) {
        midiHandler.midiOut.send([0x90, note, this.rawY]);
      }
      
      this.lastNoteIndex = idx;
      
      // Record synth event if looper is recording
      if (looper) {
        looper.recordEvent('synth', note, this.rawY);
      }

      // Update UI dot X position
      this.xyX = map(idx, 0, this.currentScale.length - 1, this.x, this.x + this.size);

      // Return note information for Strudel capture
      return {
        note: note,
        velocity: this.rawY
      };
    }

    // Update UI dot X position even if note didn't change
    this.xyX = map(idx, 0, this.currentScale.length - 1, this.x, this.x + this.size);
    return null;
  }

  // Update amplitude based on Y position
  updateAmplitude(audioEngine) {
    this.xyY = map(this.rawY, 0, 127, this.y + this.size, this.y);
    audioEngine.setSynthAmp(this.rawY);
  }

  // Get current note info for display
  getCurrentNoteInfo() {
    if (this.lastNoteIndex !== null) {
      const note = this.currentScale[this.lastNoteIndex];
      return {
        note: note,
        frequency: midiToFreq(note)
      };
    }
    return null;
  }

  // Get note name from note number
  getNoteNameFromNumber(noteNumber) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteIndex = noteNumber % 12;
    return noteNames[noteIndex] + octave;
  }
  
  // Get note number from color scale position  
  getNoteFromColorPosition(y) {
    const colorScale = this.scaleControls.colorScale;
    const relativeY = y - colorScale.y;
    const normalizedY = relativeY / colorScale.height;
    const colorIndex = Math.floor(normalizedY * 12);
    const clampedIndex = Math.max(0, Math.min(11, colorIndex));
    
    // Map to actual MIDI note (C4 = 60, so C = 60, C# = 61, etc.)
    const baseNote = this.colorScaleBaseOctave * 12 + 12; // C4 = 60
    return baseNote + clampedIndex;
  }

  // Handle mouse press
  handleMousePress(mouseX, mouseY) {
    // Check toggle button first
    if (this.isPointInToggleButton(mouseX, mouseY)) {
      this.toggleKorgControl();
      return true;
    }
    
    // Handle dropdown interactions first
    const colorScale = this.scaleControls.colorScale;
    const scaleDropdown = this.scaleControls.scaleDropdown;
    
    // Check color scale click - select tonic note
    if (mouseX >= colorScale.x && mouseX <= colorScale.x + colorScale.width &&
        mouseY >= colorScale.y && mouseY <= colorScale.y + colorScale.height) {
      const selectedNote = this.getNoteFromColorPosition(mouseY);
      if (selectedNote !== this.currentTonic) {
        this.setTonic(selectedNote); // Use setter method to trigger scale update
      }
      scaleDropdown.isOpen = false; // Close other dropdown
      return true;
    }
    
    // Check scale dropdown button click
    if (mouseX >= scaleDropdown.x && mouseX <= scaleDropdown.x + scaleDropdown.width &&
        mouseY >= scaleDropdown.y && mouseY <= scaleDropdown.y + scaleDropdown.height) {
      scaleDropdown.isOpen = !scaleDropdown.isOpen;
      return true;
    }
    
    // Check scale dropdown options (if open)
    if (scaleDropdown.isOpen) {
      const scaleTypes = Object.keys(this.scaleDefinitions);
      const optionIndex = DropdownStyle.getDropdownOptionAt(
        mouseX, mouseY, 
        scaleDropdown.x, scaleDropdown.y, 
        scaleDropdown.width, scaleDropdown.height, 
        scaleTypes, scaleDropdown.isOpen
      );
      
      if (optionIndex >= 0 && optionIndex < scaleTypes.length) {
        this.setScaleType(scaleTypes[optionIndex]); // Use setter method to trigger scale update
        scaleDropdown.isOpen = false;
        return true;
      }
    }
    
    // Close dropdowns if clicking elsewhere
    if (scaleDropdown.isOpen) {
      scaleDropdown.isOpen = false;
      return true;
    }

    return false; // No dropdown interaction
  }

  // Handle mouse movement for hover detection
  handleMouseMove(mouseX, mouseY) {
    const scaleDropdown = this.scaleControls.scaleDropdown;
    
    // Update dropdown hover state
    if (scaleDropdown.isOpen) {
      const scaleTypes = Object.keys(this.scaleDefinitions);
      scaleDropdown.hoveredOption = DropdownStyle.getDropdownOptionAt(
        mouseX, mouseY, 
        scaleDropdown.x, scaleDropdown.y, 
        scaleDropdown.width, scaleDropdown.height, 
        scaleTypes, scaleDropdown.isOpen
      );
    }
  }

  // Render the XY pad
  draw() {
    // Pad outline
    noFill();
    stroke(255);
    rect(this.x, this.y, this.size, this.size);

    // Draw octave/tonic lines along X axis
    this.drawOctaveLines();

    if (this.xyX !== undefined && this.xyY !== undefined) {
      // Dot
      noStroke();
      fill(100, 200, 100);
      ellipse(this.xyX, this.xyY, 12);

      // Crosshairs
      stroke(200, 100, 100);
      line(this.x, this.xyY, this.x + this.size, this.xyY);
      stroke(100, 100, 200);
      line(this.xyX, this.y, this.xyX, this.y + this.size);
    }

    // Display current scale info above the XY pad (with generous spacing)
    fill(255);
    noStroke();
    textAlign(LEFT, BASELINE);
    text(`Tonic: ${this.getNoteNameFromNumber(this.currentTonic)} | Scale: ${this.currentScaleType}`, 
         this.x, this.y - 15);

    // Display current note info below the XY pad (moved down for more space)
    const noteInfo = this.getCurrentNoteInfo();
    if (noteInfo) {
      fill(255);
      text(`Note ${noteInfo.note} → ${noteInfo.frequency.toFixed(1)} Hz`, 
           this.x, this.y + this.size + 20);
    }
    
    // Draw scale controls (base layer)
    this.drawScaleControls();

    // Draw toggle button
    this.drawToggleButton();
  }
  
  // Draw the dropdown controls for scale selection
  drawScaleControls() {
    const colorScale = this.scaleControls.colorScale;
    const scaleDropdown = this.scaleControls.scaleDropdown;
    
    // Color scale background
    fill(50);
    stroke(255);
    strokeWeight(1);
    rect(colorScale.x, colorScale.y, colorScale.width, colorScale.height);
    
    // Draw color scale segments
    noStroke();
    for (let i = 0; i < 12; i++) {
      const segmentHeight = colorScale.height / 12;
      const y = colorScale.y + (i * segmentHeight);
      const color = this.noteColors[i];
      fill(color[0], color[1], color[2]);
      rect(colorScale.x, y, colorScale.width, segmentHeight);
      
      // Highlight current tonic
      const currentTonicColorIndex = this.currentTonic % 12;
      if (i === currentTonicColorIndex) {
        fill(255, 255, 255, 100);
        rect(colorScale.x, y, colorScale.width, segmentHeight);
        stroke(255);
        strokeWeight(2);
        noFill();
        rect(colorScale.x, y, colorScale.width, segmentHeight);
        noStroke();
      }
    }
    
    // Scale type dropdown using global styling
    DropdownStyle.drawDropdownButton(
      scaleDropdown.x,
      scaleDropdown.y,
      scaleDropdown.width,
      scaleDropdown.height,
      this.currentScaleType,
      scaleDropdown.isOpen
    );
    
    // Labels
    push();
    textAlign(RIGHT, BOTTOM);
    fill(200);
    text("Tonic:", colorScale.x - 10, colorScale.y - 5);
    
    textAlign(LEFT, BOTTOM);
    fill(200);
    text("Scale:", scaleDropdown.x, scaleDropdown.y - 5);
    
    // Current tonic note label (positioned to align with the active color segment)
    textAlign(RIGHT, CENTER);
    fill(255);
    
    // Calculate the vertical position of the currently selected tonic note in the color scale
    const currentTonicColorIndex = this.currentTonic % 12;
    const segmentHeight = colorScale.height / 12;
    const activeSegmentY = colorScale.y + (currentTonicColorIndex * segmentHeight) + (segmentHeight / 2);
    
    text(this.getNoteNameFromNumber(this.currentTonic), colorScale.x - 10, activeSegmentY);
    
    textAlign(LEFT, BASELINE); // Reset text alignment
    pop();
  }
  
  // Draw dropdown options on top (higher z-index)
  drawDropdownOverlay() {
    const scaleDropdown = this.scaleControls.scaleDropdown;
    
    // Scale dropdown options (if open) - using global styling
    if (scaleDropdown.isOpen) {
      const scaleTypes = Object.keys(this.scaleDefinitions);
      
      // Use global dropdown styling for options
      DropdownStyle.drawDropdownOptions(
        scaleDropdown.x,
        scaleDropdown.y + scaleDropdown.height,
        scaleDropdown.width,
        scaleTypes,
        this.currentScaleType,
        scaleDropdown.hoveredOption
      );
    }
  }

  // Call this after other components to ensure dropdown appears on top
  drawOverlay() {
    this.drawDropdownOverlay();
  }

  // Draw octave/tonic lines along X axis
  drawOctaveLines() {
    if (this.currentScale.length === 0) return;
    
    // Get the current scale intervals for one octave
    const intervals = this.scaleDefinitions[this.currentScaleType];
    const notesPerOctave = intervals.length;
    
    // Find positions where tonic appears (start of each octave)
    const tonicPositions = [];
    for (let octave = 0; octave < 4; octave++) {
      const tonicIndex = octave * notesPerOctave;
      if (tonicIndex < this.currentScale.length) {
        tonicPositions.push(tonicIndex);
      }
    }
    
    // Draw vertical lines at tonic positions
    push();
    stroke(255, 150, 50, 120); // Orange color with transparency
    strokeWeight(1.5);
    
    tonicPositions.forEach(index => {
      const x = map(index, 0, this.currentScale.length - 1, this.x, this.x + this.size);
      line(x, this.y, x, this.y + this.size);
    });
    
    // Draw lighter lines for other octave boundaries if helpful
    stroke(100, 100, 100, 60); // Gray with more transparency
    strokeWeight(1);
    
    for (let octave = 1; octave < 4; octave++) {
      const octaveStartIndex = octave * notesPerOctave;
      if (octaveStartIndex < this.currentScale.length) {
        const x = map(octaveStartIndex, 0, this.currentScale.length - 1, this.x, this.x + this.size);
        line(x, this.y, x, this.y + this.size);
      }
    }
    
    pop();
  }

  // Update position when layout changes
  updatePosition(x, y) {
    this.x = x;
    this.y = y;
    this.centerX = x + this.size / 2;
    this.centerY = y + this.size / 2;
    
    // Update toggle button position
    this.toggleButton.x = x + this.size + 10;
    this.toggleButton.y = y;
    
    // Update scale controls
    this.updateScaleControlsPosition();
  }
  
  // Toggle Korg control active state
  toggleKorgControl() {
    this.isKorgControlActive = !this.isKorgControlActive;
    this.toggleButton.label = this.isKorgControlActive ? "XY Active" : "XY Inactive";
    
    // Return the new state so the caller can handle mutual exclusivity
    return this.isKorgControlActive;
  }
  
  // Set Korg control state directly (for mutual exclusivity)
  setKorgControlActive(active) {
    this.isKorgControlActive = active;
    this.toggleButton.label = this.isKorgControlActive ? "XY Active" : "XY Inactive";
  }
  
  // Check if point is in toggle button
  isPointInToggleButton(mouseX, mouseY) {
    const btn = this.toggleButton;
    return mouseX >= btn.x && mouseX <= btn.x + btn.width &&
           mouseY >= btn.y && mouseY <= btn.y + btn.height;
  }
  
  // Draw toggle button
  drawToggleButton() {
    push();
    
    const btn = this.toggleButton;
    
    // Button background
    if (this.isKorgControlActive) {
      fill(0, 150, 255, 200); // Active blue
      stroke(0, 200, 255);
    } else {
      fill(80, 80, 80, 200); // Inactive gray
      stroke(120, 120, 120);
    }
    
    strokeWeight(2);
    rect(btn.x, btn.y, btn.width, btn.height, 5);
    
    // Button text
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(10);
    text(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);
    
    pop();
  }
}

// MIDI note to frequency conversion
function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
} 