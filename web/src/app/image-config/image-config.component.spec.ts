import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageConfigComponent } from './image-config.component';

describe('ImageConfigComponent', () => {
  let component: ImageConfigComponent;
  let fixture: ComponentFixture<ImageConfigComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageConfigComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
