import { Directive, Input, Output, EventEmitter, HostListener } from '@angular/core';

@Directive({
  selector: '[appDropTarget]'
})
export class DropTargetDirective {
    constructor() {
    }

    @Output('appDrop') drop = new EventEmitter();

    @HostListener('dragenter', ['$event'])
    @HostListener('dragover', ['$event'])
    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    @HostListener('drop', ['$event'])
    onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.drop.next(event.dataTransfer);
    }
}
