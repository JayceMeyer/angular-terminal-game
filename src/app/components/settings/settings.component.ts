import { Component, OnInit, OnDestroy } from '@angular/core';
import { GameService } from '../../services/game.service';
import { ColorScheme } from '../terminal/terminal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  selectedColorScheme: ColorScheme = 'green';
  typingSpeed: number = 20;
  animationsEnabled: boolean = true;
  
  private colorSchemeSubscription: Subscription;
  private typingSpeedSubscription: Subscription;
  private animationsEnabledSubscription: Subscription;

  constructor(private gameService: GameService) { }

  ngOnInit(): void {
    // Subscribe to color scheme changes
    this.colorSchemeSubscription = this.gameService.getColorScheme().subscribe(scheme => {
      this.selectedColorScheme = scheme;
    });
    
    // Subscribe to typing speed changes
    this.typingSpeedSubscription = this.gameService.getTypingSpeed().subscribe(speed => {
      this.typingSpeed = speed;
    });
    
    // Subscribe to animations enabled/disabled
    this.animationsEnabledSubscription = this.gameService.getAnimationsEnabled().subscribe(enabled => {
      this.animationsEnabled = enabled;
    });
  }
  
  ngOnDestroy(): void {
    if (this.colorSchemeSubscription) {
      this.colorSchemeSubscription.unsubscribe();
    }
    
    if (this.typingSpeedSubscription) {
      this.typingSpeedSubscription.unsubscribe();
    }
    
    if (this.animationsEnabledSubscription) {
      this.animationsEnabledSubscription.unsubscribe();
    }
  }
  
  updateColorScheme(): void {
    this.gameService.changeColorScheme(this.selectedColorScheme);
  }
  
  updateTypingSpeed(): void {
    this.gameService.setTypingSpeed(this.typingSpeed);
  }
  
  toggleAnimations(): void {
    this.gameService.setAnimationsEnabled(this.animationsEnabled);
  }
  
  resetGame(): void {
    if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
      this.gameService.restart();
    }
  }
}
