import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './components/app.component';
import { TerminalComponent } from './components/terminal/terminal.component';
import { LineFormatPipe } from './helpers/line-format.pipe';

@NgModule({
  declarations: [
    AppComponent,
    TerminalComponent,
    LineFormatPipe
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
