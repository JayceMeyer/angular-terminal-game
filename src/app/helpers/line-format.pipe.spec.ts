import { LineFormatPipe } from "./line-format.pipe";
import { DomSanitizer } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';

describe('LineFormatPipe', () => {
  let sanitizer: DomSanitizer;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DomSanitizer]
    });
    sanitizer = TestBed.inject(DomSanitizer);
  });

  it('create an instance', () => {
    const pipe = new LineFormatPipe(sanitizer);
    expect(pipe).toBeTruthy();
  });
});
