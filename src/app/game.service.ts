import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

  constructor() { }

  getState(): Observable<GameState> {
    return this.stateSubject.asObservable();
  }

  getOutput(): Observable<string[]> {
    return this.outputSubject.asObservable();
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
      case 'examine':
      case 'inspect':
        this.examine(target);
        break;
      case 'restart':
        this.restartGame();
        break;
      case 'clear':
        this.clearOutput();
        break;
      default:
        this.addOutput("I don't understand that command. Type 'help' for a list of commands.");
    }
  }

  private showHelp(): void {
    this.addOutput(`
Available commands:
- look: Look around the current location
- go [direction]: Move in a direction (north, south, east, west)
- take [item]: Pick up an item
- inventory: Check your inventory
- use [item/object]: Use an item or interact with an object
- examine [item/object]: Look closely at an item or object
- restart: Start a new game
- clear: Clear the terminal output
- help: Show this help message
    `);
  }

  private move(direction: string): void {
    const state = this.getCurrentState();
    const room = this.rooms[state.currentRoom];
    
    if (room.exits[direction]) {
      const newRoom = room.exits[direction];
      const visited = { ...state.visited };
      
      if (!visited[newRoom]) {
        visited[newRoom] = true;
      }
      
      this.updateState({ currentRoom: newRoom, visited });
      this.addOutput(`You move ${direction}.`);
      this.addOutput(this.getLocationDescription());
    } else {
      this.addOutput(`You can't go ${direction} from here.`);
    }
  }

  private takeItem(itemName: string): void {
    const state = this.getCurrentState();
    const room = this.rooms[state.currentRoom];
    
    if (!itemName) {
      this.addOutput('Take what?');
      return;
    }
    
    if (room.items.includes(itemName)) {
      if (room.interactions && room.interactions[itemName]) {
        const result = room.interactions[itemName](state);
        this.updateState(state);
        this.addOutput(result);
      } else {
        const inventory = [...state.inventory, itemName];
        const updatedItems = room.items.filter(item => item !== itemName);
        room.items = updatedItems;
        
        this.updateState({ inventory });
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
      this.addOutput(`Inventory: ${state.inventory.join(', ')}`);
    }
  }

  private interact(target: string): void {
    const state = this.getCurrentState();
    const room = this.rooms[state.currentRoom];
    
    if (!target) {
      this.addOutput('Use what?');
      return;
    }
    
    if (room.interactions && room.interactions[target]) {
      const result = room.interactions[target](state);
      this.updateState(state);
      this.addOutput(result);
      
      if (state.gameOver) {
        if (state.hasWon) {
          this.addOutput('Congratulations! You have completed the mission!');
        } else {
          this.addOutput('Game Over. Type "restart" to try again.');
        }
      }
    } else {
      this.addOutput(`You can't use ${target} here.`);
    }
  }

  private examine(target: string): void {
    const state = this.getCurrentState();
    const room = this.rooms[state.currentRoom];
    
    if (!target) {
      this.addOutput('Examine what?');
      return;
    }
    
    if (room.items.includes(target)) {
      switch (target) {
        case 'manual':
          this.addOutput('A technical manual with detailed instructions for rebooting the mainframe system.');
          break;
        case 'keycard':
          this.addOutput('A security keycard with level 5 clearance. It can unlock secure areas.');
          break;
        default:
          this.addOutput(`You see nothing special about the ${target}.`);
      }
    } else if (state.inventory.includes(target)) {
      switch (target) {
        case 'manual':
          this.addOutput('A technical manual with detailed instructions for rebooting the mainframe system.');
          break;
        case 'keycard':
          this.addOutput('A security keycard with level 5 clearance. It can unlock secure areas.');
          break;
        default:
          this.addOutput(`You see nothing special about the ${target}.`);
      }
    } else {
      this.addOutput(`You don't see a ${target} here.`);
    }
  }

  private restartGame(): void {
    this.stateSubject.next({
      currentRoom: 'start',
      inventory: [],
      gameOver: false,
      hasWon: false,
      visited: { 'start': true }
    });
    
    this.clearOutput();
    this.addOutput('Welcome to Terminal Adventure!');
    this.addOutput('Type "help" for a list of commands.');
    this.addOutput('');
    this.addOutput(this.getLocationDescription());
  }

  private clearOutput(): void {
    this.outputSubject.next([]);
  }
}
