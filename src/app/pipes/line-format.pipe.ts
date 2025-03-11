import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'lineFormat'
})
export class LineFormatPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';

    // Format room titles (between == markers)
    if (value.match(/^==\s.*\s==$/)) {
      value = `<span class="room-title">${value}</span>`;
    }
    // Format command inputs (starting with >)
    else if (value.startsWith('> ')) {
      value = `<span class="command-input">${value}</span>`;
    }
    // Format inventory
    else if (value.startsWith('Inventory:')) {
      value = `<span class="inventory">${value}</span>`;
    }
    // Format help text
    else if (value.includes('Available commands:')) {
      value = `<span class="help-text">${value}</span>`;
    }
    // Format success messages
    else if (
      value.includes('successfully') || 
      value.includes('Congratulations') ||
      value.includes('progress') ||
      value.includes('You take')
    ) {
      value = `<span class="success">${value}</span>`;
    }
    // Format error messages
    else if (
      value.includes('can\'t') || 
      value.includes('don\'t') || 
      value.includes('invalid') ||
      value.includes('Invalid')
    ) {
      value = `<span class="error">${value}</span>`;
    }

    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}
