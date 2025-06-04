# MIDI Musical Interface - Requirements Specification

## Overview
A comprehensive web-based musical interface application built with p5.js that provides real-time audio synthesis, drum sequencing, visual feedback, and MIDI-to-code conversion. The application features a modular architecture with dual MIDI device support: Korg nanoPAD2 for main interface control and Yamaha Reface CP for Strudel code generation.

## Core Features

### 1. Advanced XY Pad Controller
- **Purpose**: Multi-scale musical control through 2D interaction
- **Scale System**:
  - **17 Musical Scales**: Pentatonic, Major, Natural Minor, Harmonic Minor, Melodic Minor, Diminished, Bhairav, Bhairavi, Yaman, Kafi, Asavari, Todi, Purvi, Marwa, Khamaj, Kalyan, Chromatic
  - **Tonic Selection**: Full chromatic range from C2 to B5 (36-83 MIDI notes)
  - **Interactive Controls**: Color-coded tonic selector and scale dropdown
  - **3+ Octave Range**: Dynamic scale generation with octave boundaries
- **Functionality**:
  - X-axis controls note selection from current scale (quantized)
  - Y-axis controls amplitude/volume (0-127 MIDI range)
  - Real-time visual feedback with crosshairs and octave markers
  - Supports both MIDI input (CC1/CC2) and mouse interaction
  - Note display with MIDI note number, frequency in Hz, and scale information
  - Color-coded chromatic note visualization

### 2. Enhanced Audio Engine
- **Synthesizer**:
  - Simple sine wave oscillator with ADSR characteristics
  - Real-time frequency and amplitude control
  - MIDI note output to connected devices
  - Automatic note release with configurable duration
  - Timeout-based memory management for sustained notes
- **Drum Samples**:
  - Kick drum (MIDI note 36) - `assets/kick.wav`
  - Snare drum (MIDI note 38) - `assets/snare.wav`
  - Hi-hat (MIDI note 40) - `assets/hihat.wav`
  - Velocity-sensitive playback rate modulation (0.9x-1.1x)
  - Individual FFT analysis for each sample
  - Sample preloading with error handling
- **Audio Management**:
  - Stop all audio functionality
  - Memory-efficient timeout management
  - Audio resource disposal and cleanup
  - Status monitoring and initialization tracking

### 3. Comprehensive MIDI Integration
- **Device-Specific Input Support**:
  - **Korg nanoPAD2**: Drum pad triggers and XY control (CC1/CC2)
  - **Yamaha Reface CP**: Note capture for Strudel code generation
  - Automatic device detection with fallback mechanisms
  - Real-time device connection monitoring
- **Output Support**:
  - Sends MIDI notes to connected nanoPAD2
  - Note on/off messages for synthesizer feedback
  - Real-time MIDI feedback with velocity
- **Device Management**:
  - Multiple concurrent input device support
  - Device status monitoring and logging
  - Hot-plug device detection and connection
  - Graceful fallback when preferred devices unavailable
  - Comprehensive MIDI debugging and logging

### 4. Multi-Channel Oscilloscope
- **Real-time Waveform Display**:
  - Circular oscilloscope with clipped visualization
  - Multiple audio source visualization in stacked bands
  - Color-coded channels: Synth (green), Kick (red), Snare (blue), Hi-hat (yellow)
  - FFT analysis for each audio source
  - Dynamic sound source addition/removal
  - Circular clipping for clean waveform presentation
- **Visual Features**:
  - Channel labels and color coding
  - Responsive layout with positioning controls
  - Adjustable amplitude scaling
  - Real-time frequency analysis

### 5. Advanced Loop Sequencer
- **Recording**:
  - 16-beat loop recording (1/16 note resolution)
  - Multi-channel recording (synth, kick, snare, hi-hat)
  - Record button toggle with visual feedback
  - Real-time event capture during performance
  - Rate limiting to prevent excessive event recording (50ms minimum interval)
  - Memory management with automatic cleanup
- **Playback**:
  - Variable BPM control (60-200 BPM with real-time adjustment)
  - Interactive BPM slider with drag functionality
  - Visual timeline with beat divisions and quarter note emphasis
  - Color-coded note events per channel
  - Synchronized playhead indicator
  - Event triggering with precise timing
- **Timeline Interaction**:
  - Click-to-toggle events on timeline grid
  - Visual hover feedback for cells
  - Channel lane separation with clear visual hierarchy
  - Responsive grid layout
- **Memory Management**:
  - Maximum events per beat per channel (3)
  - Automatic cleanup of oldest events
  - Memory usage statistics and monitoring
  - Periodic cleanup (every 30 seconds)

### 6. Metronome System
- **Audio Metronome**:
  - External metronome audio file support (`assets/met.wav`)
  - Fallback synthetic triangle wave tick generation
  - Visual metronome checkbox control
  - Quarter note tick timing (every 4th beat of 16-beat sequence)
  - Enable/disable toggle functionality with keyboard shortcut
- **Visual Feedback**:
  - Current beat highlighting when metronome enabled
  - Checkbox UI with visual state indication

### 7. Strudel MIDI Coder
- **Purpose**: Convert MIDI input to Strudel music notation for live coding
- **Device Selection**: Interactive dropdown to select from all available MIDI input devices
- **Note Capture**:
  - Real-time MIDI note capture with timing
  - Automatic timing quantization (500ms resolution)
  - Velocity capture and storage
  - Multi-note sequence building
  - Device filtering based on user selection
- **Code Generation**:
  - Musical notation output (note names: c4, d4, etc.)
  - Integer notation output (MIDI numbers: 60, 62, etc.)
  - Compressed notation with timing (note@duration, note!count)
  - Strudel-compatible syntax generation
- **User Interface**:
  - Device selection dropdown (replaces "Yamaha Reface CP only" label)
  - Copy Musical/Integer notation buttons
  - Clear notes functionality
  - Real-time preview of generated code
  - Visual feedback for captured note count
  - Status display showing selected device
- **Integration**: Embedded within main interface below primary controls

### 8. Responsive Visual Interface
- **Layout Management**:
  - Adaptive component positioning
  - Window resize handling
  - Responsive grid system
  - Component spacing and margins
- **Korg Section Visualization**:
  - Visual grouping box around nanoPAD2-controlled components
  - Section labeling and organization
  - Color-coded interface elements
- **Control Elements**:
  - Record button with visual state feedback
  - BPM slider with knob and progress indication
  - Metronome checkbox with visual state
  - Scale selection dropdowns with hover effects
  - Real-time parameter displays
- **Loading System**:
  - Progressive initialization display
  - Step-by-step loading progress
  - Progress bar with visual feedback
  - Error handling with user-friendly messages

### 9. Enhanced Keyboard Controls
- **Global Shortcuts**:
  - **Spacebar**: Toggle recording on/off
  - **C**: Clear all recorded loops
  - **S**: Stop all audio playback
  - **M**: Toggle metronome on/off
- **Strudel Coder Shortcuts**:
  - **Ctrl+C**: Copy musical notation to clipboard
  - **Ctrl+Space**: Copy integer notation to clipboard
  - **Delete/Backspace**: Clear captured notes

### 10. Advanced Memory Management
- **Event Management**:
  - Maximum events per beat per channel (3)
  - Rate limiting for synth events (50ms minimum interval)
  - Automatic cleanup of oldest events
  - Memory usage statistics and monitoring
- **Performance Optimization**:
  - Periodic memory cleanup (every 30 seconds)
  - Audio timeout management with cleanup
  - Resource disposal on application exit
  - FFT analysis optimization

### 11. Modular Application Architecture
- **Component System**:
  - `AudioEngine` - Audio synthesis and sample management
  - `MidiHandler` - MIDI input/output with device filtering
  - `XYPad` - Multi-scale controller interface
  - `Oscilloscope` - Multi-channel waveform visualization
  - `Looper` - Loop sequencer with timeline
  - `StrudelCoder` - MIDI-to-Strudel converter
  - `sketch_modular` - Main application coordinator
- **Communication**:
  - Callback-based inter-component communication
  - Event-driven architecture
  - Independent module initialization
  - Clean separation of concerns
- **Error Handling**:
  - Graceful degradation when components fail
  - Audio file loading error recovery
  - MIDI device connection fallbacks
  - User-friendly error displays with reload options

### 12. Comprehensive Status Display
- **Real-time Information**:
  - Audio engine initialization status
  - MIDI device connection status (inputs/outputs)
  - Current recording state and beat position
  - BPM and timing information
  - Memory usage statistics by channel
  - Event count per channel
  - Device-specific status updates

### 13. Utility Applications
- **Standalone Strudel Coder** (`strudel-coder.html`):
  - Dedicated MIDI-to-Strudel conversion interface
  - All-device MIDI input support (similar to main interface)
  - Independent operation from main interface
- **MIDI Debug Tool** (`midi-debug.html`):
  - Comprehensive MIDI device detection
  - Real-time MIDI message monitoring
  - Device troubleshooting assistance
  - Browser compatibility checking
- **MIDI Test Interface** (`test-midi.html`):
  - Basic MIDI device testing
  - Message logging and analysis
  - Quick device verification

## Technical Requirements

### Dependencies
- **p5.js** (1.7.0+) - Core graphics and interaction library
- **p5.sound.js** - Audio processing and FFT analysis
- **Web MIDI API** - MIDI device communication
- **Audio Assets**:
  - `assets/kick.wav` - Kick drum sample
  - `assets/snare.wav` - Snare drum sample
  - `assets/hihat.wav` - Hi-hat sample
  - `assets/met.wav` - Metronome tick sound

### Browser Compatibility
- **Modern browsers** with Web MIDI API support (Chrome, Firefox, Edge)
- **Web Audio API** support required
- **Secure context** (HTTPS) required for MIDI access
- **File loading** capabilities for audio assets
- **Clipboard API** support for code copying

### Hardware Integration
- **Primary Controller**: Korg nanoPAD2 MIDI controller
  - Drum pad triggers (MIDI notes 36, 38, 40)
  - XY pad control (CC1, CC2)
- **Secondary Controller**: Yamaha Reface CP
  - Note input for Strudel code generation
- **Fallback**: Complete mouse/keyboard interaction for all functions
- **Multi-device**: Concurrent MIDI input device support

### Performance Specifications
- **Audio Latency**: Low-latency processing via Web Audio API
- **MIDI Responsiveness**: Real-time message handling (<10ms)
- **Visual Refresh**: 60fps canvas rendering
- **Loop Timing**: Variable BPM synchronization (60-200 BPM)
- **Memory Management**: Efficient buffer management with automatic cleanup
- **Event Processing**: Rate-limited recording to prevent performance issues

### File Structure
```
korg_pad2_p5/
├── index.html              # Main application entry point
├── sketch_modular.js       # Application coordinator
├── audioEngine.js          # Audio synthesis and samples
├── midiHandler.js          # MIDI input/output management
├── xyPad.js               # Multi-scale XY controller
├── oscilloscope.js        # Waveform visualization
├── looper.js              # Loop sequencer
├── strudelCoder.js        # MIDI-to-Strudel converter
├── strudel-coder.html     # Standalone Strudel interface
├── midi-debug.html        # MIDI debugging tool
├── test-midi.html         # MIDI testing interface
├── server.ps1             # Local development server
├── README.md              # Documentation
├── requirements.md        # This specification
└── assets/                # Audio files
    ├── kick.wav
    ├── snare.wav
    ├── hihat.wav
    └── met.wav
```

### Development Requirements
- **Local Server**: Required for Web MIDI API (use provided `server.ps1`)
- **Asset Management**: Proper audio file organization
- **Error Handling**: Graceful degradation and user feedback
- **Modular Design**: Component-based architecture
- **Memory Safety**: Automatic cleanup and resource management
- **Performance**: Optimized for real-time audio and MIDI processing

### Quality Assurance
- **Cross-browser Testing**: Verify MIDI support across browsers
- **Device Testing**: Test with actual nanoPAD2 and Reface CP devices
- **Performance Testing**: Monitor memory usage and audio latency
- **Error Testing**: Verify graceful handling of missing assets/devices
- **User Experience**: Ensure responsive interface and clear feedback 