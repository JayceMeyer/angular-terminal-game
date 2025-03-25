import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ColorScheme } from '../components/terminal/terminal.component';

export interface GameState {
  currentRoom: string;
  inventory: string[];
  gameOver: boolean;
  hasWon: boolean;
  visited: { [key: string]: boolean };
}

export interface Room {
  name: string;
  description: string;
  exits: { [key: string]: string };
  items: string[];
  interactions?: { [key: string]: (state: GameState) => string };
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private rooms: { [key: string]: Room } = {
    'start': {
      name: 'Command Center',
      description: 'You are in a dimly lit command center. Screens flicker with cryptic data. There\'s a door to the east and a corridor to the north.',
      exits: { 'north': 'corridor', 'east': 'server' },
      items: ['manual'],
      interactions: {
        'manual': (state: GameState) => {
          if (state.inventory.includes('manual')) {
            return 'You already have the manual.';
          }
          state.inventory.push('manual');
          this.rooms['start'].items = this.rooms['start'].items.filter(item => item !== 'manual');
          return 'You pick up the system manual. It contains instructions on how to reboot the mainframe.';
        }
      }
    },
    'server': {
      name: 'Server Room',
      description: 'A cold room filled with server racks. The hum of cooling fans fills the air. There\'s a door to the west and a terminal in the corner.',
      exits: { 'west': 'start' },
      items: ['keycard'],
      interactions: {
        'keycard': (state: GameState) => {
          if (state.inventory.includes('keycard')) {
            return 'You already have the keycard.';
          }
          state.inventory.push('keycard');
          this.rooms['server'].items = this.rooms['server'].items.filter(item => item !== 'keycard');
          return 'You pick up the security keycard. It might grant access to restricted areas.';
        },
        'terminal': (state: GameState) => {
          if (state.inventory.includes('manual')) {
            return 'Following the instructions in the manual, you successfully reboot a section of the system. Progress!';
          }
          return 'The terminal requires specific knowledge to operate. Maybe there\'s a manual somewhere?';
        }
      }
    },
    'corridor': {
      name: 'Main Corridor',
      description: 'A long corridor with flickering lights. There\'s a door to the south leading back to the command center, and a locked door to the north.',
      exits: { 'south': 'start' },
      items: [],
      interactions: {
        'door': (state: GameState) => {
          if (state.inventory.includes('keycard')) {
            this.rooms['corridor'].exits['north'] = 'mainframe';
            return 'You use the keycard to unlock the door to the north. It leads to the mainframe room.';
          }
          return 'The door to the north is locked. It requires a security keycard.';
        }
      }
    },
    'mainframe': {
      name: 'Mainframe Room',
      description: 'The heart of the system. A massive mainframe computer occupies most of the room. There\'s a control panel with a big red button.',
      exits: { 'south': 'corridor' },
      items: [],
      interactions: {
        'button': (state: GameState) => {
          if (state.inventory.includes('manual')) {
            state.gameOver = true;
            state.hasWon = true;
            return 'Following the instructions in the manual, you initiate the correct sequence and press the button. The system reboots successfully. You\'ve completed your mission!';
          }
          return 'You\'re not sure what sequence to enter before pressing the button. It could be dangerous to press it randomly.';
        }
      }
    }
  };

  private stateSubject = new BehaviorSubject<GameState>({
    currentRoom: 'start',
    inventory: [],
    gameOver: false,
    hasWon: false,
    visited: { 'start': true }
  });

  private outputSubject = new BehaviorSubject<string[]>([
    'Welcome to Terminal Adventure!',
    'Type "help" for a list of commands.',
    '',
    this.getLocationDescription()
  ]);

  private colorSchemeSubject = new BehaviorSubject<ColorScheme>('green');
  private typingSpeedSubject = new BehaviorSubject<number>(20);
  private animationsEnabledSubject = new BehaviorSubject<boolean>(true);

  constructor() { 
    this.loadSavedSettings();
  }

  getState(): Observable<GameState> {
    return this.stateSubject.asObservable();
  }

  getOutput(): Observable<string[]> {
    return this.outputSubject.asObservable();
  }

  getColorScheme(): Observable<ColorScheme> {
    return this.colorSchemeSubject.asObservable();
  }

  getTypingSpeed(): Observable<number> {
    return this.typingSpeedSubject.asObservable();
  }

  getAnimationsEnabled(): Observable<boolean> {
    return this.animationsEnabledSubject.asObservable();
  }

  changeColorScheme(scheme: ColorScheme): void {
    this.colorSchemeSubject.next(scheme);
    // Save to localStorage for persistence
    localStorage.setItem('terminalColorScheme', scheme);
  }

  setTypingSpeed(speed: number): void {
    this.typingSpeedSubject.next(speed);
    // Save to localStorage for persistence
    localStorage.setItem('terminalTypingSpeed', speed.toString());
  }

  setAnimationsEnabled(enabled: boolean): void {
    this.animationsEnabledSubject.next(enabled);
    // Save to localStorage for persistence
    localStorage.setItem('terminalAnimationsEnabled', enabled.toString());
  }

  private getCurrentState(): GameState {
    return this.stateSubject.getValue();
  }

  private updateState(newState: Partial<GameState>): void {
    this.stateSubject.next({ ...this.getCurrentState(), ...newState });
  }

  private addOutput(message: string): void {
    const currentOutput = this.outputSubject.getValue();
    this.outputSubject.next([...currentOutput, message]);
  }

  private getLocationDescription(): string {
    const state = this.getCurrentState();
    const room = this.rooms[state.currentRoom];
    
    let description = `== ${room.name} ==\n${room.description}`;
    
    if (room.items.length > 0) {
      description += `\nYou see: ${room.items.join(', ')}`;
    }
    
    const exits = Object.keys(room.exits);
    if (exits.length > 0) {
      description += `\nExits: ${exits.join(', ')}`;
    }
    
    return description;
  }

  processCommand(input: string): void {
    const state = this.getCurrentState();
    
    if (state.gameOver) {
      if (input.toLowerCase() === 'restart') {
        this.restart();
        return;
      }
      this.addOutput('The game is over. Type "restart" to play again.');
      return;
    }

    const command = input.toLowerCase().trim();
    const parts = command.split(' ');
    const action = parts[0];
    const target = parts.slice(1).join(' ');

    this.addOutput(`> ${input}`);

    switch (action) {
      case 'help':
        this.showHelp();
        break;
      case 'look':
        this.addOutput(this.getLocationDescription());
        break;
      case 'go':
      case 'move':
      case 'walk':
        this.move(target);
        break;
      case 'north':
      case 'south':
      case 'east':
      case 'west':
        this.move(action);
        break;
      case 'take':
      case 'get':
      case 'pickup':
        this.takeItem(target);
        break;
      case 'inventory':
      case 'inv':
      case 'i':
        this.showInventory();
        break;
      case 'use':
      case 'interact':
        this.interact(target);
        break;
      case 'restart':
        this.restart();
        break;
      default:
        this.addOutput('I don\'t understand that command. Type "help" for a list of commands.');
    }

    if (state.gameOver) {
      if (state.hasWon) {
        this.addOutput('Congratulations! You have completed the mission. Type "restart" to play again.');
      } else {
        this.addOutput('Game over. Type "restart" to try again.');
      }
    }
  }

  private showHelp(): void {
    this.addOutput('Available commands:');
    this.addOutput('- look: Look around the current location');
    this.addOutput('- go [direction]: Move in a direction (north, south, east, west)');
    this.addOutput('- take [item]: Pick up an item');
    this.addOutput('- inventory: Check your inventory');
    this.addOutput('- use [item/object]: Interact with an item or object');
    this.addOutput('- restart: Start a new game');
  }

  private move(direction: string): void {
    const state = this.getCurrentState();
    const room = this.rooms[state.currentRoom];
    
    if (room.exits[direction]) {
      const newRoom = room.exits[direction];
      const visited = state.visited[newRoom] || false;
      
      this.updateState({
        currentRoom: newRoom,
        visited: { ...state.visited, [newRoom]: true }
      });
      
      this.addOutput(`You move ${direction}.`);
      
      if (!visited) {
        this.addOutput(this.getLocationDescription());
      } else {
        this.addOutput(`You are back in the ${this.rooms[newRoom].name}.`);
      }
    } else {
      this.addOutput(`You can't go ${direction} from here.`);
    }
  }

  private takeItem(itemName: string): void {
    if (!itemName) {
      this.addOutput('Take what?');
      return;
    }
    
    const state = this.getCurrentState();
    const room = this.rooms[state.currentRoom];
    
    if (room.items.includes(itemName)) {
      if (room.interactions && room.interactions[itemName]) {
        const result = room.interactions[itemName](state);
        this.updateState(state);
        this.addOutput(result);
      } else {
        const updatedInventory = [...state.inventory, itemName];
        const updatedItems = room.items.filter(item => item !== itemName);
        
        room.items = updatedItems;
        
        this.updateState({
          inventory: updatedInventory
        });
        
        this.addOutput(`You take the ${itemName}.`);
      }
    } else {
      this.addOutput(`There is no ${itemName} here.`);
    }
  }

  private showInventory(): void {
    const state = this.getCurrentState();
    
    if (state.inventory.length === 0) {
      this.addOutput('Your inventory is empty.');
    } else {
      this.addOutput('Inventory:');
      state.inventory.forEach(item => {
        this.addOutput(`- ${item}`);
      });
    }
  }

  private interact(target: string): void {
    if (!target) {
      this.addOutput('Interact with what?');
      return;
    }
    
    const state = this.getCurrentState();
    const room = this.rooms[state.currentRoom];
    
    if (room.interactions && room.interactions[target]) {
      const result = room.interactions[target](state);
      this.updateState(state);
      this.addOutput(result);
    } else if (state.inventory.includes(target)) {
      this.addOutput(`You examine the ${target} but don't see how to use it here.`);
    } else {
      this.addOutput(`You don't see a ${target} here.`);
    }
  }

  restart(): void {
    this.updateState({
      currentRoom: 'start',
      inventory: [],
      gameOver: false,
      hasWon: false,
      visited: { 'start': true }
    });
    
    // Reset any modified rooms
    this.rooms['corridor'].exits = { 'south': 'start' };
    this.rooms['start'].items = ['manual'];
    this.rooms['server'].items = ['keycard'];
    
    this.outputSubject.next([
      'Game restarted!',
      'Welcome to Terminal Adventure!',
      'Type "help" for a list of commands.',
      '',
      this.getLocationDescription()
    ]);
  }

  // Load saved settings from localStorage on app initialization
  loadSavedSettings(): void {
    const savedColorScheme = localStorage.getItem('terminalColorScheme');
    if (savedColorScheme) {
      this.colorSchemeSubject.next(savedColorScheme as ColorScheme);
    }

    const savedTypingSpeed = localStorage.getItem('terminalTypingSpeed');
    if (savedTypingSpeed) {
      this.typingSpeedSubject.next(parseInt(savedTypingSpeed, 10));
    }

    const savedAnimationsEnabled = localStorage.getItem('terminalAnimationsEnabled');
    if (savedAnimationsEnabled) {
      this.animationsEnabledSubject.next(savedAnimationsEnabled === 'true');
    }
  }
}
