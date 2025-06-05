# MIDI Musical Interface - Requirements Specification

## Overview
A comprehensive web-based musical interface application that provides real-time audio synthesis, visual feedback, and seamless MIDI-to-Strudel code conversion. Built with modern vanilla JavaScript and Web Audio API, the application features a modular architecture with dual MIDI device support and advanced Strudel REPL integration for live coding.

Demo: https://midi-strudel-dash.vercel.app/ 

## Core Features

### 1. Advanced XY Pad Controller
- **Purpose**: Multi-scale musical control through 2D interaction with real-time Strudel code generation
- **Scale System**:
  - **17 Musical Scales**: Pentatonic, Major, Natural Minor, Harmonic Minor, Melodic Minor, Diminished, Bhairav, Bhairavi, Yaman, Kafi, Asavari, Todi, Purvi, Marwa, Khamaj, Kalyan, Chromatic
  - **Tonic Selection**: Full chromatic range from C3 to B3 (48-59 MIDI notes)
  - **Interactive Controls**: Global tonic selector and scale dropdown
  - **3+ Octave Range**: Dynamic scale generation with octave boundaries
- **Functionality**:
  - X-axis controls note selection from current scale (quantized)
  - Y-axis controls amplitude/velocity (0-127 MIDI range)
  - Real-time visual feedback with crosshairs and note information display
  - Supports both MIDI input (CC1/CC2) and mouse/touch interaction
  - Note display with MIDI note number, frequency in Hz, and scale information
  - **Strudel Integration**: Generated notes are automatically captured and converted to Strudel syntax
  - Seamless integration with live coding workflow

### 2. Enhanced Audio Engine
- **Advanced Synthesizer**:
  - Multiple waveform options: sine, square, sawtooth, triangle
  - Configurable ADSR envelope with decay and sustain controls
  - Real-time cutoff frequency filtering
  - Adjustable gain control for amplitude management
  - Web Audio API-based architecture for high-quality synthesis
- **Audio Management**:
  - Automatic note release with configurable duration
  - Resource-efficient audio context management
  - Real-time parameter updates without audio interruption
  - Comprehensive error handling and fallback mechanisms

### 3. Comprehensive MIDI Integration
- **Universal MIDI Support**:
  - Auto-detection of all available MIDI input devices
  - Device-specific filtering and routing capabilities
  - Real-time device connection monitoring with hot-plug support
  - Graceful fallback when preferred devices are unavailable
- **Advanced MIDI Processing**:
  - Note velocity capture and processing
  - MIDI CC (Control Change) support for XY Pad control
  - Multi-device simultaneous input handling
  - Comprehensive MIDI debugging and logging
- **Device Management**:
  - Dynamic device list updates
  - User-selectable device filtering
  - Device status monitoring and connection feedback

### 4. Revolutionary Strudel MIDI Coder
- **Purpose**: Real-time conversion of MIDI input to Strudel music notation with live REPL integration
- **Advanced Features**:
  - **Device Selection**: Interactive dropdown to select from all available MIDI input devices
  - **Dual Notation Support**: Musical notation (c4, d4, etc.) and integer notation (MIDI numbers)
  - **Intelligent Chord Detection**: Automatic chord recognition for simultaneous note input
  - **Advanced Sound Library**: Extensive autocomplete-enabled sound selection with 100+ options
  - **Flexible Timing**: Configurable BPM and quantization resolution
  - **Real-time Code Injection**: Automatic integration with Strudel REPL editor
- **Code Generation**:
  - **Compressed Notation**: Efficient repeat patterns (note!count, note@duration)
  - **Multi-line Chord Formatting**: Sophisticated chord layout for complex compositions
  - **Strudel-compatible Syntax**: Direct integration with Strudel live coding environment
  - **Automatic BPM Setting**: Dynamic setcpm() generation based on user input
- **User Interface**:
  - Intuitive device selection with status display
  - Real-time preview of generated code
  - Visual feedback for captured note count
  - Comprehensive control over sound selection and timing parameters

### 5. Seamless Strudel REPL Integration
- **Live Coding Environment**:
  - Embedded Strudel editor with syntax highlighting
  - Real-time code injection from MIDI input
  - Interactive code editing and execution
  - Automatic code formatting and structure maintenance
- **Integration Features**:
  - **Copy Strudel Syntax**: One-click copying of generated code
  - **Multi-method Content Extraction**: Robust code extraction from various editor states
  - **Shadow DOM Support**: Compatible with modern web component architecture
  - **Fallback Mechanisms**: Multiple content extraction methods for reliability
- **User Experience**:
  - Visual feedback for copy operations
  - Error handling with user-friendly messages
  - Seamless workflow between MIDI input and code generation

### 6. Enhanced Visual Keyboard
- **Interactive Piano Keyboard**:
  - Full chromatic range display
  - Real-time note highlighting for active notes
  - Visual feedback for MIDI input and generated notes
  - Responsive design for various screen sizes
- **Integration**:
  - Synchronized with global tonic and scale settings
  - Visual representation of XY Pad generated notes
  - MIDI input visualization

### 7. Advanced Global Controls
- **Musical Context**:
  - Global tonic selection (C3-B3 range)
  - Comprehensive scale selection with 17 options
  - Real-time context updates across all components
- **Synthesizer Parameters**:
  - **Waveform Selection**: Sine, square, sawtooth, triangle options
  - **Envelope Controls**: Configurable decay and sustain parameters
  - **Audio Processing**: Gain control and frequency cutoff filtering
  - **Real-time Updates**: Immediate parameter changes without audio interruption

### 8. Comprehensive Status Display
- **Real-time Monitoring**:
  - MIDI device connection status
  - Audio engine initialization status
  - System-wide component status tracking
- **Error Handling**:
  - User-friendly error messages
  - Graceful degradation when components fail
  - Comprehensive logging for debugging

### 9. Enhanced User Interface
- **Modern Design**:
  - Clean, intuitive layout with logical component grouping
  - Responsive design for desktop and mobile devices
  - Visual feedback for all interactive elements
- **GitHub Integration**:
  - Fork button for easy project access
  - Links to source code and documentation
- **Accessibility**:
  - Keyboard shortcuts for common operations
  - Screen reader compatible elements
  - High contrast visual design

### 10. Modular Application Architecture
- **Component System**:
  - `AudioEngine` - Advanced Web Audio API synthesis (`js/audioEngine.js`)
  - `MidiHandler` - Universal MIDI input/output management (`js/midiHandler.js`)
  - `XYPad` - Multi-scale controller with Strudel integration (`js/xyPad.js`)
  - `StrudelCoder` - Advanced MIDI-to-Strudel converter (`js/strudelCoder.js`)
  - `VisualKeyboard` - Interactive piano keyboard display (`js/visualKeyboard.js`)
  - `MainController` - Application coordinator and state management (`js/main.js`)
- **Communication**:
  - Event-driven architecture with callback-based communication
  - Clean separation of concerns between components
  - Independent module initialization with dependency injection
- **Error Handling**:
  - Graceful degradation when components fail
  - Comprehensive error logging and user feedback
  - Robust fallback mechanisms for critical functionality

## Technical Implementation

### Modern Web Technologies
- **Vanilla JavaScript**: No external dependencies for core functionality
- **Web Audio API**: High-quality audio synthesis and processing
- **Web MIDI API**: Direct browser MIDI device access
- **CSS3**: Modern styling with responsive design
- **HTML5**: Semantic markup with accessibility features

### Performance Optimizations
- **Efficient Memory Management**: Automatic cleanup of audio resources
- **Rate Limiting**: Intelligent throttling of high-frequency events
- **Resource Disposal**: Proper cleanup on component destruction
- **Optimized Rendering**: Minimal DOM manipulation for smooth interaction

### Browser Compatibility
- **Modern Browser Support**: Chrome, Firefox, Safari, Edge
- **Progressive Enhancement**: Graceful fallback for unsupported features
- **Responsive Design**: Mobile and tablet compatibility
- **Cross-platform Testing**: Windows, macOS, Linux support

## Development Workflow

### Code Organization
- Modular JavaScript architecture with clear separation of concerns
- Comprehensive error handling and logging throughout
- Consistent coding standards and documentation
- Extensive inline comments for maintainability

### Integration Testing
- Real-time MIDI device testing
- Audio engine performance validation
- Strudel REPL integration verification
- Cross-browser compatibility testing

### User Experience Focus
- Intuitive interface design with minimal learning curve
- Real-time feedback for all user interactions
- Comprehensive help and status information
- Accessibility compliance and testing

## Future Enhancements

### Planned Features
- **Advanced Chord Progressions**: Intelligent chord suggestion and progression generation
- **Pattern Recording**: Loop recording and playback functionality
- **MIDI File Export**: Save generated patterns as standard MIDI files
- **Advanced Visualization**: Waveform displays and frequency analysis
- **Preset Management**: Save and load user-defined configurations

### Technical Improvements
- **WebAssembly Integration**: Enhanced audio processing performance
- **Service Worker Support**: Offline functionality and caching
- **WebGL Visualization**: Advanced 3D visual representations
- **Machine Learning**: Intelligent pattern recognition and generation

## Conclusion

The MIDI Musical Interface represents a cutting-edge approach to digital music creation, combining traditional MIDI control with modern live coding techniques. The seamless integration with Strudel provides an unprecedented workflow for musicians and developers alike, enabling real-time composition through both traditional performance and code generation.

The modular architecture ensures extensibility and maintainability, while the comprehensive feature set addresses the needs of both casual users and professional musicians. The application serves as a bridge between traditional music performance and modern algorithmic composition, opening new possibilities for creative expression. 


# todos


1. Flexible grid for regular rectangular looper
with 3/8 time and 4/4 time options. 

2. Flexible circle looper with variable angle / time signature equivalents. 
Update the component shape (does not need to remain triangle) to support placing different sounds types in different rings. 

3. Perhaps, draggable "clips" that have been generated on the palette, to be draggable (or "sendable" to Strudel. 

