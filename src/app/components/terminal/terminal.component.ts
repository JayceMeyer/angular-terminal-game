import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Subscription } from 'rxjs';

export type ColorScheme = 'green' | 'white' | 'blue' | 'amber' | 'red';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss']
})
export class TerminalComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('terminalOutput') terminalOutput: ElementRef;
  @ViewChild('commandInput') commandInput: ElementRef;

  @Input() public output: string[] = [];
  @Input() public colorScheme: ColorScheme = 'green';

  @Output() commandEntered: EventEmitter<any> = new EventEmitter();

  command: string = '';
  commandHistory: string[] = [];
  historyIndex: number = -1;
  
  // Typing animation properties
  displayedOutput: string[] = [];
  isTyping: boolean = false;
  typingSpeed: number = 20; // milliseconds per character
  animationsEnabled: boolean = true;
  outputSubscription: Subscription;
  colorSchemeSubscription: Subscription;
  typingSpeedSubscription: Subscription;
  animationsEnabledSubscription: Subscription;
  
  // Queue for lines waiting to be typed
  private typingQueue: string[] = [];
  private currentTypingTimeout: any = null;
  private initialLoadComplete: boolean = false;

  constructor(public gameService: GameService) { }

  ngOnInit(): void {
    if (!this.output?.length) {
      this.outputSubscription = this.gameService.getOutput().subscribe(output => {
        // When output changes, add new lines to the typing queue
        if (!this.initialLoadComplete) {
          // For initial load, add all lines to the typing queue
          this.typingQueue.push(...output);
          this.initialLoadComplete = true;
        } else {
          // For subsequent updates, only add new lines
          const currentLength = this.output.length;
          const newLines = output.slice(currentLength);
          if (newLines.length > 0) {
            this.typingQueue.push(...newLines);
          }
        }
        
        this.output = output; // Update the full output
        
        // Start typing animation if not already typing
        if (!this.isTyping && this.typingQueue.length > 0) {
          this.startTypingAnimation();
        }
      });
    } else {
      // If output is provided as input, initialize typing queue with it
      this.typingQueue.push(...this.output);
      this.startTypingAnimation();
    }
    
    // Subscribe to color scheme changes
    this.colorSchemeSubscription = this.gameService.getColorScheme().subscribe(scheme => {
      this.colorScheme = scheme;
    });
    
    // Subscribe to typing speed changes
    this.typingSpeedSubscription = this.gameService.getTypingSpeed().subscribe(speed => {
      this.typingSpeed = speed;
    });
    
    // Subscribe to animations enabled/disabled
    this.animationsEnabledSubscription = this.gameService.getAnimationsEnabled().subscribe(enabled => {
      this.animationsEnabled = enabled;
      
      // If animations are disabled and we're currently typing, skip the animation
      if (!enabled && this.isTyping) {
        this.skipTypingAnimation();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.outputSubscription) {
      this.outputSubscription.unsubscribe();
    }
    
    if (this.colorSchemeSubscription) {
      this.colorSchemeSubscription.unsubscribe();
    }
    
    if (this.typingSpeedSubscription) {
      this.typingSpeedSubscription.unsubscribe();
    }
    
    if (this.animationsEnabledSubscription) {
      this.animationsEnabledSubscription.unsubscribe();
    }
    
    if (this.currentTypingTimeout) {
      clearTimeout(this.currentTypingTimeout);
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.terminalOutput.nativeElement.scrollTop = this.terminalOutput.nativeElement.scrollHeight;
    } catch (err) { }
  }

  onKeyDown(event: KeyboardEvent): void {
    // Skip typing animation when user presses a key
    if (this.isTyping) {
      this.skipTypingAnimation();
      return;
    }
    
    // Handle up arrow for command history
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
        this.command = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
      }
    }
    
    // Handle down arrow for command history
    else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.command = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.command = '';
      }
    }
    
    // Handle tab for auto-completion (basic implementation)
    else if (event.key === 'Tab') {
      event.preventDefault();
      
      const commonCommands = [
        'help', 'look', 'go', 'north', 'south', 'east', 'west',
        'take', 'inventory', 'use', 'interact', 'restart'
      ];
      
      const matchingCommands = commonCommands.filter(cmd => 
        cmd.startsWith(this.command.toLowerCase())
      );
      
      if (matchingCommands.length === 1) {
        this.command = matchingCommands[0];
      }
    }
  }

  executeCommand(): void {
    this.commandEntered.emit(this.command);
    if (this.command.trim()) {
      // Add to command history
      this.commandHistory.push(this.command);
      if (this.commandHistory.length > 20) {
        this.commandHistory.shift();
      }
      this.historyIndex = -1;
      
      // Process the command
      this.gameService.processCommand(this.command);
      
      // Clear the input
      this.command = '';
      
      // Focus the input field again
      setTimeout(() => {
        if (this.commandInput && this.commandInput.nativeElement) {
          this.commandInput.nativeElement.focus();
        }
      }, 0);
    }
  }
  
  // Typing animation methods
  private startTypingAnimation(): void {
    if (this.typingQueue.length === 0 || this.isTyping) {
      return;
    }
    
    this.isTyping = true;
    const nextLine = this.typingQueue.shift();
    
    // If animations are disabled or this is a command input (starts with '>'), display it immediately
    if (!this.animationsEnabled || nextLine.startsWith('> ')) {
      this.displayedOutput.push(nextLine);
      this.isTyping = false;
      this.startTypingAnimation(); // Process next line
      return;
    }
    
    // For other lines, animate typing
    let currentText = '';
    let charIndex = 0;
    
    const typeNextChar = () => {
      if (charIndex < nextLine.length) {
        currentText += nextLine.charAt(charIndex);
        // Update the displayed output with the current text
        // Instead of replacing or modifying existing lines, always add the current text as a new line
        // and remove the previous incomplete version of this line
        if (charIndex > 0) {
          // Remove the previous incomplete version of this line
          this.displayedOutput.pop();
        }
        // Add the current version of the line
        this.displayedOutput.push(currentText);
        
        charIndex++;
        this.currentTypingTimeout = setTimeout(typeNextChar, this.typingSpeed);
      } else {
        // Line is complete, move to the next line
        this.isTyping = false;
        this.startTypingAnimation();
      }
    };
    
    typeNextChar();
  }
  
  skipTypingAnimation(): void {
    // Clear any ongoing typing animation
    if (this.currentTypingTimeout) {
      clearTimeout(this.currentTypingTimeout);
      this.currentTypingTimeout = null;
    }
    
    // Add the current line being typed to the displayed output
    if (this.isTyping && this.typingQueue.length >= 0) {
      // Add the current line being typed
      const currentLine = this.typingQueue.shift();
      if (currentLine) {
        this.displayedOutput.push(currentLine);
      }
      
      // Add all remaining lines in the queue
      this.displayedOutput.push(...this.typingQueue);
      this.typingQueue = [];
    }
    
    this.isTyping = false;
  }
}
