# MIDI Strudel Interface - Musical Live Coding Platform

## Overview
A comprehensive web-based musical interface application that provides real-time audio synthesis, visual feedback, and seamless MIDI-to-Strudel code conversion. Built with modern vanilla JavaScript and Web Audio API, the application features a modular architecture with advanced MIDI device support, intelligent beat detection, and direct Strudel REPL integration for live coding workflows.

**Demo**: https://midi-strudel-dash.vercel.app/ 

## 🎹 Core Features

### 1. Advanced XY Pad Controller
- **Multi-Scale Musical Control**: 2D interaction with real-time Strudel code generation
- **17 Musical Scales**: Pentatonic, Major, Natural Minor, Harmonic Minor, Melodic Minor, Diminished, Bhairav, Bhairavi, Yaman, Kafi, Asavari, Todi, Purvi, Marwa, Khamaj, Kalyan, Chromatic
- **Global Tonic Selection**: Full chromatic range from C3 to B3 (MIDI notes 48-59)
- **3+ Octave Range**: Dynamic scale generation with octave boundaries
- **Dual Interaction Modes**: 
  - Mouse/touch interaction with configurable mouseover behavior
  - MIDI CC input (CC1/CC2) for hardware controller integration
- **Real-time Feedback**: Visual crosshairs, note names, MIDI numbers, frequencies in Hz
- **Strudel Integration**: Automatic note capture with throttling to prevent chord detection artifacts

### 2. Interactive Visual Keyboard
- **Full Piano Interface**: Multi-octave chromatic keyboard display
- **Smart Scale Highlighting**: Visual indication of playable notes based on current tonic/scale
- **Real-time Note Feedback**: 
  - Visual highlighting for played notes
  - MIDI input visualization from external devices
  - Integration with XY Pad and Strudel Coder for unified feedback
- **Configurable Interaction**: 
  - "Always" mode: hover to play
  - "Drag" mode: click and drag to play
- **Accessibility**: ARIA labels and keyboard navigation support

### 3. Enhanced Audio Engine
- **Professional Synthesizer**:
  - Hard-coded optimized parameters for immediate playability
  - ADSR envelope with configurable attack, decay, sustain, release
  - Low-pass filtering with adjustable cutoff frequency
  - Multiple waveform support (sine, sawtooth, square, triangle)
- **Audio Management**:
  - Web Audio API-based architecture for high-quality synthesis
  - Automatic note release with configurable duration
  - Resource-efficient context management with suspend/resume handling
  - Velocity-sensitive amplitude control (0-127 MIDI range)

### 4. Revolutionary Strudel MIDI Coder
- **Intelligent Note Capture**:
  - **Smart Device Filtering**: Select from all available MIDI input devices or capture from all
  - **Dual Notation Support**: Musical notation (c4, d#4) and integer notation (MIDI numbers)
  - **Advanced Chord Detection**: Automatic recognition of simultaneous notes (20ms window)
  - **Beat Detection**: NEW! Automatic BPM estimation based on user playing patterns
- **Advanced Code Generation**:
  - **Compressed Notation**: Efficient patterns with repeat counts (`note!3`) and duration (`note@2`)
  - **Multi-line Chord Formatting**: Sophisticated layout for complex chord progressions
  - **Smart Sound Transformation**: Automatic conversion from GM sound format to Strudel syntax
  - **Dynamic BPM Setting**: Auto-detected or manual BPM with `setcpm()` generation
- **Extensive Sound Library**: 100+ sounds with intelligent autocomplete search
- **Real-time REPL Integration**: Automatic code injection with multiple fallback methods

### 5. ⚡ NEW: Intelligent Beat Detection
- **Automatic BPM Detection**: Analyzes timing patterns in user input to estimate tempo
- **Smart Interval Analysis**: 
  - Filters out chord intervals and pauses
  - Groups similar intervals with tolerance
  - Identifies most common beat patterns
- **Adaptive Updates**: 
  - Minimum 4 notes required for detection
  - 2-second cooldown between updates
  - 8-second analysis window for recent patterns
- **Visual Feedback**: BPM display shows "(auto)" when automatically detected
- **Manual Override**: Manual BPM adjustment clears auto-detection
- **Range Validation**: Ensures detected BPM stays within 20-200 BPM range

### 6. Seamless Strudel REPL Integration
- **Advanced Code Injection**:
  - Multiple content extraction methods for robust compatibility
  - Shadow DOM support for modern web components
  - CodeMirror 5/6 integration with fallback mechanisms
  - Custom event dispatching for enhanced compatibility
- **User Experience Features**:
  - **Copy Strudel Syntax**: One-click copying with multiple content extraction methods
  - **Open in Strudel.cc**: Direct link generation with base64-encoded content
  - **Real-time Code Updates**: Automatic injection on note capture, BPM changes, and sound selection
  - **Visual Feedback**: Toast notifications for copy operations and errors

### 7. Comprehensive MIDI Integration
- **Universal Device Support**:
  - Auto-detection of all available MIDI input/output devices
  - Hot-plug support with real-time device list updates
  - Device-specific filtering and routing capabilities
  - Graceful fallback when preferred devices are unavailable
- **Advanced MIDI Processing**:
  - Note velocity capture and processing (0-127 range)
  - MIDI CC support for XY Pad control (CC1/CC2)
  - Multi-device simultaneous input handling
  - Comprehensive debugging tools and device logging
- **Device Management**:
  - Dynamic device list updates with connection monitoring
  - User-selectable device filtering in Strudel Coder
  - Device status monitoring with visual feedback

### 8. Advanced Global Controls
- **Musical Context Management**:
  - Global tonic selection with real-time updates across all components
  - Comprehensive scale selection affecting keyboard highlighting and XY Pad
  - Synchronized musical context across Visual Keyboard, XY Pad, and audio playback
- **Real-time Component Communication**:
  - Event-driven architecture with immediate updates
  - Cross-component synchronization for consistent musical experience

### 9. Comprehensive Status Display
- **Real-time System Monitoring**:
  - MIDI device connection status with detailed information
  - Audio engine initialization status and error reporting
  - Component-specific status tracking and error handling
- **User-Friendly Feedback**:
  - Color-coded status indicators (green/red)
  - Detailed error messages with troubleshooting guidance
  - Device management controls (refresh, logging)

## 🛠 Technical Implementation

### Modern Web Technologies
- **Vanilla JavaScript**: Zero external dependencies for core functionality
- **Web Audio API**: High-quality audio synthesis with professional-grade processing
- **Web MIDI API**: Direct browser access to MIDI devices with full event handling
- **CSS3**: Modern responsive design with component-based styling
- **HTML5**: Semantic markup with accessibility features and ARIA compliance

### Performance Optimizations
- **Efficient Memory Management**: Automatic cleanup of audio resources and MIDI connections
- **Smart Rate Limiting**: Intelligent throttling for high-frequency events (beat detection, note capture)
- **Resource Management**: Proper disposal of audio contexts and MIDI connections
- **Optimized Rendering**: Minimal DOM manipulation with efficient update patterns

### Modular Architecture
```
js/
├── audioEngine.js      # Web Audio API synthesis engine
├── midiHandler.js      # MIDI device management and message processing  
├── strudelCoder.js     # MIDI-to-Strudel conversion with beat detection
├── visualKeyboard.js   # Interactive piano keyboard interface
├── xyPad.js           # 2D musical controller with scale awareness
└── main.js            # Application coordinator and state management
```

### Component Communication
- **Event-driven Architecture**: Callback-based communication between modules
- **Dependency Injection**: Clean module initialization with configurable dependencies
- **State Management**: Centralized musical context (tonic, scale) with synchronized updates
- **Error Handling**: Graceful degradation with comprehensive error logging

## 🎵 MIDI Note Detection Logic

### Note Capture Process
1. **Device Filtering**: `midiHandler.js` captures raw MIDI input and filters by selected device
2. **Note Processing**: `strudelCoder.js` processes notes with timing information
3. **Chord Detection**: Notes within 20ms window are automatically grouped as chords
4. **Beat Analysis**: Note timestamps are analyzed for tempo patterns
5. **Code Generation**: Notes are converted to Strudel syntax with quantization

### Beat Detection Algorithm
```javascript
// Simplified algorithm flow:
1. Store note timestamps in rolling 8-second window
2. Calculate intervals between consecutive notes  
3. Filter intervals (100ms - 4000ms range)
4. Group similar intervals with 50ms tolerance
5. Find most common interval pattern
6. Convert to BPM: 60000ms / interval
7. Update BPM if difference > 5 BPM and pattern confidence is high
```

### Advanced Features
- **Velocity Sensitivity**: Full 0-127 MIDI velocity range support
- **Multi-device Input**: Simultaneous input from multiple MIDI controllers
- **Real-time Quantization**: Configurable timing resolution (10ms - 1000ms)
- **Pattern Recognition**: Intelligent detection of musical patterns and rhythms

## 🚀 Usage Guide

### Getting Started
1. **Open the application** in a modern web browser (Chrome recommended for best MIDI support)
2. **Connect MIDI devices** (optional) - devices will be auto-detected
3. **Select tonic and scale** using the global controls
4. **Choose interaction method**:
   - Use the Visual Keyboard for traditional piano input
   - Use the XY Pad for expressive 2D control
   - Connect external MIDI controller for hardware input

### Strudel Workflow
1. **Play notes** using any input method
2. **Watch real-time code generation** in the Strudel REPL
3. **Automatic BPM detection** analyzes your playing tempo
4. **Adjust parameters**:
   - BPM slider (overrides auto-detection)
   - Quantization resolution
   - Sound selection with autocomplete
   - Notation type (musical/integer)
5. **Copy or open** generated code directly in Strudel.cc

### Advanced Usage
- **Beat Detection**: Play steady rhythms for automatic tempo detection
- **Chord Input**: Play multiple notes simultaneously (within 20ms) for chord notation
- **Device Selection**: Choose specific MIDI devices in Strudel Coder for focused input
- **Sound Exploration**: Use autocomplete search to discover 100+ available sounds

## 🎯 Recent Updates

### New Beat Detection System
- **Intelligent Tempo Analysis**: Automatic BPM detection from user input patterns
- **Adaptive Learning**: System learns from consistent playing patterns
- **Visual Feedback**: BPM display indicates when tempo is auto-detected
- **Manual Override**: User can manually adjust BPM to override detection

### Enhanced MIDI Processing
- **Improved Device Management**: Better hot-plug support and connection monitoring
- **Advanced Note Capture**: Optimized chord detection and timing analysis
- **Performance Optimization**: Reduced latency and improved responsiveness

### Strudel Integration Improvements
- **Robust Code Injection**: Multiple fallback methods for different Strudel editor implementations
- **Enhanced Content Extraction**: Improved copy functionality with better error handling
- **Direct Strudel.cc Links**: One-click opening of generated code in the official Strudel platform

## 🔮 Future Enhancements

### Planned Features
- **Advanced Pattern Recognition**: Machine learning-based rhythm and melody analysis
- **Loop Recording**: Multi-layer loop recording with overdub capabilities
- **MIDI File Export**: Standard MIDI file generation from captured patterns
- **Preset Management**: Save and recall complete application states
- **Advanced Visualization**: Real-time waveform and spectrum analysis

### UI/UX Improvements
- **Flexible Grid Looper**: Rectangular loop interface with 3/8 and 4/4 time signature support
- **Circular Pattern Sequencer**: Variable angle/time signature with multi-ring sound placement
- **Draggable Clips**: Generated pattern clips that can be dragged to Strudel or combined
- **Advanced Routing**: Complex signal routing between components

### Technical Roadmap
- **WebAssembly Integration**: Enhanced audio processing performance
- **Service Worker Support**: Offline functionality and improved caching
- **WebGL Visualization**: Advanced 3D visual representations
- **Cloud Synchronization**: Save and share patterns across devices

## 🔧 Development

### Code Organization
- **Modular Design**: Clean separation of concerns with minimal coupling
- **Comprehensive Documentation**: Inline comments and JSDoc annotations
- **Error Handling**: Robust error management with user-friendly feedback
- **Performance Monitoring**: Built-in logging and debugging capabilities

### Browser Compatibility
- **Modern Browser Support**: Chrome, Firefox, Safari, Edge (latest versions)
- **Progressive Enhancement**: Graceful fallback for unsupported features
- **Mobile Support**: Touch-optimized interfaces for tablets and phones
- **Cross-platform Testing**: Windows, macOS, Linux compatibility

## 📄 License & Contributing

This project represents a bridge between traditional music performance and modern live coding, enabling new forms of creative expression through the seamless integration of MIDI input and Strudel's powerful pattern language.

**GitHub Repository**: https://github.com/knectardev/midi_strudel_dash

---

*The MIDI Strudel Interface is designed for musicians, live coders, and creative technologists who want to explore the intersection of hardware control and algorithmic composition.*

