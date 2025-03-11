import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, Input, Output, EventEmitter } from '@angular/core';
import { GameService } from '../../services/game.service';

export type ColorScheme = 'green' | 'white' | 'blue' | 'amber' | 'red';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.scss']
})
export class TerminalComponent implements OnInit, AfterViewChecked {
  @ViewChild('terminaloutput') terminalOutput: ElementRef;
  @ViewChild('commandinput') commandInput: ElementRef;

  @Input() public output: string[] = [];
  @Input() public colorScheme: ColorScheme = 'green';

  @Output() commandEntered: EventEmitter<any> = new EventEmitter();

  command: string = '';
  commandHistory: string[] = [];
  historyIndex: number = -1;

  constructor(public gameService: GameService) { }

  ngOnInit(): void {
    if (!this.output?.length) {
      this.gameService.getOutput().subscribe(o => {
        this.output = o;
      });
    }
    
    // Subscribe to color scheme changes
    this.gameService.getColorScheme().subscribe(scheme => {
      this.colorScheme = scheme;
    });
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
        'take', 'inventory', 'use', 'examine', 'restart', 'clear',
        'color', 'theme'
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
    }
  }
}
