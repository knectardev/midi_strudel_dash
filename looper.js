// looper.js - Loop Sequencer Module

class Looper {
  constructor(x, y, width, height, beats = 16, bpm = 120) {
    // Timeline display properties
    this.timelineDisplay = {
      x: x,
      y: y,
      width: width,
      height: height,
      beats: beats,
      beatWidth: width / beats,
      padding: 30
    };

    // Record button properties
    this.recordButton = {
      x: x,
      y: y + height + 20,
      width: 100,
      height: 40,
      isRecording: false,
      label: "Record"
    };

    // BPM Slider properties
    this.bpmSlider = {
      x: x + 120, // 20px spacing from record button
      y: y + height + 20,
      width: 150,
      height: 40,
      minBPM: 60,
      maxBPM: 200,
      isDragging: false,
      knobSize: 20
    };

    // Metronome checkbox properties
    this.metronomeCheckbox = {
      x: x + 290, // 20px spacing from slider
      y: y + height + 30, // Centered vertically with other controls
      size: 20,
      enabled: false,
      label: "Metronome"
    };

    // Timing properties
    this.BPM = bpm;
    this.beatDurationMilliseconds = (60 / bpm) * 1000 / 4;
    this.currentLoopBeat = 0;
    this.lastBeatAdvanceTime = 0;

    // Metronome tick sound
    this.tickSound = null;
    this.tickOsc = null;
    this.initializeTickSound();

    // Channel configuration
    this.channelOrder = ['synth', 'kick', 'snare', 'hat'];
    this.drumNoteToChannel = {
      36: 'kick',
      38: 'snare',
      40: 'hat'
    };

    // Color scheme for visual consistency
    this.channelColors = {
      synth: [0, 255, 0],   // Green
      kick: [255, 0, 0],    // Red
      snare: [0, 0, 255],   // Blue
      hat: [255, 255, 0]    // Yellow
    };

    // Initialize loop data
    this.loopData = [];
    this.initializeLoopData();
  }

  // Initialize the metronome tick sound
  initializeTickSound() {
    // Load the metronome WAV file
    soundFormats('wav', 'mp3');
    this.tickSound = loadSound('assets/met.wav', () => {
      this.metronomeLoaded = true;
      // Removed excessive metronome loading logging
    }, () => {
      this.createFallbackTick();
    });
  }

  // Fallback synthetic tick if WAV file fails to load
  createFallbackTick() {
    this.tickOsc = new p5.Oscillator('triangle');
    this.tickOsc.freq(800);
    this.tickOsc.amp(0);
    this.tickOsc.start();
    console.log('Using fallback synthetic metronome sound');
  }

  // Play metronome tick
  playTick() {
    if (this.metronomeCheckbox.enabled) {
      if (this.tickSound && this.tickSound.isLoaded()) {
        // Play the loaded WAV file
        this.tickSound.play();
      } else if (this.tickOsc) {
        // Fallback to synthetic sound
        this.tickOsc.amp(0.15, 0.005);
        setTimeout(() => {
          if (this.tickOsc) {
            this.tickOsc.amp(0, 0.02);
          }
        }, 25);
      }
    }
  }

  // Initialize empty loop data structure
  initializeLoopData() {
    this.loopData = [];
    for (let i = 0; i < this.timelineDisplay.beats; i++) {
      const beatChannels = {};
      this.channelOrder.forEach(channel => {
        beatChannels[channel] = []; // Initialize with empty arrays for each channel
      });
      this.loopData.push(beatChannels);
    }
  }

  // Update BPM and recalculate timing
  setBPM(newBPM) {
    this.BPM = constrain(newBPM, this.bpmSlider.minBPM, this.bpmSlider.maxBPM);
    this.beatDurationMilliseconds = (60 / this.BPM) * 1000 / 4;
  }

  // Update position (useful for responsive layouts)
  setPosition(x, y) {
    this.timelineDisplay.x = x;
    this.timelineDisplay.y = y;
    this.recordButton.x = x;
    this.recordButton.y = y + this.timelineDisplay.height + 20;
    this.bpmSlider.x = x + 120; // Update slider position too
    this.bpmSlider.y = y + this.timelineDisplay.height + 20;
    this.metronomeCheckbox.x = x + 290; // Update checkbox position
    this.metronomeCheckbox.y = y + this.timelineDisplay.height + 30;
  }

  // Handle the loop clock and advance beats
  handleLoopClock() {
    if (millis() - this.lastBeatAdvanceTime > this.beatDurationMilliseconds) {
      this.currentLoopBeat = (this.currentLoopBeat + 1) % this.timelineDisplay.beats;
      this.lastBeatAdvanceTime = millis();
      
      // Play metronome tick on quarter notes (every 4th beat)
      if (this.currentLoopBeat % 4 === 0) {
        this.playTick();
      }
      
      return true; // Beat advanced
    }
    return false; // No beat advance
  }

  // Get events for the current beat
  getCurrentBeatEvents() {
    return this.loopData[this.currentLoopBeat];
  }

  // Record an event to the current beat
  recordEvent(channelName, note, velocity) {
    if (this.recordButton.isRecording && channelName) {
      if (this.loopData[this.currentLoopBeat] && this.loopData[this.currentLoopBeat][channelName]) {
        const events = this.loopData[this.currentLoopBeat][channelName];
        
        // Prevent memory issues - limit events per beat per channel
        const MAX_EVENTS_PER_BEAT = 3;
        if (events.length >= MAX_EVENTS_PER_BEAT) {
          // Remove oldest event to make room
          events.shift();
        }
        
        // For synth events, prevent rapid-fire recording by checking timing
        if (channelName === 'synth') {
          const currentTime = millis();
          const MIN_RECORD_INTERVAL = 50; // Minimum 50ms between synth recordings
          
          // Check if last event was too recent
          if (events.length > 0) {
            const lastEvent = events[events.length - 1];
            if (currentTime - (lastEvent.recordTime || 0) < MIN_RECORD_INTERVAL) {
              return; // Skip this recording to prevent spam
            }
          }
          
          // Add record time for rate limiting
          this.loopData[this.currentLoopBeat][channelName].push({
            note: note,
            velocity: velocity,
            time: millis() % this.beatDurationMilliseconds,
            recordTime: currentTime
          });
        } else {
          // Drum events - normal recording
          this.loopData[this.currentLoopBeat][channelName].push({
            note: note,
            velocity: velocity,
            time: millis() % this.beatDurationMilliseconds
          });
        }
      } else {
        console.warn(`Could not record event: channel ${channelName} or beat ${this.currentLoopBeat} not initialized.`);
      }
    }
  }

  // Play all events for the current beat
  playCurrentBeatEvents(audioEngine) {
    const beatEvents = this.getCurrentBeatEvents();
    for (const channelName in beatEvents) {
      const events = beatEvents[channelName];
      events.forEach(event => {
        if (channelName === 'synth') {
          audioEngine.playSynthNote(event.note, event.velocity, this.beatDurationMilliseconds);
        } else {
          audioEngine.playDrumSample(event.note, event.velocity);
        }
      });
    }
  }

  // Toggle recording state with reduced logging
  toggleRecording() {
    if (this.recordButton.isRecording) {
      this.recordButton.isRecording = false;
      // Removed excessive recording logging
    } else {
      this.recordButton.isRecording = true;
      // Removed excessive recording logging
    }
  }

  // Toggle metronome with reduced logging
  toggleMetronome() {
    this.metronomeCheckbox.enabled = !this.metronomeCheckbox.enabled;
    // Removed excessive metronome logging
  }

  // Check if mouse is over BPM slider
  isMouseOverSlider(mouseX, mouseY) {
    const slider = this.bpmSlider;
    return mouseX >= slider.x && mouseX <= slider.x + slider.width &&
           mouseY >= slider.y && mouseY <= slider.y + slider.height;
  }

  // Check if mouse is over record button
  isMouseOverRecordButton(mouseX, mouseY) {
    const rb = this.recordButton;
    return mouseX >= rb.x && mouseX <= rb.x + rb.width &&
           mouseY >= rb.y && mouseY <= rb.y + rb.height;
  }

  // Check if mouse is over metronome checkbox
  isMouseOverCheckbox(mouseX, mouseY) {
    const cb = this.metronomeCheckbox;
    return mouseX >= cb.x && mouseX <= cb.x + cb.size &&
           mouseY >= cb.y && mouseY <= cb.y + cb.size;
  }

  // Check if mouse is over timeline grid
  isMouseOverTimeline(mouseX, mouseY) {
    const td = this.timelineDisplay;
    return mouseX >= td.x && mouseX <= td.x + td.width &&
           mouseY >= td.y && mouseY <= td.y + td.height;
  }

  // Get beat and channel from mouse position on timeline
  getTimelinePosition(mouseX, mouseY) {
    const td = this.timelineDisplay;
    if (!this.isMouseOverTimeline(mouseX, mouseY)) {
      return null;
    }

    const beatIndex = Math.floor((mouseX - td.x) / td.beatWidth);
    const numChannels = this.channelOrder.length;
    const channelLaneHeight = td.height / numChannels;
    const channelIndex = Math.floor((mouseY - td.y) / channelLaneHeight);

    if (beatIndex >= 0 && beatIndex < td.beats && channelIndex >= 0 && channelIndex < numChannels) {
      return {
        beat: beatIndex,
        channel: this.channelOrder[channelIndex]
      };
    }
    return null;
  }

  // Toggle event at specific beat and channel
  toggleEvent(beat, channel) {
    if (beat < 0 || beat >= this.timelineDisplay.beats || !this.loopData[beat][channel]) {
      return false;
    }

    const events = this.loopData[beat][channel];
    
    // If there are events, remove them (toggle off)
    if (events.length > 0) {
      this.loopData[beat][channel] = [];
      // Removed excessive event logging
      return true;
    }
    
    // If no events, add one (toggle on)
    const defaultEvent = this.getDefaultEventForChannel(channel);
    this.loopData[beat][channel].push(defaultEvent);
    // Removed excessive event logging
    return true;
  }

  // Get default event properties for each channel
  getDefaultEventForChannel(channel) {
    const defaultEvents = {
      'synth': { note: 61, velocity: 100, time: 0 }, // C#4, moderate velocity
      'kick': { note: 36, velocity: 110, time: 0 },   // Standard kick note
      'snare': { note: 38, velocity: 105, time: 0 },  // Standard snare note  
      'hat': { note: 40, velocity: 90, time: 0 }      // Standard hi-hat note
    };
    
    return defaultEvents[channel] || { note: 60, velocity: 100, time: 0 };
  }

  // Handle mouse press for all controls
  handleMousePressed(mouseX, mouseY) {
    // Check record button first
    if (this.isMouseOverRecordButton(mouseX, mouseY)) {
      this.toggleRecording();
      return true;
    }
    
    // Check metronome checkbox
    if (this.isMouseOverCheckbox(mouseX, mouseY)) {
      this.toggleMetronome();
      return true;
    }
    
    // Check BPM slider
    if (this.isMouseOverSlider(mouseX, mouseY)) {
      this.bpmSlider.isDragging = true;
      this.updateSliderFromMouse(mouseX);
      return true;
    }

    // Check timeline grid for click-to-place
    const timelinePos = this.getTimelinePosition(mouseX, mouseY);
    if (timelinePos) {
      this.toggleEvent(timelinePos.beat, timelinePos.channel);
      return true;
    }
    
    return false;
  }

  // Handle mouse drag for slider
  handleMouseDragged(mouseX, mouseY) {
    if (this.bpmSlider.isDragging) {
      this.updateSliderFromMouse(mouseX);
      return true;
    }
    return false;
  }

  // Handle mouse release
  handleMouseReleased() {
    if (this.bpmSlider.isDragging) {
      this.bpmSlider.isDragging = false;
      return true;
    }
    return false;
  }

  // Update slider value from mouse position
  updateSliderFromMouse(mouseX) {
    const slider = this.bpmSlider;
    const relativeX = constrain(mouseX - slider.x, 0, slider.width);
    const normalizedValue = relativeX / slider.width;
    const newBPM = lerp(slider.minBPM, slider.maxBPM, normalizedValue);
    this.setBPM(newBPM);
  }

  // Get slider knob position
  getSliderKnobX() {
    const slider = this.bpmSlider;
    const normalizedValue = (this.BPM - slider.minBPM) / (slider.maxBPM - slider.minBPM);
    return slider.x + normalizedValue * slider.width;
  }

  // Check if mouse click is on record button (legacy method for backward compatibility)
  handleMouseClick(mouseX, mouseY) {
    return this.handleMousePressed(mouseX, mouseY);
  }

  // Clear all recorded data
  clearAllRecordings() {
    this.initializeLoopData();
  }

  // Clear recording for a specific channel
  clearChannelRecordings(channelName) {
    for (let i = 0; i < this.timelineDisplay.beats; i++) {
      if (this.loopData[i][channelName]) {
        this.loopData[i][channelName] = [];
      }
    }
  }

  // Memory management - clean up excessive events
  performMemoryCleanup() {
    let totalEvents = this.getTotalEventCount();
    
    // Add safety check for channelOrder
    if (!this.channelOrder || this.channelOrder.length === 0) {
      return; // Exit early if no channels defined
    }
    
    // Define max events per beat (consistent with recordEvent method)
    const maxEventsPerBeat = 3;
    const totalBeats = this.timelineDisplay.beats;
    
    if (totalEvents > maxEventsPerBeat * totalBeats * this.channelOrder.length) {
      // Perform cleanup - remove oldest events from each beat/channel combination
      for (let beat = 0; beat < totalBeats; beat++) {
        for (let channel of this.channelOrder) {
          if (this.loopData[beat] && this.loopData[beat][channel] && this.loopData[beat][channel].length > maxEventsPerBeat) {
            this.loopData[beat][channel] = this.loopData[beat][channel].slice(-maxEventsPerBeat);
          }
        }
      }
      // Only log significant cleanup operations
      const newTotal = this.getTotalEventCount();
      if (totalEvents - newTotal > 50) {
        console.log(`Memory cleanup: Reduced ${totalEvents - newTotal} events`);
      }
    }
  }

  // Get memory usage statistics
  getMemoryStats() {
    let totalEvents = 0;
    const channelCounts = {};
    
    this.channelOrder.forEach(channel => {
      channelCounts[channel] = 0;
    });
    
    for (let beat of this.loopData) {
      for (let channel in beat) {
        const count = beat[channel].length;
        totalEvents += count;
        if (channelCounts[channel] !== undefined) {
          channelCounts[channel] += count;
        }
      }
    }
    
    return {
      totalEvents,
      channelCounts,
      beats: this.timelineDisplay.beats
    };
  }

  // Draw the timeline and recorded notes
  drawTimeline() {
    const td = this.timelineDisplay;
    push();
    
    // Timeline outline
    noFill();
    stroke(255);
    rect(td.x, td.y, td.width, td.height);

    // Beat divisions and playhead
    for (let i = 0; i < td.beats; i++) {
      const beatX = td.x + i * td.beatWidth;
      
      // Highlight current beat (playhead)
      if (i === this.currentLoopBeat) {
        fill(50, 50, 80, 150);
        rect(beatX, td.y, td.beatWidth, td.height);
      }
      
      // Beat division lines - make quarter note divisions more prominent
      if (i % 4 === 0) {
        // Quarter note divisions (every 4th beat) - thicker lines
        stroke(200);
        strokeWeight(2);
        
        // Add tick indicator if metronome is enabled and this is the current beat
        if (this.metronomeCheckbox.enabled && i === this.currentLoopBeat) {
          fill(255, 255, 0, 150); // Yellow highlight for tick
          rect(beatX, td.y, td.beatWidth, td.height);
        }
      } else {
        // 16th note divisions - thinner lines
        stroke(100);
        strokeWeight(1);
      }
      line(beatX, td.y, beatX, td.y + td.height);
    }

    // Draw channel separation lines
    const numChannels = this.channelOrder.length;
    const channelLaneHeight = td.height / numChannels;
    stroke(80);
    strokeWeight(1);
    for (let i = 1; i < numChannels; i++) {
      const lineY = td.y + i * channelLaneHeight;
      line(td.x, lineY, td.x + td.width, lineY);
    }

    // Draw hover feedback
    this.drawHoverFeedback();

    // Draw recorded notes
    this.drawRecordedNotes();
    
    pop();
  }

  // Draw hover feedback for timeline cells
  drawHoverFeedback() {
    if (typeof mouseX !== 'undefined' && typeof mouseY !== 'undefined') {
      const timelinePos = this.getTimelinePosition(mouseX, mouseY);
      if (timelinePos) {
        const td = this.timelineDisplay;
        const numChannels = this.channelOrder.length;
        const channelLaneHeight = td.height / numChannels;
        
        const beatX = td.x + timelinePos.beat * td.beatWidth;
        const channelY = td.y + this.channelOrder.indexOf(timelinePos.channel) * channelLaneHeight;
        
        // Subtle hover highlight
        fill(255, 255, 255, 30);
        noStroke();
        rect(beatX, channelY, td.beatWidth, channelLaneHeight);
      }
    }
  }

  // Draw the recorded note events
  drawRecordedNotes() {
    const td = this.timelineDisplay;
    const numChannels = this.channelOrder.length;
    const channelLaneHeight = td.height / numChannels;

    for (let beatIdx = 0; beatIdx < td.beats; beatIdx++) {
      const beatX = td.x + beatIdx * td.beatWidth;
      const beatEvents = this.loopData[beatIdx];

      for (let channelIdx = 0; channelIdx < numChannels; channelIdx++) {
        const channelName = this.channelOrder[channelIdx];
        const eventsOnChannel = beatEvents[channelName];
        const channelColor = this.channelColors[channelName] || [128, 128, 128];
        
        const laneY = td.y + channelIdx * channelLaneHeight;

        fill(channelColor[0], channelColor[1], channelColor[2], 200);
        noStroke();

        eventsOnChannel.forEach(event => {
          // Simple representation: a small rectangle for each event
          // Made slightly smaller since we have more beats now
          const eventWidth = td.beatWidth * 0.7; // Increased from 0.6 to 0.7 for better visibility
          const eventHeight = channelLaneHeight * 0.6;
          const eventX = beatX + (td.beatWidth - eventWidth) / 2; // Centered in beat
          const eventY = laneY + (channelLaneHeight - eventHeight) / 2; // Centered in lane
          rect(eventX, eventY, eventWidth, eventHeight, 2); // Smaller rounded corners
        });
      }
    }
  }

  // Draw the record button
  drawRecordButton() {
    push();
    const rb = this.recordButton;
    
    if (rb.isRecording) {
      fill(255, 0, 0, 200); // Red when recording
    } else {
      fill(100, 100, 100, 200); // Grey when not recording
    }
    
    noStroke();
    rect(rb.x, rb.y, rb.width, rb.height, 5); // Rounded button

    fill(255);
    textAlign(CENTER, CENTER);
    text(rb.label, rb.x + rb.width / 2, rb.y + rb.height / 2);
    pop();
  }

  // Draw the BPM slider
  drawBPMSlider() {
    push();
    const slider = this.bpmSlider;
    
    // Slider track
    fill(60, 60, 60);
    noStroke();
    rect(slider.x, slider.y + slider.height / 2 - 3, slider.width, 6, 3);
    
    // Slider fill (progress)
    const knobX = this.getSliderKnobX();
    fill(0, 255, 100);
    rect(slider.x, slider.y + slider.height / 2 - 3, knobX - slider.x, 6, 3);
    
    // Slider knob
    fill(slider.isDragging ? 255 : 200);
    stroke(100);
    strokeWeight(1);
    ellipse(knobX, slider.y + slider.height / 2, slider.knobSize, slider.knobSize);
    
    // BPM label and value
    fill(255);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(12);
    text('BPM', slider.x + slider.width / 2, slider.y - 15);
    
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text(Math.round(this.BPM), slider.x + slider.width / 2, slider.y + slider.height + 15);
    
    pop();
  }

  // Draw the metronome checkbox
  drawMetronomeCheckbox() {
    push();
    const cb = this.metronomeCheckbox;
    
    // Checkbox border
    stroke(255);
    strokeWeight(2);
    fill(cb.enabled ? color(0, 255, 100) : color(60, 60, 60));
    rect(cb.x, cb.y, cb.size, cb.size, 3);
    
    // Checkmark
    if (cb.enabled) {
      stroke(0);
      strokeWeight(3);
      noFill();
      // Draw checkmark
      line(cb.x + 4, cb.y + cb.size / 2, cb.x + cb.size / 2, cb.y + cb.size - 4);
      line(cb.x + cb.size / 2, cb.y + cb.size - 4, cb.x + cb.size - 4, cb.y + 4);
    }
    
    // Label
    fill(255);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(12);
    text(cb.label, cb.x + cb.size + 8, cb.y + cb.size / 2);
    
    pop();
  }

  // Main draw method
  draw() {
    this.drawTimeline();
    this.drawRecordButton();
    this.drawBPMSlider();
    this.drawMetronomeCheckbox();
  }

  // Get current loop status for display
  getStatus() {
    return {
      isRecording: this.recordButton.isRecording,
      currentBeat: this.currentLoopBeat,
      bpm: this.BPM,
      totalEvents: this.getTotalEventCount(),
      resolution: '1/16 notes',
      metronomeEnabled: this.metronomeCheckbox.enabled
    };
  }

  // Count total recorded events
  getTotalEventCount() {
    let total = 0;
    for (let beat of this.loopData) {
      for (let channel in beat) {
        total += beat[channel].length;
      }
    }
    return total;
  }

  // Get current beat as a musical position (e.g., "1.1", "1.2", "2.1", etc.)
  getCurrentBeatPosition() {
    const measure = Math.floor(this.currentLoopBeat / 16) + 1; // Assuming 4/4 time, 16 beats per measure
    const sixteenthNote = (this.currentLoopBeat % 16) + 1;
    return `${measure}.${sixteenthNote}`;
  }

  // Get bounding box for layout purposes
  getBoundingBox() {
    return {
      x: this.timelineDisplay.x,
      y: this.timelineDisplay.y,
      width: Math.max(this.timelineDisplay.width, this.metronomeCheckbox.x + 100 - this.timelineDisplay.x),
      height: this.timelineDisplay.height + this.recordButton.height + 20
    };
  }

  // Cleanup audio resources
  dispose() {
    if (this.tickSound) {
      this.tickSound.dispose();
      this.tickSound = null;
    }
    if (this.tickOsc) {
      this.tickOsc.stop();
      this.tickOsc = null;
    }
  }
} 