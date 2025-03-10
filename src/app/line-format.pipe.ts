import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'lineFormat'
})
export class LineFormatPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    
    // Apply formatting
    let formatted = value;
    
    // Format room titles
    if (formatted.startsWith('== ') && formatted.includes(' ==')) {
      const titleParts = formatted.split('\n');
      const title = titleParts[0];
      const rest = titleParts.slice(1).join('\n');
      
      formatted = `<span class="room-title">${title}</span>\n${rest}`;
    }
    
    // Format command inputs
    if (formatted.startsWith('> ')) {
      formatted = `<span class="command-input">${formatted}</span>`;
    }
    
    // Format inventory
    if (formatted.startsWith('Inventory: ')) {
      formatted = `<span class="inventory">${formatted}</span>`;
    }
    
    // Format help text
    if (formatted.includes('Available commands:')) {
      formatted = `<span class="help-text">${formatted}</span>`;
    }
    
    // Format success messages
    if (formatted.includes('Congratulations') || formatted.includes('successfully')) {
      formatted = `<span class="success">${formatted}</span>`;
    }
    
    // Format error messages
    if (formatted.includes('can\'t') || formatted.includes('don\'t') || formatted.includes('no ')) {
      formatted = `<span class="error">${formatted}</span>`;
    }
    
    // Replace newlines with <br> for HTML rendering
    formatted = formatted.replace(/\n/g, '<br>');
    
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}
