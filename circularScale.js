// circularScale.js - Circular Scale Visualization Component

class CircularScale {
  constructor(x, y, diameter) {
    this.x = x;
    this.y = y;
    this.diameter = diameter;
    this.radius = diameter / 2;
    this.centerX = x + this.radius;
    this.centerY = y + this.radius;
    
    // Visual properties
    this.innerRadiusPercent = 0.4;
    this.innerRadius = this.radius * this.innerRadiusPercent;
    this.outerRadius = this.radius * 0.9;
    
    // Current state
    this.currentScale = [];
    this.currentScaleType = 'pentatonic';
    this.currentTonic = 60; // C4
    this.activeSegment = -1;
    this.hoveredSegment = -1;
    
    // Korg XY control toggle
    this.isKorgControlActive = false; // Start as inactive (XY pad is default)
    this.toggleButton = {
      x: x + diameter + 15,
      y: y,
      width: 100,
      height: 25,
      label: "Circular Inactive"
    };
    
    // Volume control
    this.volume = 0.7; // Default volume (0.0 to 1.0)
    this.volumeControl = {
      x: x + diameter + 15,
      y: y + 35,
      width: 100,
      height: 20,
      isDragging: false
    };
    
    // Mouse hover audio playback state
    this.lastPlayedSegment = -1;
    this.lastPlayTime = 0;
    this.playDebounceMs = 150; // Minimum time between note plays
    
    // XY position tracking
    this.xyPosition = { x: 0, y: 0 }; // Normalized 0-1
    this.midiPosition = { x: 64, y: 64 }; // MIDI CC values 0-127
    
    // Note colors (matching the reference interface)
    this.noteColors = {
      'C': '#444444',
      'C#': '#63cc00',
      'D': '#adcc00',
      'D#': '#cca600',
      'E': '#cc6300',
      'F': '#cc001f',
      'F#': '#cc0063',
      'G': '#cc00c9',
      'G#': '#8c00cc',
      'A': '#4700cc',
      'A#': '#0300cc',
      'B': '#0040cc'
    };
    
    // Note names
    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
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
    
    // Initialize with default scale
    this.updateScale(this.currentScaleType, this.currentTonic);
  }
  
  // Update the scale and regenerate segments
  updateScale(scaleType, tonic) {
    this.currentScaleType = scaleType;
    this.currentTonic = tonic;
    
    if (this.scaleDefinitions[scaleType]) {
      this.currentScale = this.scaleDefinitions[scaleType].map(interval => {
        const noteIndex = (tonic + interval) % 12;
        const octave = Math.floor((tonic + interval) / 12);
        return {
          midiNote: tonic + interval,
          noteIndex: noteIndex,
          noteName: this.noteNames[noteIndex],
          octave: octave,
          color: this.noteColors[this.noteNames[noteIndex]],
          interval: interval
        };
      });
    } else {
      console.warn(`Unknown scale type: ${scaleType}`);
      this.currentScale = [];
    }
  }
  
  // Handle MIDI XY input (CC1 = X, CC2 = Y) - now with circular mapping
  handleMidiXY(ccX, ccY) {
    this.midiPosition.x = ccX;
    this.midiPosition.y = ccY;
    
    // Convert MIDI values to normalized coordinates
    this.xyPosition.x = ccX / 127.0;
    this.xyPosition.y = ccY / 127.0;
    
    // Map XY coordinates to circular segment using polar coordinates
    const targetSegment = this.mapXYToSegment(this.xyPosition.x, this.xyPosition.y);
    
    if (targetSegment !== this.activeSegment && targetSegment >= 0 && targetSegment < this.currentScale.length) {
      this.activeSegment = targetSegment;
      return {
        note: this.currentScale[targetSegment],
        segmentChanged: true
      };
    } else if (targetSegment === -1 && this.activeSegment !== -1) {
      // Moved to dead zone, clear active segment
      this.activeSegment = -1;
      return {
        note: null,
        segmentChanged: true,
        enteredDeadZone: true
      };
    }
    
    return {
      note: targetSegment >= 0 ? this.currentScale[targetSegment] : null,
      segmentChanged: false
    };
  }
  
  // Map XY coordinates to circular segments using the same logic as mouse movement
  mapXYToSegment(normalizedX, normalizedY) {
    if (this.currentScale.length === 0) return -1;
    
    // Convert normalized XY pad coordinates (0-1) to circular scale coordinates
    // Map the XY pad as if it's overlaid on the circular scale area
    
    // Calculate the virtual mouse position on the circular scale
    // Center the XY pad on the circular scale center
    const virtualMouseX = this.centerX + (normalizedX - 0.5) * this.diameter;
    const virtualMouseY = this.centerY + (normalizedY - 0.5) * this.diameter;
    
    // Use the exact same logic as handleMouseMove for determining segment
    const relativeX = virtualMouseX - this.centerX;
    const relativeY = virtualMouseY - this.centerY;
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    
    // Check if we're in the active ring area (same as mouse logic)
    if (distance >= this.innerRadius && distance <= this.outerRadius) {
      let angle = Math.atan2(relativeX, -relativeY);
      if (angle < 0) angle += 2 * Math.PI;
      
      const segmentAngle = (2 * Math.PI) / this.currentScale.length;
      const segmentIndex = Math.floor(angle / segmentAngle);
      return Math.min(segmentIndex, this.currentScale.length - 1);
    }
    
    return -1; // Outside the ring area
  }
  
  // Handle mouse interaction for testing and note playback
  handleMouseMove(mouseX, mouseY, audioEngine = null) {
    const relativeX = mouseX - this.centerX;
    const relativeY = mouseY - this.centerY;
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    
    if (distance >= this.innerRadius && distance <= this.outerRadius && this.currentScale.length > 0) {
      let angle = Math.atan2(relativeX, -relativeY);
      if (angle < 0) angle += 2 * Math.PI;
      
      const segmentAngle = (2 * Math.PI) / this.currentScale.length;
      const segmentIndex = Math.floor(angle / segmentAngle);
      const newHoveredSegment = Math.min(segmentIndex, this.currentScale.length - 1);
      
      // Check if we've moved to a new segment
      if (newHoveredSegment !== this.hoveredSegment) {
        this.hoveredSegment = newHoveredSegment;
        
        // Play note if we have audio engine and haven't played this segment recently
        if (audioEngine && this.hoveredSegment >= 0) {
          const currentTime = millis();
          const timeSinceLastPlay = currentTime - this.lastPlayTime;
          
          // Only play if enough time has passed or if it's a different segment
          if (timeSinceLastPlay > this.playDebounceMs || this.lastPlayedSegment !== this.hoveredSegment) {
            const note = this.currentScale[this.hoveredSegment];
            if (note) {
              // Use volume control to set velocity, scaled to match XY pad amplitude range
              // XY pad: setSynthAmp maps 0-127 to 0-0.8
              // previewNote maps 0-127 to 0-0.2, so we need 4x scaling to match
              const velocity = Math.min(127, Math.round(this.volume * 127 * 4));
              audioEngine.previewNote(note.midiNote, velocity);
              this.lastPlayedSegment = this.hoveredSegment;
              this.lastPlayTime = currentTime;
            }
          }
        }
      }
    } else {
      // Mouse left the circular scale area
      if (this.hoveredSegment !== -1) {
        this.hoveredSegment = -1;
        // Stop preview when leaving the scale
        if (audioEngine) {
          audioEngine.stopPreview();
        }
      }
    }
  }
  
  // Handle mouse press for toggle button
  handleMousePress(mouseX, mouseY) {
    // Check toggle button first
    if (this.isPointInToggleButton(mouseX, mouseY)) {
      this.toggleKorgControl();
      return true;
    }
    
    // Check volume control
    if (this.isPointInVolumeControl(mouseX, mouseY)) {
      this.volumeControl.isDragging = true;
      this.updateVolumeFromMouse(mouseX);
      return true;
    }
    
    return false;
  }
  
  // Draw the circular scale
  draw() {
    push();
    
    if (this.currentScale.length === 0) {
      // Draw empty circle with message
      fill(50);
      stroke(100);
      strokeWeight(2);
      ellipse(this.centerX, this.centerY, this.diameter, this.diameter);
      
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(16);
      text("No Scale", this.centerX, this.centerY);
      pop();
      return;
    }

    // Draw the complete ring background first for seamless appearance
    fill(40);
    stroke(80);
    strokeWeight(1);
    
    // Draw outer circle
    ellipse(this.centerX, this.centerY, this.outerRadius * 2, this.outerRadius * 2);
    
    // Draw inner circle (creating the ring)
    fill(30);
    stroke(60);
    ellipse(this.centerX, this.centerY, this.innerRadius * 2, this.innerRadius * 2);

    // Now draw each segment using arc() for perfect connections
    const segmentAngle = (2 * Math.PI) / this.currentScale.length;
    
    for (let i = 0; i < this.currentScale.length; i++) {
      const note = this.currentScale[i];
      const startAngle = i * segmentAngle - Math.PI / 2; // Start at top
      const endAngle = (i + 1) * segmentAngle - Math.PI / 2;
      
      // Determine segment appearance
      let fillColor = color(note.color);
      let strokeColor = color(255, 255, 255, 150);
      let strokeWeightValue = 1;
      
      if (i === this.activeSegment) {
        fillColor = lerpColor(fillColor, color(255, 255, 255), 0.4);
        strokeColor = color(255, 255, 255, 255);
        strokeWeightValue = 2;
      } else if (i === this.hoveredSegment) {
        fillColor = lerpColor(fillColor, color(255, 255, 255), 0.25);
        strokeColor = color(255, 255, 255, 200);
        strokeWeightValue = 1.5;
      }
      
      // Draw segment using a custom shape for perfect ring segments
      fill(fillColor);
      stroke(strokeColor);
      strokeWeight(strokeWeightValue);
      
      beginShape();
      
      // Create precise arc vertices for outer edge
      const arcResolution = 32; // Higher resolution for smooth curves
      for (let j = 0; j <= arcResolution; j++) {
        const angle = lerp(startAngle, endAngle, j / arcResolution);
        const x = this.centerX + this.outerRadius * cos(angle);
        const y = this.centerY + this.outerRadius * sin(angle);
        vertex(x, y);
      }
      
      // Create vertices for inner edge (in reverse to close the shape properly)
      for (let j = arcResolution; j >= 0; j--) {
        const angle = lerp(startAngle, endAngle, j / arcResolution);
        const x = this.centerX + this.innerRadius * cos(angle);
        const y = this.centerY + this.innerRadius * sin(angle);
        vertex(x, y);
      }
      
      endShape(CLOSE);
    }
    
    // Draw subtle separator lines between segments
    stroke(0, 0, 0, 100);
    strokeWeight(0.5);
    for (let i = 0; i < this.currentScale.length; i++) {
      const angle = i * segmentAngle - Math.PI / 2;
      const x1 = this.centerX + this.innerRadius * cos(angle);
      const y1 = this.centerY + this.innerRadius * sin(angle);
      const x2 = this.centerX + this.outerRadius * cos(angle);
      const y2 = this.centerY + this.outerRadius * sin(angle);
      line(x1, y1, x2, y2);
    }

    // Draw note labels with better positioning and styling
    for (let i = 0; i < this.currentScale.length; i++) {
      const note = this.currentScale[i];
      const labelAngle = (i * segmentAngle) + (segmentAngle / 2) - Math.PI / 2;
      const labelRadius = (this.innerRadius + this.outerRadius) / 2;
      const labelX = this.centerX + labelRadius * cos(labelAngle);
      const labelY = this.centerY + labelRadius * sin(labelAngle);
      
      // Note label background for better readability
      fill(0, 0, 0, 120);
      noStroke();
      ellipse(labelX, labelY, 24, 24);
      
      // Note label text
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(11);
      textStyle(BOLD);
      text(note.noteName, labelX, labelY);
    }

    // Draw center circle with improved styling
    fill(25);
    stroke(100);
    strokeWeight(2);
    ellipse(this.centerX, this.centerY, this.innerRadius * 2, this.innerRadius * 2);
    
    // Center highlight
    fill(50);
    noStroke();
    ellipse(this.centerX, this.centerY, this.innerRadius * 1.2, this.innerRadius * 1.2);
    
    // Draw XY position indicator if active
    if (this.activeSegment >= 0) {
      const segmentAngle = (2 * Math.PI) / this.currentScale.length;
      const targetAngle = this.activeSegment * segmentAngle + segmentAngle / 2 - Math.PI / 2;
      const indicatorRadius = (this.innerRadius + this.outerRadius) / 2;
      const indicatorX = this.centerX + indicatorRadius * cos(targetAngle);
      const indicatorY = this.centerY + indicatorRadius * sin(targetAngle);
      
      // Outer indicator ring
      fill(255, 100);
      stroke(255);
      strokeWeight(2);
      ellipse(indicatorX, indicatorY, 16, 16);
      
      // Inner indicator dot
      fill(255);
      noStroke();
      ellipse(indicatorX, indicatorY, 8, 8);
      
      // Add Korg control indicator if this component is active
      if (this.isKorgControlActive) {
        // Draw a distinctive border around the indicator
        stroke(255, 150, 0);
        strokeWeight(3);
        noFill();
        ellipse(indicatorX, indicatorY, 20, 20);
        
        // Add text indicator
        fill(255, 150, 0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(8);
        text("KORG", indicatorX, indicatorY + 25);
      }
    }

    // Draw scale information with improved styling
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(12);
    textStyle(BOLD);
    const infoY = this.centerY + this.radius + 25;
    text(`${this.currentScaleType.toUpperCase()}`, this.centerX, infoY);
    
    textSize(10);
    textStyle(NORMAL);
    const tonicName = this.noteNames[this.currentTonic % 12];
    const octave = Math.floor(this.currentTonic / 12);
    text(`Tonic: ${tonicName}${octave}`, this.centerX, infoY + 15);
    
    // Draw toggle button
    this.drawToggleButton();
    
    // Draw volume control
    this.drawVolumeControl();
    
    pop();
  }
  
  // Draw toggle button
  drawToggleButton() {
    push();
    
    const btn = this.toggleButton;
    
    // Button background
    if (this.isKorgControlActive) {
      fill(255, 150, 0, 200); // Active orange (different from XY pad)
      stroke(255, 200, 0);
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
  
  // Get current active note information
  getActiveNote() {
    if (this.activeSegment >= 0 && this.activeSegment < this.currentScale.length) {
      return this.currentScale[this.activeSegment];
    }
    return null;
  }
  
  // Check if point is inside the circular scale area
  isPointInside(x, y) {
    const distance = Math.sqrt(Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2));
    return distance >= this.innerRadius && distance <= this.outerRadius;
  }
  
  // Get scale notes array for compatibility with existing code
  getCurrentScale() {
    return this.currentScale.map(note => note.midiNote);
  }
  
  // Get debugging information
  getStatus() {
    return {
      scaleType: this.currentScaleType,
      tonic: this.currentTonic,
      scaleLength: this.currentScale.length,
      activeSegment: this.activeSegment,
      midiX: this.midiPosition.x,
      midiY: this.midiPosition.y,
      activeNote: this.getActiveNote()
    };
  }
  
  // Toggle Korg control active state
  toggleKorgControl() {
    this.isKorgControlActive = !this.isKorgControlActive;
    this.toggleButton.label = this.isKorgControlActive ? "Circular Active" : "Circular Inactive";
    
    // Return the new state so the caller can handle mutual exclusivity
    return this.isKorgControlActive;
  }
  
  // Set Korg control state directly (for mutual exclusivity)
  setKorgControlActive(active) {
    this.isKorgControlActive = active;
    this.toggleButton.label = this.isKorgControlActive ? "Circular Active" : "Circular Inactive";
  }
  
  // Check if point is in toggle button
  isPointInToggleButton(mouseX, mouseY) {
    const btn = this.toggleButton;
    return mouseX >= btn.x && mouseX <= btn.x + btn.width &&
           mouseY >= btn.y && mouseY <= btn.y + btn.height;
  }
  
  // Update position when layout changes
  updatePosition(x, y) {
    this.x = x;
    this.y = y;
    this.centerX = x + this.radius;
    this.centerY = y + this.radius;
    
    // Update toggle button position
    this.toggleButton.x = x + this.diameter + 15;
    this.toggleButton.y = y;
    
    // Update volume control position
    this.volumeControl.x = x + this.diameter + 15;
    this.volumeControl.y = y + 35;
  }
  
  // Draw volume control
  drawVolumeControl() {
    push();
    
    const vol = this.volumeControl;
    
    // Volume control background
    fill(60, 60, 60);
    stroke(120, 120, 120);
    strokeWeight(1);
    rect(vol.x, vol.y, vol.width, vol.height, 3);
    
    // Volume level fill
    const fillWidth = vol.width * this.volume;
    fill(0, 150, 255, 180);
    noStroke();
    rect(vol.x, vol.y, fillWidth, vol.height, 3);
    
    // Volume handle
    const handleX = vol.x + fillWidth;
    fill(255);
    stroke(0);
    strokeWeight(1);
    ellipse(handleX, vol.y + vol.height / 2, 12, 12);
    
    // Volume label and value
    fill(255);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(9);
    text("Volume:", vol.x, vol.y - 8);
    
    textAlign(RIGHT, CENTER);
    const volumePercent = Math.round(this.volume * 100);
    text(`${volumePercent}%`, vol.x + vol.width, vol.y - 8);
    
    pop();
  }
  
  // Handle mouse drag for volume control
  handleMouseDrag(mouseX, mouseY) {
    if (this.volumeControl.isDragging) {
      this.updateVolumeFromMouse(mouseX);
      return true;
    }
    return false;
  }
  
  // Handle mouse release for volume control
  handleMouseRelease() {
    if (this.volumeControl.isDragging) {
      this.volumeControl.isDragging = false;
      return true;
    }
    return false;
  }
  
  // Update volume based on mouse X position
  updateVolumeFromMouse(mouseX) {
    const vol = this.volumeControl;
    const relativeX = mouseX - vol.x;
    this.volume = Math.max(0, Math.min(1, relativeX / vol.width));
  }
  
  // Check if point is in volume control
  isPointInVolumeControl(mouseX, mouseY) {
    const vol = this.volumeControl;
    return mouseX >= vol.x && mouseX <= vol.x + vol.width &&
           mouseY >= vol.y && mouseY <= vol.y + vol.height;
  }
  
  // Get current volume for audio engine
  getVolume() {
    return this.volume;
  }
} 