// sketch_modular.js - Main application file using modular components

// Global component instances
let audioEngine;
let midiHandler;
let xyPad;
let looper;
let strudelCoder;
let circularScale; // New circular scale component

// Initialization state
let isInitialized = false;
let initializationStep = 0;
const totalInitSteps = 7; // Increased for CircularScale

// Memory management
let lastMemoryCleanup = 0;
const MEMORY_CLEANUP_INTERVAL = 30000; // Clean up every 30 seconds

// Layout configuration
const layout = {
  xyPad: { x: 0, y: 0, size: 200 }, // Will be set by calculateLayout()
  looper: { width: 0, height: 0, beats: 16, bpm: 120 },
  strudelCoder: { width: 400, height: 250 },
  circularScale: { diameter: 180 } // New circular scale layout
};

function preload() {
  // Audio engine will handle loading in setup
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textSize(14);
  
  // Start async initialization
  initializeApplication();
}

async function initializeApplication() {
  try {
    // Step 1: Initialize audio engine
    initializationStep = 1;
    audioEngine = new AudioEngine();
    await audioEngine.initialize();

    // Step 2: Initialize MIDI handler
    initializationStep = 2;
    midiHandler = new MidiHandler();
    await midiHandler.initialize();

    // Step 3: Calculate layout positions
    initializationStep = 3;
    calculateLayout();

    // Step 4: Initialize components
    initializationStep = 4;
    initializeComponents();

    // Step 5: Setup connections
    initializationStep = 5;
    setupMidiCallbacks();

    // Step 6: Initialize Strudel Coder
    initializationStep = 6;
    initializeStrudelCoder();

    // Step 7: Initialize Circular Scale
    initializationStep = 7;
    initializeCircularScale();

    isInitialized = true;
    console.log('🎵 MIDI Musical Interface ready');
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    isInitialized = false;
  }
}

function initializeComponents() {
  // Initialize XY pad
  xyPad = new XYPad(layout.xyPad.x, layout.xyPad.y, layout.xyPad.size);

  // Initialize looper
  looper = new Looper(
    layout.looper.x,
    layout.looper.y,
    layout.looper.width,
    layout.looper.height,
    layout.looper.beats,
    layout.looper.bpm
  );
}

function initializeStrudelCoder() {
  // Initialize Strudel Coder below the main interface
  strudelCoder = new StrudelCoder(
    layout.strudelCoder.x,
    layout.strudelCoder.y,
    layout.strudelCoder.width,
    layout.strudelCoder.height
  );
}

function initializeCircularScale() {
  // Initialize Circular Scale below the main interface
  circularScale = new CircularScale(
    layout.circularScale.x,
    layout.circularScale.y,
    layout.circularScale.diameter
  );
  
  // Sync with XY pad's initial scale settings
  if (xyPad) {
    circularScale.updateScale(xyPad.currentScaleType, xyPad.currentTonic);
  }
}

function calculateLayout() {
  // Add top margin and left alignment - increased top margin to prevent bleeding off screen
  const topMargin = 120; // Increased from 60 to 120 to push components down
  const leftMargin = 125; // Increased from 60 to 120 to make room for "Tonic" label
  const componentSpacing = 40;
  
  // Update layout positions with margins and spacing
  layout.xyPad.x = leftMargin;
  layout.xyPad.y = topMargin;

  // Looper position - to the right of XY pad with spacing
  layout.looper.width = layout.xyPad.size * 4;
  layout.looper.height = layout.xyPad.size;
  layout.looper.x = layout.xyPad.x + layout.xyPad.size + componentSpacing;
  layout.looper.y = layout.xyPad.y;

  // Circular Scale position - to the right of looper with some spacing
  layout.circularScale.x = layout.looper.x + layout.looper.width + componentSpacing;
  layout.circularScale.y = layout.looper.y;

  // StrudelCoder position - below the main interface with more separation and left-aligned
  const sectionSpacing = 180; // Increased to account for circular scale
  const padding = 15; // Match the padding used in Korg section
  const colorScaleWidth = 30; // Account for color scale width + spacing
  const tonicLabelWidth = 60; // Account for "Tonic" label space
  layout.strudelCoder.x = leftMargin - padding - colorScaleWidth - tonicLabelWidth + 4; // Exact alignment with fine adjustment
  layout.strudelCoder.y = layout.xyPad.y + layout.xyPad.size + sectionSpacing;
}

function setupMidiCallbacks() {
  if (!midiHandler || !audioEngine || !looper) return;
  
  // Setup MIDI callbacks to handle different message types with device filtering
  midiHandler.setDrumPadCallback((note, velocity, channel, deviceName) => {
    // Only process Korg devices for drum pads
    if (isKorgDevice(deviceName)) {
      audioEngine.playDrumSample(note, velocity);
      const channelName = audioEngine.getChannelName(note);
      if (channelName) {
        looper.recordEvent(channelName, note, velocity);
      }
    }
  });

  midiHandler.setControlChangeCallback((controller, value, channel, deviceName) => {
    // Only process Korg devices for XY pad
    if (isKorgDevice(deviceName)) {
      // Check which component should receive XY control
      if (xyPad && xyPad.isKorgControlActive) {
        // Route to traditional XY pad
        const noteResult = xyPad.handleMidiCC(controller, value, audioEngine, midiHandler, looper);
        
        // Sync circular scale with XY pad scale
        if (circularScale && (controller === 1 || controller === 2)) {
          circularScale.updateScale(xyPad.currentScaleType, xyPad.currentTonic);
        }
        
      } else if (circularScale && circularScale.isKorgControlActive) {
        // Route to circular scale with XY mapping
        if (controller === 1 || controller === 2) {
          const currentX = controller === 1 ? value : (circularScale.midiPosition ? circularScale.midiPosition.x : 64);
          const currentY = controller === 2 ? value : (circularScale.midiPosition ? circularScale.midiPosition.y : 64);
          
          // Handle XY mapping to circular segments
          const result = circularScale.handleMidiXY(currentX, currentY);
          
          // Use smooth preview system for seamless audio
          if (result && result.segmentChanged && audioEngine) {
            if (result.enteredDeadZone || !result.note) {
              // Stop preview when entering dead zone or no note
              audioEngine.stopPreview();
            } else if (result.note) {
              // Preview the note using circular scale's volume control, scaled to match XY pad amplitude
              // XY pad: setSynthAmp maps 0-127 to 0-0.8
              // previewNote maps 0-127 to 0-0.2, so we need 4x scaling to match
              const velocity = Math.min(127, Math.round(circularScale.getVolume() * 127 * 4));
              audioEngine.previewNote(result.note.midiNote, velocity);
            }
          }
        }
      }
    }
  });

  // Set up note callback for Strudel Coder (all devices, with device ID support)
  midiHandler.setNoteOnCallback((note, velocity, channel, deviceName) => {
    if (strudelCoder) {
      // Find the device ID from the MIDI handler's input devices
      const inputDevices = midiHandler.getInputDevices();
      const device = inputDevices.find(d => d.name === deviceName);
      const deviceId = device ? device.id : '';
      
      strudelCoder.captureNote(note, velocity, deviceName, deviceId);
    }
  });
  
  // Update Strudel Coder's available devices
  if (strudelCoder) {
    strudelCoder.updateAvailableDevices(midiHandler);
  }
}

// Helper function to identify Korg devices
function isKorgDevice(deviceName) {
  if (!deviceName) return false;
  const name = deviceName.toLowerCase();
  return name.includes('korg') || name.includes('nanopad') || name.includes('nanoPAD');
}

function draw() {
  background(30);

  if (!isInitialized) {
    drawLoadingScreen();
    return;
  }

  // Update components (including device lists)
  updateComponents();

  // Periodic memory cleanup to prevent crashes
  if (millis() - lastMemoryCleanup > MEMORY_CLEANUP_INTERVAL) {
    if (looper) {
      looper.cleanupMemory();
    }
    lastMemoryCleanup = millis();
  }

  // Handle looper clock and play events (with null check)
  if (looper && looper.handleLoopClock()) {
    if (audioEngine) {
      looper.playCurrentBeatEvents(audioEngine);
    }
  }

  // Draw Korg section box
  drawKorgSection();

  // Draw all components (with null checks)
  if (xyPad) xyPad.draw();
  if (circularScale) circularScale.draw();
  if (looper) looper.draw();
  if (strudelCoder) strudelCoder.draw();

  // Draw application status
  drawStatus();
  
  // Draw overlays on top (higher z-index)
  if (xyPad) xyPad.drawOverlay();
  
  // Draw Strudel Coder dropdown overlay at the highest z-index
  if (strudelCoder) strudelCoder.drawDropdownOverlay();
}

function drawKorgSection() {
  // Draw box around Korg-controlled components
  push();
  stroke(255, 150, 50);
  strokeWeight(2);
  noFill();
  
  // Calculate bounds of Korg section (including color scale + XY pad + circular scale + looper + record controls)
  const padding = 15;
  const titleHeight = 50; // Doubled space for title to provide generous spacing
  const leftMargin = 120; // Match the updated leftMargin
  const colorScaleWidth = 30; // Account for color scale width + spacing
  const tonicLabelWidth = 60; // Account for "Tonic" label space
  const rightPadding = 20; // Reduced since circular scale is now included in width calculation
  const korgBoxX = leftMargin - padding - colorScaleWidth - tonicLabelWidth; // Include label space in bounds
  const korgBoxY = layout.xyPad.y - padding - titleHeight;
  const korgBoxWidth = (layout.circularScale.x + layout.circularScale.diameter) - leftMargin + (padding * 2) + colorScaleWidth + rightPadding; // Include circular scale width
  const korgBoxHeight = Math.max(layout.xyPad.size, layout.looper.height, layout.circularScale.diameter) + (padding * 2) + titleHeight + 60; // Use max height of components
  
  rect(korgBoxX, korgBoxY, korgBoxWidth, korgBoxHeight, 8);
  
  // Title for Korg section with more spacing
  fill(255, 150, 50);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text("Korg nanoPAD2 Controller", korgBoxX + 10, korgBoxY + 8);
  
  pop();
}

function drawLoadingScreen() {
  // Draw loading screen while initializing
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text('Initializing MIDI Musical Interface...', width / 2, height / 2 - 50);
  
  textSize(16);
  const stepNames = [
    'Starting...',
    'Loading Audio Engine...',
    'Connecting MIDI...',
    'Calculating Layout...',
    'Creating Components...',
    'Establishing Connections...',
    'Initializing Strudel Coder...',
    'Initializing Circular Scale...'
  ];
  
  const stepName = stepNames[initializationStep] || 'Loading...';
  text(stepName, width / 2, height / 2);
  
  // Progress bar
  const progressWidth = 300;
  const progressHeight = 10;
  const progress = initializationStep / totalInitSteps;
  
  noFill();
  stroke(255);
  rect(width / 2 - progressWidth / 2, height / 2 + 30, progressWidth, progressHeight);
  
  fill(0, 255, 0);
  noStroke();
  rect(width / 2 - progressWidth / 2, height / 2 + 30, progressWidth * progress, progressHeight);
  
  pop();
}

function drawStatus() {
  if (!isInitialized) return;
  
  // Optional status display
  push();
  fill(255, 100);
  textAlign(LEFT, TOP);
  const statusY = height - 120; // More space for additional info
  
  const audioStatus = audioEngine ? audioEngine.getStatus() : { synthReady: false, drumSamplesLoaded: 0 };
  const midiStatus = midiHandler ? midiHandler.getStatus() : { outputName: 'None', inputCount: 0, inputDevices: [] };
  const looperStatus = looper ? looper.getStatus() : { isRecording: false, currentBeat: 0, totalEvents: 0 };
  const memoryStats = looper ? looper.getMemoryStats() : { totalEvents: 0 };
  
  // Main status line
  text(`Audio: ${audioStatus.synthReady ? 'Ready' : 'Not Ready'} | ` +
       `Drums: ${audioStatus.drumSamplesLoaded}/3 | ` +
       `MIDI Output: ${midiStatus.outputName} | ` +
       `MIDI Inputs: ${midiStatus.inputCount} | ` +
       `Looper: ${looperStatus.isRecording ? 'Recording' : 'Stopped'} | ` +
       `Beat: ${looperStatus.currentBeat + 1}/${layout.looper.beats} | ` +
       `Events: ${looperStatus.totalEvents} | ` +
       `Memory: ${memoryStats.totalEvents} events`, 10, statusY);
  
  pop();
}

function mouseDragged() {
  if (!isInitialized) return;
  
  let handled = false;
  
  // Handle looper slider dragging first
  if (looper && looper.handleMouseDragged(mouseX, mouseY)) {
    handled = true;
  }
  
  // Handle XY pad mouse interaction if slider wasn't handled
  if (!handled && xyPad && audioEngine && midiHandler) {
    xyPad.handleMouseDrag(mouseX, mouseY, audioEngine, midiHandler, looper);
  }
}

function mousePressed() {
  // Check components for mouse interaction (in reverse order for proper layering)
  if (strudelCoder && strudelCoder.handleMousePress(mouseX, mouseY)) return;
  if (looper && looper.handleMousePressed(mouseX, mouseY)) return;
  
  // Check circular scale toggle button first
  if (circularScale && circularScale.handleMousePress(mouseX, mouseY)) {
    // If circular scale was just activated, deactivate XY pad
    if (circularScale.isKorgControlActive && xyPad) {
      xyPad.setKorgControlActive(false);
    }
    return;
  }
  
  // Handle XY pad interactions and sync circular scale
  if (xyPad && xyPad.handleMousePress(mouseX, mouseY)) {
    // If XY pad was just activated, deactivate circular scale
    if (xyPad.isKorgControlActive && circularScale) {
      circularScale.setKorgControlActive(false);
    }
    
    // Sync circular scale with XY pad scale settings after any XY pad interaction
    if (circularScale) {
      circularScale.updateScale(xyPad.currentScaleType, xyPad.currentTonic);
    }
    return;
  }
}

function mouseReleased() {
  if (!isInitialized) return;
  
  // Handle StrudelCoder mouse release first (for button interactions)
  if (strudelCoder && strudelCoder.handleMouseRelease(mouseX, mouseY)) return;
  
  // Handle looper mouse release (for slider)
  if (looper) looper.handleMouseReleased();
}

// Handle mouse movement for hover effects
function mouseMoved() {
  if (!isInitialized) return;
  
  // Handle XY pad mouse hover
  if (xyPad && audioEngine) {
    xyPad.handleMouseMove(mouseX, mouseY);
  }
  
  // Handle circular scale mouse hover with audio playback
  if (circularScale && audioEngine) {
    circularScale.handleMouseMove(mouseX, mouseY, audioEngine);
  }
  
  // Handle Strudel Coder mouse hover
  if (strudelCoder) {
    strudelCoder.handleMouseMove(mouseX, mouseY);
  }
}

function keyPressed() {
  // Handle global shortcuts first
  if (key === ' ') {
    if (looper) looper.toggleRecording();
  } else if (key === 'c' || key === 'C') {
    if (looper) looper.clearAllLoops();
  } else if (key === 's' || key === 'S') {
    if (audioEngine) audioEngine.stopAllAudio();
  } else if (key === 'm' || key === 'M') {
    if (looper) looper.toggleMetronome();
  }

  // Let StrudelCoder handle its shortcuts
  if (strudelCoder && strudelCoder.handleKeyPress(key, keyCode, keyIsDown(CONTROL))) {
    return; // StrudelCoder handled the key
  }
}

function windowResized() {
  // Handle window resize
  resizeCanvas(windowWidth, windowHeight);
  
  if (!isInitialized) return;
  
  calculateLayout();
  
  // Update component positions (with null checks)
  if (xyPad) {
    xyPad.updatePosition(layout.xyPad.x, layout.xyPad.y);
  }
  
  if (circularScale) {
    circularScale.updatePosition(layout.circularScale.x, layout.circularScale.y);
  }
  
  if (looper) {
    looper.setPosition(layout.looper.x, layout.looper.y);
  }
  
  if (strudelCoder) {
    strudelCoder.updatePosition(layout.strudelCoder.x, layout.strudelCoder.y);
  }
}

function updateComponents() {
  // Update memory management
  if (millis() - lastMemoryCleanup > MEMORY_CLEANUP_INTERVAL) {
    if (looper) looper.performMemoryCleanup();
    lastMemoryCleanup = millis();
  }
  
  // Update Strudel Coder's available devices periodically
  if (strudelCoder && midiHandler && frameCount % 180 === 0) { // Update every 3 seconds (at 60fps)
    strudelCoder.updateAvailableDevices(midiHandler);
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (audioEngine) audioEngine.dispose();
  if (midiHandler) midiHandler.disconnect();
  if (looper) looper.dispose(); // Clean up looper audio resources
});

// EventBus.js
class EventBus {
  constructor() {
    this.events = {};
  }
  
  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => callback(data));
    }
  }
  
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }
  
  off(eventName, callback) {
    // Implementation for removing listeners
  }
}

// Global Dropdown Styling Utility
class DropdownStyle {
  static drawDropdownButton(x, y, width, height, displayText, isOpen, hoveredButton = false) {
    push();
    
    // Main dropdown button with consistent styling
    if (hoveredButton) {
      fill(70, 70, 80);
      stroke(140, 140, 160);
    } else {
      fill(60, 60, 70);
      stroke(120, 120, 140);
    }
    strokeWeight(1);
    rect(x, y, width, height, 3);
    
    // Dropdown text
    fill(200, 200, 220);
    textAlign(LEFT, CENTER);
    textSize(11);
    text(displayText, x + 8, y + height / 2);
    
    // Dropdown arrow
    fill(150, 150, 170);
    textAlign(RIGHT, CENTER);
    text(isOpen ? "▲" : "▼", x + width - 8, y + height / 2);
    
    pop();
  }
  
  static drawDropdownOptions(x, y, width, options, selectedValue, hoveredOption = -1) {
    if (!options || options.length === 0) return;
    
    push();
    
    const optionHeight = 18;
    
    // Draw options
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const optionY = y + (i * optionHeight);
      
      // Option background with consistent styling
      if (i === hoveredOption) {
        fill(80, 120, 160, 250);
      } else if (option.value === selectedValue || option === selectedValue) {
        fill(70, 90, 120, 250);
      } else {
        fill(50, 50, 60, 250);
      }
      
      stroke(100, 100, 120);
      strokeWeight(1);
      rect(x, optionY, width, optionHeight);
      
      // Option text
      fill(200, 200, 250);
      textAlign(LEFT, CENTER);
      textSize(10);
      
      // Handle both object and string options
      const displayText = option.name || option.label || option.toString();
      text(displayText, x + 8, optionY + optionHeight / 2);
      
      // Show additional info if available (like manufacturer)
      if (option.manufacturer && option.manufacturer !== displayText && option.value !== 'all') {
        fill(150, 150, 170);
        textSize(9);
        text(option.manufacturer, x + 8, optionY + optionHeight / 2 + 8);
      }
    }
    
    pop();
  }
  
  // Utility for checking if a point is within dropdown bounds
  static isPointInDropdown(mouseX, mouseY, x, y, width, height, options, isOpen) {
    const totalHeight = isOpen ? height + (options.length * 18) : height;
    return mouseX >= x && mouseX <= x + width &&
           mouseY >= y && mouseY <= y + totalHeight;
  }
  
  // Utility for getting dropdown option at coordinates
  static getDropdownOptionAt(mouseX, mouseY, x, y, width, height, options, isOpen) {
    if (!isOpen) return -1;
    
    if (mouseX < x || mouseX > x + width) return -1;
    
    const optionY = mouseY - (y + height);
    if (optionY < 0) return -1;
    
    const optionIndex = Math.floor(optionY / 18);
    return optionIndex < options.length ? optionIndex : -1;
  }
}